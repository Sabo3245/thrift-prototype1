// auth.js
// Firebase Authentication functions

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase-config.js';

// Authentication state observer
export const observeAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Sign up with email and password
export const signUpWithEmail = async (email, password, userData = {}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in Firestore
    await createUserProfile(user.uid, {
      email: user.email,
      username: userData.username || email.split('@')[0],
      phone: userData.phone || 'Not verified',
      points: 0,
      totalTransactions: 0,
      moneySaved: 0,
      comfortPreference: 'Comfortable meeting anyone',
      createdAt: new Date().toISOString(),
      ...userData
    });

    // Send verification email
    if (user) {
      await sendEmailVerification(user);
    }

    return { success: true, user };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: error.message };
  }
};

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message };
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user profile exists, if not create one
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await createUserProfile(user.uid, {
        email: user.email,
        username: user.displayName || user.email.split('@')[0],
        phone: 'Not verified',
        points: 0,
        totalTransactions: 0,
        moneySaved: 0,
        comfortPreference: 'Comfortable meeting anyone',
        createdAt: new Date().toISOString()
      });
    }

    return { success: true, user };
  } catch (error) {
    console.error('Google sign in error:', error);
    return { success: false, error: error.message };
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, error: error.message };
  }
};

// Update user profile
export const updateUserProfile = async (updates) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    // Update Firebase Auth profile
    if (updates.displayName || updates.photoURL) {
      await updateProfile(user, {
        displayName: updates.displayName,
        photoURL: updates.photoURL
      });
    }

    // Update email if provided
    if (updates.email && updates.email !== user.email) {
      await updateEmail(user, updates.email);
    }

    // Update password if provided
    if (updates.password) {
      await updatePassword(user, updates.password);
    }

    // Update Firestore user document
    await updateDoc(doc(db, 'users', user.uid), {
      ...updates,
      updatedAt: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('Profile update error:', error);
    return { success: false, error: error.message };
  }
};

// Create user profile in Firestore
const createUserProfile = async (uid, userData) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      uid,
      ...userData,
      recentListings: [],
      heartedPosts: [],
      transactions: [],
      settings: {
        pushNotifications: true,
        emailUpdates: true,
        showProfileToOthers: true
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Create profile error:', error);
    throw error;
  }
};

// Get current user profile from Firestore
export const getUserProfile = async (uid = null) => {
  try {
    const userId = uid || auth.currentUser?.uid;
    if (!userId) throw new Error('No user ID provided');

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    } else {
      return { success: false, error: 'User profile not found' };
    }
  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, error: error.message };
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!auth.currentUser;
};
