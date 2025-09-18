// firestore.js
// Firestore database operations for CampusKart

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  onSnapshot,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase-config.js';

// ========================
// ITEMS COLLECTION OPERATIONS
// ========================

// Add new item
export const addItem = async (itemData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const item = {
      ...itemData,
      sellerId: user.uid,
      sellerEmail: user.email,
      hearts: 0,
      heartedBy: [],
      isBoosted: false,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'items'), item);

    // Update user's recent listings
    await updateDoc(doc(db, 'users', user.uid), {
      recentListings: arrayUnion(docRef.id),
      updatedAt: serverTimestamp()
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Add item error:', error);
    return { success: false, error: error.message };
  }
};

// Get all items with optional filters
export const getItems = async (filters = {}) => {
  try {
    let itemsQuery = collection(db, 'items');
    const constraints = [where('isActive', '==', true)];

    // Apply filters
    if (filters.category && filters.category !== '') {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters.condition && filters.condition !== '') {
      constraints.push(where('condition', '==', filters.condition));
    }
    if (filters.hostel && filters.hostel !== '') {
      constraints.push(where('hostel', '==', filters.hostel));
    }
    if (filters.sellerId) {
      constraints.push(where('sellerId', '==', filters.sellerId));
    }

    // Add ordering
    constraints.push(orderBy('isBoosted', 'desc'));
    constraints.push(orderBy('createdAt', 'desc'));

    // Apply limit if provided
    if (filters.limitCount) {
      constraints.push(limit(filters.limitCount));
    }

    itemsQuery = query(itemsQuery, ...constraints);
    const querySnapshot = await getDocs(itemsQuery);

    const items = [];
    querySnapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
      });
    });

    return { success: true, data: items };
  } catch (error) {
    console.error('Get items error:', error);
    return { success: false, error: error.message };
  }
};

// Get single item by ID
export const getItem = async (itemId) => {
  try {
    const itemDoc = await getDoc(doc(db, 'items', itemId));

    if (itemDoc.exists()) {
      return { 
        success: true, 
        data: {
          id: itemDoc.id,
          ...itemDoc.data(),
          createdAt: itemDoc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: itemDoc.data().updatedAt?.toDate?.() || new Date()
        }
      };
    } else {
      return { success: false, error: 'Item not found' };
    }
  } catch (error) {
    console.error('Get item error:', error);
    return { success: false, error: error.message };
  }
};

