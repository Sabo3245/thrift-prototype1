const functions = require("firebase-functions");
const admin = require("firebase-admin");

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
  "slur-example",
];

const normalize = (text = "") => text.toLowerCase();

const containsProfanity = (text = "") => {
  const normalized = normalize(text);
  return PROFANITY_BLACKLIST.some((word) => {
    // word boundary check to avoid matching substrings inside safe words
    const re = new RegExp(
      `\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`,
      "i"
    );
    return re.test(normalized);
  });
};

// Config
const STRIKE_THRESHOLD = 3; // number of strikes before banning

/**
 * [YOUR EXISTING FUNCTION]
 * Firestore trigger that moderates newly created items.
 */
exports.moderateItem = functions.region("us-central1").firestore
  .document("items/{itemId}")
  .onCreate(async (snap, context) => {
    const item = snap.data();
    const itemId = context.params.itemId;

    if (!item) return null;

    const title = item.title || "";
    const description = item.description || "";
    const combined = `${title} \n ${description}`;

    const flagged = containsProfanity(combined);

    const updates = {
      moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
      flagged: flagged || false,
      moderatedBy: "automated-moderator-v1",
    };

    try {
      if (flagged) {
        // Disable the item so it does not show in marketplace
        updates.isActive = false;
        updates.flagReason = "profanity_or_policy_violation";

        // Apply updates to item doc
        await db.collection("items").doc(itemId).update(updates);

        // Increment user's strikes and possibly ban
        const sellerId = item.sellerId;
        if (sellerId) {
          const userRef = db.collection("users").doc(sellerId);
          await db.runTransaction(async (tx) => {
            const userDoc = await tx.get(userRef);
            if (!userDoc.exists) return;
            const userData = userDoc.data() || {};
            const strikes = (userData.strikes || 0) + 1;
            const userUpdates = { strikes };
            if (strikes >= STRIKE_THRESHOLD) {
              userUpdates.banned = true;
              userUpdates.bannedAt =
                admin.firestore.FieldValue.serverTimestamp();
            }
            tx.update(userRef, userUpdates);

            // If banned, deactivate all their items
            if (userUpdates.banned) {
              const itemsQuery = db
                .collection("items")
                .where("sellerId", "==", sellerId)
                .where("isActive", "==", true);
              const itemsSnap = await itemsQuery.get();
              itemsSnap.forEach((doc) => {
                tx.update(doc.ref, {
                  isActive: false,
                  flagged: true,
                  flagReason: "seller_banned",
                });
              });
            }
          });
        }
      } else {
        // Mark item approved/clean
        updates.approved = true;
        updates.isActive = true;
        await db.collection("items").doc(itemId).update(updates);
      }

      console.log(`Moderation finished for item ${itemId}, flagged=${flagged}`);
      return null;
    } catch (err) {
      console.error("Moderation error for item", itemId, err);
      return null;
    }
  });

/**
 * [YOUR EXISTING FUNCTION]
 * Sync users.{uid}.isAdmin to Authentication custom claims
 */
exports.syncAdminClaim = functions.region("us-central1").firestore
  .document("users/{userId}")
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
      await db
        .collection("users")
        .doc(userId)
        .update({
          adminSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      return null;
    } catch (err) {
      console.error("Error syncing admin claim for", userId, err);
      return null;
    }
  });

/**
 * [YOUR EXISTING FUNCTION]
 * Callable function to manually grant admin claims (for testing/setup)
 */
exports.grantAdminClaim = functions.region("us-central1").https.onCall(
  async (data, context) => {
    // Only allow if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const userId = context.auth.uid;

    try {
      // Update Firestore
      await db
        .collection("users")
        .doc(userId)
        .set(
          {
            isAdmin: true,
            adminSetupAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      // Set custom claims directly
      await admin.auth().setCustomUserClaims(userId, { admin: true });

      console.log(`Manually granted admin claim to ${userId}`);
      return { success: true, message: "Admin privileges granted" };
    } catch (err) {
      console.error("Error granting admin claim:", err);
      throw new functions.https.HttpsError("internal", err.message);
    }
  }
);

/**
 * [YOUR EXISTING FUNCTION]
 * This function is scheduled to run every day at 1:00 AM.
 * It queries for items that are older than 7 days and still "available"
 * and deletes them in a batch.
 */
/**
 * [UPDATED] Scheduled Job: Database Cleanup
 * Runs every day at 1:00 AM.
 * Permanently deletes items that have been 'sold' or 'removed' for more than 7 days.
 */
exports.deleteOldItems = functions.pubsub
  .schedule("0 1 * * *") // Runs at 1:00 AM daily
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    console.log("Running scheduled job: deleteOldItems");

    // 1. Calculate the cutoff time (7 days ago)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      const batch = db.batch();
      let deletedCount = 0;

      // 2. Query for 'sold' items older than 7 days
      // We check 'updatedAt' because that's when the status changed to 'sold'
      const soldQuery = db
        .collection("items")
        .where("status", "==", "sold")
        .where("updatedAt", "<=", sevenDaysAgo);

      const soldSnap = await soldQuery.get();
      soldSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      // 3. Query for 'removed' (soft-deleted) items older than 7 days
      const removedQuery = db
        .collection("items")
        .where("status", "==", "removed")
        .where("updatedAt", "<=", sevenDaysAgo);

      const removedSnap = await removedQuery.get();
      removedSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      // 4. Commit the deletion
      if (deletedCount > 0) {
        await batch.commit();
        console.log(`Successfully cleaned up ${deletedCount} old items (sold/removed).`);
      } else {
        console.log("No old items to delete.");
      }

      return null;

    } catch (error) {
      console.error("Error deleting old items:", error);
      return null;
    }
  });

