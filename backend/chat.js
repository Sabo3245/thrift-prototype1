// chat.js
// Real-time chat functionality using Firestore

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
  onSnapshot,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db, auth } from './firebase-config.js';

// ========================
// CHAT CONVERSATIONS
// ========================

// Create or get existing conversation
export const createOrGetConversation = async (participantId, itemId = null) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Check if conversation already exists
    const existingConv = await findExistingConversation(user.uid, participantId);
    if (existingConv) {
      return { success: true, conversationId: existingConv.id, data: existingConv };
    }

    // Get participant info
    const participantDoc = await getDoc(doc(db, 'users', participantId));
    if (!participantDoc.exists()) {
      throw new Error('Participant not found');
    }

    const participantData = participantDoc.data();
    const userData = await getDoc(doc(db, 'users', user.uid));
    const currentUserData = userData.data();

    // Create new conversation
    const conversationData = {
      participants: [user.uid, participantId],
      participantDetails: {
        [user.uid]: {
          uid: user.uid,
          username: currentUserData?.username || user.email,
          email: user.email
        },
        [participantId]: {
          uid: participantId,
          username: participantData.username || participantData.email,
          email: participantData.email
        }
      },
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      unreadCount: {
        [user.uid]: 0,
        [participantId]: 0
      },
      itemId: itemId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'conversations'), conversationData);

    return { 
      success: true, 
      conversationId: docRef.id,
      data: { id: docRef.id, ...conversationData }
    };
  } catch (error) {
    console.error('Create conversation error:', error);
    return { success: false, error: error.message };
  }
};

// Find existing conversation between two users
const findExistingConversation = async (userId1, userId2) => {
  try {
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId1)
    );

    const querySnapshot = await getDocs(conversationsQuery);

    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      if (data.participants.includes(userId2)) {
        return { id: doc.id, ...data };
      }
    }

    return null;
  } catch (error) {
    console.error('Find existing conversation error:', error);
    return null;
  }
};

// Get user's conversations
export const getUserConversations = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const querySnapshot = await getDocs(conversationsQuery);
    const conversations = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const otherParticipantId = data.participants.find(p => p !== user.uid);
      const otherParticipant = data.participantDetails[otherParticipantId];

      conversations.push({
        id: doc.id,
        ...data,
        otherParticipant,
        lastMessageTime: data.lastMessageTime?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date()
      });
    });

    return { success: true, data: conversations };
  } catch (error) {
    console.error('Get conversations error:', error);
    return { success: false, error: error.message };
  }
};

// ========================
// CHAT MESSAGES
// ========================

// Send message
export const sendMessage = async (conversationId, messageText, messageType = 'text') => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    if (!messageText.trim()) {
      throw new Error('Message cannot be empty');
    }

    // Get conversation to find other participant
    const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }

    const conversationData = conversationDoc.data();
    const otherParticipantId = conversationData.participants.find(p => p !== user.uid);

    // Create message
    const messageData = {
      conversationId,
      senderId: user.uid,
      senderEmail: user.email,
      message: messageText.trim(),
      messageType,
      timestamp: serverTimestamp(),
      read: false
    };

    // Add message to messages collection
    await addDoc(collection(db, 'messages'), messageData);

    // Update conversation
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: messageText.trim(),
      lastMessageTime: serverTimestamp(),
      [`unreadCount.${otherParticipantId}`]: conversationData.unreadCount?.[otherParticipantId] + 1 || 1,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Send message error:', error);
    return { success: false, error: error.message };
  }
};

// Get messages for a conversation
export const getMessages = async (conversationId, limitCount = 50) => {
  try {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(messagesQuery);
    const messages = [];

    querySnapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      });
    });

    return { success: true, data: messages };
  } catch (error) {
    console.error('Get messages error:', error);
    return { success: false, error: error.message };
  }
};

// Mark conversation as read
export const markConversationAsRead = async (conversationId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Reset unread count for current user
    await updateDoc(doc(db, 'conversations', conversationId), {
      [`unreadCount.${user.uid}`]: 0,
      updatedAt: serverTimestamp()
    });

    // Mark messages as read
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      where('senderId', '!=', user.uid),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(messagesQuery);
    const batch = [];

    querySnapshot.forEach((doc) => {
      batch.push(updateDoc(doc.ref, { read: true }));
    });

    await Promise.all(batch);

    return { success: true };
  } catch (error) {
    console.error('Mark as read error:', error);
    return { success: false, error: error.message };
  }
};

// Delete message
export const deleteMessage = async (messageId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Check if user owns the message
    const messageDoc = await getDoc(doc(db, 'messages', messageId));
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const messageData = messageDoc.data();
    if (messageData.senderId !== user.uid) {
      throw new Error('Not authorized to delete this message');
    }

    await deleteDoc(doc(db, 'messages', messageId));

    return { success: true };
  } catch (error) {
    console.error('Delete message error:', error);
    return { success: false, error: error.message };
  }
};

// ========================
// REAL-TIME LISTENERS
// ========================

// Listen to conversations
export const listenToConversations = (callback) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc')
    );

    return onSnapshot(conversationsQuery, (snapshot) => {
      const conversations = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const otherParticipantId = data.participants.find(p => p !== user.uid);
        const otherParticipant = data.participantDetails[otherParticipantId];

        conversations.push({
          id: doc.id,
          ...data,
          otherParticipant,
          lastMessageTime: data.lastMessageTime?.toDate?.() || new Date(),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          unreadCount: data.unreadCount?.[user.uid] || 0
        });
      });

      callback(conversations);
    });
  } catch (error) {
    console.error('Listen to conversations error:', error);
    return null;
  }
};

// Listen to messages in a conversation
export const listenToMessages = (conversationId, callback) => {
  try {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date()
        });
      });

      callback(messages);
    });
  } catch (error) {
    console.error('Listen to messages error:', error);
    return null;
  }
};

// Get total unread count across all conversations
export const getUnreadCount = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const conversations = await getUserConversations();
    if (!conversations.success) return { success: false, error: conversations.error };

    const totalUnread = conversations.data.reduce((total, conv) => {
      return total + (conv.unreadCount || 0);
    }, 0);

    return { success: true, count: totalUnread };
  } catch (error) {
    console.error('Get unread count error:', error);
    return { success: false, error: error.message };
  }
};
