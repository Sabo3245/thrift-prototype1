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