// Update item
export const updateItem = async (itemId, updateData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Check if user owns the item
    const itemDoc = await getDoc(doc(db, 'items', itemId));
    if (!itemDoc.exists()) {
      throw new Error('Item not found');
    }

    const itemData = itemDoc.data();
    if (itemData.sellerId !== user.uid) {
      throw new Error('Not authorized to update this item');
    }

    await updateDoc(doc(db, 'items', itemId), {
      ...updateData,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Update item error:', error);
    return { success: false, error: error.message };
  }
};

// Delete item
export const deleteItem = async (itemId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Check if user owns the item
    const itemDoc = await getDoc(doc(db, 'items', itemId));
    if (!itemDoc.exists()) {
      throw new Error('Item not found');
    }

    const itemData = itemDoc.data();
    if (itemData.sellerId !== user.uid) {
      throw new Error('Not authorized to delete this item');
    }

    // Soft delete by setting isActive to false
    await updateDoc(doc(db, 'items', itemId), {
      isActive: false,
      deletedAt: serverTimestamp()
    });

    // Remove from user's recent listings
    await updateDoc(doc(db, 'users', user.uid), {
      recentListings: arrayRemove(itemId),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Delete item error:', error);
    return { success: false, error: error.message };
  }
};

// Toggle heart on item
export const toggleHeartItem = async (itemId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const itemDoc = await getDoc(doc(db, 'items', itemId));
    if (!itemDoc.exists()) {
      throw new Error('Item not found');
    }

    const itemData = itemDoc.data();
    const heartedBy = itemData.heartedBy || [];
    const isHearted = heartedBy.includes(user.uid);

    if (isHearted) {
      // Remove heart
      await updateDoc(doc(db, 'items', itemId), {
        hearts: increment(-1),
        heartedBy: arrayRemove(user.uid),
        updatedAt: serverTimestamp()
      });

      // Remove from user's hearted posts
      await updateDoc(doc(db, 'users', user.uid), {
        heartedPosts: arrayRemove(itemId),
        updatedAt: serverTimestamp()
      });
    } else {
      // Add heart
      await updateDoc(doc(db, 'items', itemId), {
        hearts: increment(1),
        heartedBy: arrayUnion(user.uid),
        updatedAt: serverTimestamp()
      });

      // Add to user's hearted posts
      await updateDoc(doc(db, 'users', user.uid), {
        heartedPosts: arrayUnion(itemId),
        updatedAt: serverTimestamp()
      });
    }

    return { success: true, isHearted: !isHearted };
  } catch (error) {
    console.error('Toggle heart error:', error);
    return { success: false, error: error.message };
  }
};

// Boost item (costs 25 points)
export const boostItem = async (itemId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Check user points
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }

    const userData = userDoc.data();
    if (userData.points < 25) {
      throw new Error('Insufficient points to boost item');
    }

    // Check if user owns the item
    const itemDoc = await getDoc(doc(db, 'items', itemId));
    if (!itemDoc.exists()) {
      throw new Error('Item not found');
    }

    const itemData = itemDoc.data();
    if (itemData.sellerId !== user.uid) {
      throw new Error('Not authorized to boost this item');
    }

    // Update item and user points
    await updateDoc(doc(db, 'items', itemId), {
      isBoosted: true,
      boostedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await updateDoc(doc(db, 'users', user.uid), {
      points: increment(-25),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Boost item error:', error);
    return { success: false, error: error.message };
  }
};

// Search items
export const searchItems = async (searchQuery, filters = {}) => {
  try {
    // Note: Firestore doesn't support full-text search natively
    // For production, consider using Algolia or ElasticSearch
    // This is a basic implementation using array-contains for keywords

    const items = await getItems(filters);

    if (!searchQuery || searchQuery.trim() === '') {
      return items;
    }

    const searchTerm = searchQuery.toLowerCase();
    const filteredItems = items.data.filter(item => 
      item.title.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm) ||
      item.category.toLowerCase().includes(searchTerm)
    );

    return { success: true, data: filteredItems };
  } catch (error) {
    console.error('Search items error:', error);
    return { success: false, error: error.message };
  }
};

// ========================
// USER OPERATIONS
// ========================

// Update user points and transactions
export const updateUserTransaction = async (transactionData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const transaction = {
      ...transactionData,
      userId: user.uid,
      createdAt: serverTimestamp()
    };

    // Add transaction document
    const transactionRef = await addDoc(collection(db, 'transactions'), transaction);

    // Update user profile
    await updateDoc(doc(db, 'users', user.uid), {
      points: increment(transactionData.points || 5),
      totalTransactions: increment(1),
      moneySaved: increment(transactionData.savings || 0),
      transactions: arrayUnion(transactionRef.id),
      updatedAt: serverTimestamp()
    });

    return { success: true, transactionId: transactionRef.id };
  } catch (error) {
    console.error('Update transaction error:', error);
    return { success: false, error: error.message };
  }
};

// Get user's transactions
export const getUserTransactions = async (userId = null) => {
  try {
    const targetUserId = userId || auth.currentUser?.uid;
    if (!targetUserId) throw new Error('No user ID provided');

    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', targetUserId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(transactionsQuery);
    const transactions = [];

    querySnapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      });
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error('Get transactions error:', error);
    return { success: false, error: error.message };
  }
};

// ========================
// REAL-TIME LISTENERS
// ========================

// Listen to items changes
export const listenToItems = (filters, callback) => {
  try {
    let itemsQuery = collection(db, 'items');
    const constraints = [where('isActive', '==', true)];

    // Apply filters
    if (filters?.category && filters.category !== '') {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters?.condition && filters.condition !== '') {
      constraints.push(where('condition', '==', filters.condition));
    }
    if (filters?.hostel && filters.hostel !== '') {
      constraints.push(where('hostel', '==', filters.hostel));
    }

    constraints.push(orderBy('isBoosted', 'desc'));
    constraints.push(orderBy('createdAt', 'desc'));

    itemsQuery = query(itemsQuery, ...constraints);

    return onSnapshot(itemsQuery, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
        });
      });
      callback(items);
    });
  } catch (error) {
    console.error('Listen to items error:', error);
    return null;
  }
};

// Listen to user profile changes
export const listenToUserProfile = (userId, callback) => {
  try {
    const userRef = doc(db, 'users', userId);

    return onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        callback({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
        });
      } else {
        callback(null);
      }
    });
  } catch (error) {
    console.error('Listen to user profile error:', error);
    return null;
  }
};