// ===================================================================
// == NEW FUNCTION TO PROCESS SALES ==
// ===================================================================

/**
 * Triggered when a new document is created in the 'saleEvents' collection.
 * This function securely processes the sale, awards points, and creates
 * transaction logs for both the buyer and seller.
 */
exports.processSale = functions.firestore
  .document("saleEvents/{saleId}")
  .onCreate(async (snap, context) => {
    const saleData = snap.data();
    const {
      itemId,
      sellerId,
      buyerId,
      price,
      itemTitle,
      category,
      conversationId, // We'll get this from the app
    } = saleData;

    // 1. Get the item reference
    const itemRef = db.doc(`items/${itemId}`);
    let itemWasFullySold = false;

    // We'll bundle all database writes into one "batch"
    // This ensures all operations succeed or fail together.
    const batch = db.batch();

    try {
      // 2. Get the item's current data
      const itemSnap = await itemRef.get();
      if (!itemSnap.exists) {
        console.log(`Item ${itemId} not found.`);
        return null; // Item doesn't exist, stop.
      }
      const itemData = itemSnap.data();

      // 3. Update item status or quantity
      const currentQuantity = itemData.quantity || 1;
      if (category === "Food" && currentQuantity > 1) {
        // Food item with quantity > 1: Decrement quantity
        batch.update(itemRef, {
          quantity: admin.firestore.FieldValue.increment(-1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        itemWasFullySold = false;
      } else {
        // Normal item or last food item: Mark as sold
        batch.update(itemRef, {
          status: "sold",
          soldToId: buyerId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          quantity: 0,
        });
        itemWasFullySold = true;
      }

      // 4. Award 5 Points to BOTH users
      const sellerRef = db.doc(`users/${sellerId}`);
      const buyerRef = db.doc(`users/${buyerId}`);
      
      // Use set with merge to safely create/update and increment
      batch.set(
        sellerRef,
        { points: admin.firestore.FieldValue.increment(5) },
        { merge: true }
      );
      batch.set(
        buyerRef,
        { points: admin.firestore.FieldValue.increment(5) },
        { merge: true }
      );

      // 5. Create Transaction Logs for BOTH users
      const txRef = db.collection("transactions");
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Seller's "sale" transaction
      const sellerTx = txRef.doc();
      batch.set(sellerTx, {
        userId: sellerId,
        type: "sale",
        itemId,
        itemTitle,
        price,
        counterpartId: buyerId,
        createdAt: now,
        pointsAwarded: 5,
      });

      // Buyer's "purchase" transaction
      const buyerTx = txRef.doc();
      batch.set(buyerTx, {
        userId: buyerId,
        type: "purchase",
        itemId,
        itemTitle,
        price,
        counterpartId: sellerId,
        createdAt: now,
        pointsAwarded: 5,
      });

      // 6. Update all related conversations (IF the item was fully sold)
      if (itemWasFullySold) {
        // We can't query in a batch, so we'll do this *after*
        // But we can update the *current* conversation inside the batch
        const convRef = db.doc(`conversations/${conversationId}`);
        batch.update(convRef, {
            itemSold: true,
            soldToId: buyerId,
            soldAt: now,
        });
      }

      // 7. Commit all database changes at once
      await batch.commit();
      
      console.log(`Successfully processed sale ${snap.id} for item ${itemId}.`);

      // 8. [Optional but recommended] Update all *other* conversations for this item
      // This runs *after* the main batch to avoid transaction contention
      if (itemWasFullySold) {
        const otherConvos = await db.collection("conversations")
          .where("itemId", "==", itemId)
          .where("itemSold", "==", false)
          .get();
        
        const updatePromises = [];
        otherConvos.forEach(doc => {
          updatePromises.push(
            doc.ref.update({
              itemSold: true,
              soldAt: now,
            })
          );
        });
        await Promise.all(updatePromises);
      }

      return null;

    } catch (error) {
      console.error(`Failed to process sale ${snap.id}. Error:`, error);
      // Log the error to a separate collection for debugging
      return db.collection("saleErrors").add({
        saleEventId: snap.id,
        saleData,
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });