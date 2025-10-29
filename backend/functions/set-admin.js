const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

const userId = 'KiyNHbl2JyYmdvkLeQ62LaMKf4Q2'; // Your UID

async function setAdminClaim() {
  try {
    // Set custom claims
    await admin.auth().setCustomUserClaims(userId, { admin: true });
    console.log('✅ Successfully set admin claim for user:', userId);
    
    // Also update Firestore
    await admin.firestore().collection('users').doc(userId).set({
      isAdmin: true,
      adminSetupAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('✅ Successfully updated Firestore user document');
    console.log('\n🔄 Please log out and log back in to refresh your token!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setAdminClaim();
