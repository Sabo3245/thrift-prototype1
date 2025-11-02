const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin SDK
try {
  admin.initializeApp();
} catch (e) {
  // ignore if already initialized in local emulator environment
}

const db = admin.firestore();

// Basic profanity/blacklist - extend as needed or load from secure config
const PROFANITY_BLACKLIST = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "nigger",
  "cunt",
  "slur-example"
];

const normalize = (text = '') => text.toLowerCase();

const containsProfanity = (text = '') => {
  const normalized = normalize(text);
  return PROFANITY_BLACKLIST.some((word) => {
    // word boundary check to avoid matching substrings inside safe words
    const re = new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    return re.test(normalized);
  });
};

// Config
const STRIKE_THRESHOLD = 3; // number of strikes before banning

/**
 * Firestore trigger that moderates newly created items.
 * - If item content matches blacklist, mark item inactive and flagged
 * - Increment user's strike count and ban user if threshold reached
 * - If clean, set flagged:false and approved:true
 */
exports.moderateItem = functions.region('us-central1').firestore
  .document('items/{itemId}')
  .onCreate(async (snap, context) => {
    const item = snap.data();
    const itemId = context.params.itemId;

    if (!item) return null;

    const title = item.title || '';
    const description = item.description || '';
    const combined = `${title} \n ${description}`;

    const flagged = containsProfanity(combined);

    const updates = {
      moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
      flagged: flagged || false,
      moderatedBy: 'automated-moderator-v1'
    };

    try {
      if (flagged) {
        // Disable the item so it does not show in marketplace
        updates.isActive = false;
        updates.flagReason = 'profanity_or_policy_violation';

        // Apply updates to item doc
        await db.collection('items').doc(itemId).update(updates);

        // Increment user's strikes and possibly ban
        const sellerId = item.sellerId;
        if (sellerId) {
          const userRef = db.collection('users').doc(sellerId);
          await db.runTransaction(async (tx) => {
            const userDoc = await tx.get(userRef);
            if (!userDoc.exists) return;
            const userData = userDoc.data() || {};
            const strikes = (userData.strikes || 0) + 1;
            const userUpdates = { strikes };
            if (strikes >= STRIKE_THRESHOLD) {
              userUpdates.banned = true;
              userUpdates.bannedAt = admin.firestore.FieldValue.serverTimestamp();
            }
            tx.update(userRef, userUpdates);

            // If banned, deactivate all their items
            if (userUpdates.banned) {
              const itemsQuery = db.collection('items').where('sellerId', '==', sellerId).where('isActive', '==', true);
              const itemsSnap = await itemsQuery.get();
              itemsSnap.forEach((doc) => {
                tx.update(doc.ref, { isActive: false, flagged: true, flagReason: 'seller_banned' });
              });
            }
          });
        }
      } else {
        // Mark item approved/clean
        updates.approved = true;
        updates.isActive = true;
        await db.collection('items').doc(itemId).update(updates);
      }

      console.log(`Moderation finished for item ${itemId}, flagged=${flagged}`);
      return null;
    } catch (err) {
      console.error('Moderation error for item', itemId, err);
      return null;
    }
  });

// Sync users.{uid}.isAdmin to Authentication custom claims
exports.syncAdminClaim = functions.region('us-central1').firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const before = change.before.exists ? change.before.data() : {};
    const after = change.after.exists ? change.after.data() : {};

    const beforeIsAdmin = !!before.isAdmin;
    const afterIsAdmin = !!after.isAdmin;

    // No change in isAdmin -> noop
    if (beforeIsAdmin === afterIsAdmin) return null;

    try {
      if (afterIsAdmin) {
        // grant admin claim
        await admin.auth().setCustomUserClaims(userId, { admin: true });
        console.log(`Granted admin claim to ${userId}`);
      } else {
        // remove admin claim
        await admin.auth().setCustomUserClaims(userId, {});
        console.log(`Removed admin claim from ${userId}`);
      }

      // record sync timestamp
      await db.collection('users').doc(userId).update({ adminSyncedAt: admin.firestore.FieldValue.serverTimestamp() });
      return null;
    } catch (err) {
      console.error('Error syncing admin claim for', userId, err);
      return null;
    }
  });

// Callable function to manually grant admin claims (for testing/setup)
exports.grantAdminClaim = functions.region('us-central1').https.onCall(async (data, context) => {
  // Only allow if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;

  try {
    // Update Firestore
    await db.collection('users').doc(userId).set({
      isAdmin: true,
      adminSetupAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Set custom claims directly
    await admin.auth().setCustomUserClaims(userId, { admin: true });

    console.log(`Manually granted admin claim to ${userId}`);
    return { success: true, message: 'Admin privileges granted' };
  } catch (err) {
    console.error('Error granting admin claim:', err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});

// ===================================================================
// == NEW FUNCTION TO DELETE OLD ITEMS ==
// ===================================================================

/**
 * This function is scheduled to run every day at 1:00 AM.
 * It queries for items that are older than 7 days and still "available"
 * and deletes them in a batch.
 */
exports.deleteOldItems = functions.pubsub
  .schedule("0 1 * * *") // Uses "cron" syntax (1:00 AM every day)
  .timeZone("Asia/Kolkata") // Set to your time zone
  .onRun(async (context) => {
    console.log("Running scheduled job: deleteOldItems");

    // 1. Calculate the timestamp for 7 days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      // 2. Query for items that are unsold AND older than 7 days
      // Note: Make sure the 'createdAt' field is a Timestamp in Firestore
      const oldItemsQuery = db
        .collection("items")
        .where("status", "==", "available") // Only unsold items
        .where("createdAt", "<=", sevenDaysAgo); // Older than 7 days

      const snapshot = await oldItemsQuery.get();

      if (snapshot.empty) {
        console.log("No old items to delete.");
        return null;
      }

      // 3. Create a "batch" to delete all items at once (very efficient)
      const batch = db.batch();
      let deletedCount = 0;

      snapshot.docs.forEach((doc) => {
        console.log(`Adding item to deletion batch: ${doc.id}`);
        batch.delete(doc.ref);
        deletedCount++;
      });

      // 4. Commit the batch deletion
      await batch.commit();
      console.log(`Successfully deleted ${deletedCount} old items.`);
      return null;

    } catch (error) {
      console.error("Error deleting old items:", error);
      return null;
    }
  });