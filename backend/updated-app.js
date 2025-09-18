// app.js - Updated to integrate with Firebase
// CampusKart - College marketplace application

// Import Firebase functions
import { observeAuthState, signInWithEmail, signUpWithEmail, signOutUser, getCurrentUser } from './auth.js';
import { 
  getItems, 
  addItem, 
  updateItem, 
  deleteItem, 
  toggleHeartItem, 
  boostItem, 
  searchItems,
  listenToItems,
  listenToUserProfile,
  updateUserTransaction 
} from './firestore.js';
import { 
  getUserConversations, 
  createOrGetConversation, 
  sendMessage, 
  listenToConversations, 
  listenToMessages 
} from './chat.js';
import { uploadMultipleImages, uploadImageWithProgress } from './storage.js';

// Enhanced App State for Firebase integration
const AppState = {
  currentSection: "marketplace",
  items: [],
  filteredItems: [],
  originalItems: [],
  isLoading: false,
  searchQuery: "",
  filters: {
    category: "",
    condition: "",
    hostel: "",
  },
  user: null,
  isAuthenticated: false,
  userProfile: null,
  chatData: {
    conversations: [],
    activeChat: null,
    messages: [],
  },
  currentRemoveItemId: null,
  currentBoostItemId: null,
  unsubscribers: [], // For Firebase listeners
};

// ========================
// AUTHENTICATION FUNCTIONS
// ========================

// Initialize authentication state
const initAuth = () => {
  const unsubscribe = observeAuthState(async (user) => {
    if (user) {
      AppState.user = user;
      AppState.isAuthenticated = true;

      // Listen to user profile changes
      const profileUnsubscribe = listenToUserProfile(user.uid, (profile) => {
        if (profile) {
          AppState.userProfile = profile;
          updateProfileUI();
        }
      });

      AppState.unsubscribers.push(profileUnsubscribe);

      // Load user data and conversations
      await loadUserData();

      showSection('marketplace');
    } else {
      AppState.user = null;
      AppState.isAuthenticated = false;
      AppState.userProfile = null;

      // Clean up listeners
      AppState.unsubscribers.forEach(unsubscribe => unsubscribe?.());
      AppState.unsubscribers = [];

      showAuthUI();
    }
  });

  AppState.unsubscribers.push(unsubscribe);
};

// Show authentication UI
const showAuthUI = () => {
  const authModal = document.getElementById('authModal');
  if (!authModal) {
    createAuthModal();
  } else {
    authModal.style.display = 'flex';
  }
};

// Create authentication modal
const createAuthModal = () => {
  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-content">
      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="login">Login</button>
        <button class="auth-tab" data-tab="signup">Sign Up</button>
      </div>

      <div class="auth-form" id="loginForm">
        <h2>Login to CampusKart</h2>
        <form id="loginFormElement">
          <input type="email" id="loginEmail" placeholder="Email" required>
          <input type="password" id="loginPassword" placeholder="Password" required>
          <button type="submit">Login</button>
        </form>
        <p class="auth-link">Don't have an account? <span class="link" onclick="switchAuthTab('signup')">Sign Up</span></p>
      </div>

      <div class="auth-form hidden" id="signupForm">
        <h2>Join CampusKart</h2>
        <form id="signupFormElement">
          <input type="text" id="signupUsername" placeholder="Username" required>
          <input type="email" id="signupEmail" placeholder="Email" required>
          <input type="password" id="signupPassword" placeholder="Password (min 6 characters)" required>
          <select id="signupHostel" required>
            <option value="">Select Hostel</option>
            <option value="Boys">Boys</option>
            <option value="Girls">Girls</option>
          </select>
          <button type="submit">Sign Up</button>
        </form>
        <p class="auth-link">Already have an account? <span class="link" onclick="switchAuthTab('login')">Login</span></p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  setupAuthEventListeners();
};

// Switch between login and signup tabs
window.switchAuthTab = (tab) => {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

  document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));
  document.getElementById(`${tab}Form`).classList.remove('hidden');
};

// Setup authentication event listeners
const setupAuthEventListeners = () => {
  // Login form
  document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    showLoading('Logging in...');
    const result = await signInWithEmail(email, password);
    hideLoading();

    if (result.success) {
      document.getElementById('authModal').style.display = 'none';
      utils.showNotification('Welcome back!', 'success');
    } else {
      utils.showNotification(result.error, 'error');
    }
  });

  // Signup form
  document.getElementById('signupFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const hostel = document.getElementById('signupHostel').value;

    if (password.length < 6) {
      utils.showNotification('Password must be at least 6 characters', 'error');
      return;
    }

    showLoading('Creating account...');
    const result = await signUpWithEmail(email, password, {
      username,
      hostel
    });
    hideLoading();

    if (result.success) {
      document.getElementById('authModal').style.display = 'none';
      utils.showNotification('Account created! Welcome to CampusKart!', 'success');
    } else {
      utils.showNotification(result.error, 'error');
    }
  });
};

// ========================
// DATA LOADING FUNCTIONS
// ========================

// Load user data and setup listeners
const loadUserData = async () => {
  try {
    showLoading('Loading your data...');

    // Load items with real-time listener
    const itemsUnsubscribe = listenToItems(AppState.filters, (items) => {
      AppState.items = items;
      AppState.originalItems = items;
      filterAndDisplayItems();
    });

    AppState.unsubscribers.push(itemsUnsubscribe);

    // Load conversations with real-time listener
    const conversationsUnsubscribe = listenToConversations((conversations) => {
      AppState.chatData.conversations = conversations;
      updateChatUI();
    });

    AppState.unsubscribers.push(conversationsUnsubscribe);

    hideLoading();
  } catch (error) {
    console.error('Load user data error:', error);
    hideLoading();
    utils.showNotification('Error loading data', 'error');
  }
};

// ========================
// ITEM MANAGEMENT FUNCTIONS
// ========================

// Enhanced add item function with Firebase
const addNewItem = async (itemData, imageFiles) => {
  try {
    showLoading('Adding your item...');

    let imageUrls = [];

    // Upload images if provided
    if (imageFiles && imageFiles.length > 0) {
      const uploadResult = await uploadMultipleImages(imageFiles, 'items');
      if (uploadResult.success) {
        imageUrls = uploadResult.uploadedImages.map(img => img.url);
      }
    }

    // Prepare item data
    const item = {
      ...itemData,
      images: imageUrls,
      imagePaths: imageUrls.length > 0 ? 
        uploadResult.uploadedImages.map(img => img.path) : []
    };

    const result = await addItem(item);
    hideLoading();

    if (result.success) {
      utils.showNotification('Item added successfully!', 'success');
      closeModal('sellModal');
      // Items will be updated via listener
    } else {
      utils.showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Add item error:', error);
    hideLoading();
    utils.showNotification('Error adding item', 'error');
  }
};

// Enhanced remove item function
const removeItemFromMarketplace = async (itemId) => {
  try {
    showLoading('Removing item...');

    const result = await deleteItem(itemId);
    hideLoading();

    if (result.success) {
      utils.showNotification('Item removed successfully!', 'success');
      closeModal('removeConfirmModal');
      // Items will be updated via listener
    } else {
      utils.showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Remove item error:', error);
    hideLoading();
    utils.showNotification('Error removing item', 'error');
  }
};

// Enhanced boost item function
const boostItemInMarketplace = async (itemId) => {
  try {
    showLoading('Boosting item...');

    const result = await boostItem(itemId);
    hideLoading();

    if (result.success) {
      utils.showNotification('Item boosted successfully! (-25 points)', 'success');
      closeModal('boostConfirmModal');
      // Items and user profile will be updated via listeners
    } else {
      utils.showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Boost item error:', error);
    hideLoading();
    utils.showNotification('Error boosting item', 'error');
  }
};

// Enhanced heart item function
const toggleHeartOnItem = async (itemId) => {
  try {
    const result = await toggleHeartItem(itemId);

    if (result.success) {
      const message = result.isHearted ? 'Added to favorites! ❤️' : 'Removed from favorites';
      utils.showNotification(message, 'success');
      // Items will be updated via listener
    } else {
      utils.showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Toggle heart error:', error);
    utils.showNotification('Error updating favorites', 'error');
  }
};

// ========================
// CHAT FUNCTIONS
// ========================

// Start conversation with seller
const startConversationWithSeller = async (sellerId, itemId) => {
  try {
    if (!AppState.isAuthenticated) {
      showAuthUI();
      return;
    }

    if (sellerId === AppState.user.uid) {
      utils.showNotification('You cannot chat with yourself!', 'warning');
      return;
    }

    showLoading('Starting conversation...');

    const result = await createOrGetConversation(sellerId, itemId);
    hideLoading();

    if (result.success) {
      AppState.chatData.activeChat = result.data;
      showSection('messages');
      openChatConversation(result.conversationId);
    } else {
      utils.showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Start conversation error:', error);
    hideLoading();
    utils.showNotification('Error starting conversation', 'error');
  }
};

// Open chat conversation
const openChatConversation = async (conversationId) => {
  try {
    const conversation = AppState.chatData.conversations.find(c => c.id === conversationId);
    if (!conversation) {
      utils.showNotification('Conversation not found', 'error');
      return;
    }

    AppState.chatData.activeChat = conversation;

    // Clean up previous message listener
    if (AppState.chatData.messagesUnsubscriber) {
      AppState.chatData.messagesUnsubscriber();
    }

    // Listen to messages
    const messagesUnsubscriber = listenToMessages(conversationId, (messages) => {
      AppState.chatData.messages = messages;
      updateChatMessagesUI();
    });

    AppState.chatData.messagesUnsubscriber = messagesUnsubscriber;
    showChatInterface();

  } catch (error) {
    console.error('Open conversation error:', error);
    utils.showNotification('Error opening conversation', 'error');
  }
};

// Send chat message
const sendChatMessage = async (messageText) => {
  try {
    if (!AppState.chatData.activeChat) {
      utils.showNotification('No active conversation', 'error');
      return;
    }

    if (!messageText.trim()) return;

    const result = await sendMessage(AppState.chatData.activeChat.id, messageText);

    if (!result.success) {
      utils.showNotification(result.error, 'error');
    }

    // Clear message input
    const messageInput = document.getElementById('messageInput');
    if (messageInput) messageInput.value = '';

  } catch (error) {
    console.error('Send message error:', error);
    utils.showNotification('Error sending message', 'error');
  }
};

// ========================
// SEARCH AND FILTER FUNCTIONS
// ========================

// Enhanced search function with Firebase
const performSearch = async (query = AppState.searchQuery) => {
  try {
    if (query.trim() === '') {
      AppState.filteredItems = AppState.originalItems;
    } else {
      showLoading('Searching...');
      const result = await searchItems(query, AppState.filters);
      hideLoading();

      if (result.success) {
        AppState.filteredItems = result.data;
      } else {
        utils.showNotification(result.error, 'error');
        AppState.filteredItems = [];
      }
    }

    displayItems();
  } catch (error) {
    console.error('Search error:', error);
    hideLoading();
    utils.showNotification('Search error', 'error');
  }
};

// Apply filters
const applyFilters = () => {
  let filtered = AppState.originalItems;

  // Apply local filtering for instant feedback
  if (AppState.filters.category) {
    filtered = filtered.filter(item => item.category === AppState.filters.category);
  }
  if (AppState.filters.condition) {
    filtered = filtered.filter(item => item.condition === AppState.filters.condition);
  }
  if (AppState.filters.hostel) {
    filtered = filtered.filter(item => item.hostel === AppState.filters.hostel);
  }
  if (AppState.searchQuery.trim()) {
    const query = AppState.searchQuery.toLowerCase();
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
  }

  AppState.filteredItems = filtered;
  displayItems();
};

// ========================
// UI UPDATE FUNCTIONS
// ========================

// Update profile UI with Firebase data
const updateProfileUI = () => {
  if (!AppState.userProfile) return;

  const profile = AppState.userProfile;

  // Update profile information
  const usernameEl = document.querySelector('.profile-username');
  if (usernameEl) usernameEl.textContent = profile.username;

  const emailEl = document.querySelector('.profile-email');
  if (emailEl) emailEl.textContent = profile.email;

  const pointsEl = document.querySelector('.profile-points');
  if (pointsEl) pointsEl.textContent = `${profile.points} Points`;

  const transactionsEl = document.querySelector('.profile-transactions');
  if (transactionsEl) transactionsEl.textContent = `${profile.totalTransactions} Transactions`;

  const savedEl = document.querySelector('.profile-money-saved');
  if (savedEl) savedEl.textContent = `₹${profile.moneySaved} Money Saved`;

  // Update hearted posts
  loadHeartedPosts();
};

// Update chat UI
const updateChatUI = () => {
  const conversationsList = document.getElementById('conversationsList');
  if (!conversationsList) return;

  conversationsList.innerHTML = '';

  AppState.chatData.conversations.forEach(conversation => {
    const conversationEl = document.createElement('div');
    conversationEl.className = 'conversation-item';
    if (conversation.unreadCount > 0) {
      conversationEl.classList.add('unread');
    }

    conversationEl.innerHTML = `
      <div class="conversation-info">
        <div class="conversation-name">${conversation.otherParticipant?.username || 'Unknown User'}</div>
        <div class="conversation-message">${conversation.lastMessage || 'No messages yet'}</div>
      </div>
      <div class="conversation-meta">
        <div class="conversation-time">${formatRelativeTime(conversation.lastMessageTime)}</div>
        ${conversation.unreadCount > 0 ? `<div class="unread-badge">${conversation.unreadCount}</div>` : ''}
      </div>
    `;

    conversationEl.addEventListener('click', () => openChatConversation(conversation.id));
    conversationsList.appendChild(conversationEl);
  });
};

// Update chat messages UI
const updateChatMessagesUI = () => {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;

  messagesContainer.innerHTML = '';

  AppState.chatData.messages.forEach(message => {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.senderId === AppState.user.uid ? 'sent' : 'received'}`;

    messageEl.innerHTML = `
      <div class="message-content">${message.message}</div>
      <div class="message-time">${formatTime(message.timestamp)}</div>
    `;

    messagesContainer.appendChild(messageEl);
  });

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

// Show chat interface
const showChatInterface = () => {
  const chatInterface = document.getElementById('chatInterface');
  const conversationsList = document.getElementById('conversationsList');

  if (chatInterface) chatInterface.style.display = 'block';
  if (conversationsList) conversationsList.style.display = 'none';

  // Update header
  const chatHeader = document.getElementById('chatHeader');
  if (chatHeader && AppState.chatData.activeChat) {
    chatHeader.innerHTML = `
      <button onclick="backToChatList()">← Back</button>
      <h3>${AppState.chatData.activeChat.otherParticipant?.username || 'Chat'}</h3>
    `;
  }
};

// Back to chat list
window.backToChatList = () => {
  const chatInterface = document.getElementById('chatInterface');
  const conversationsList = document.getElementById('conversationsList');

  if (chatInterface) chatInterface.style.display = 'none';
  if (conversationsList) conversationsList.style.display = 'block';

  // Clean up message listener
  if (AppState.chatData.messagesUnsubscriber) {
    AppState.chatData.messagesUnsubscriber();
    AppState.chatData.messagesUnsubscriber = null;
  }

  AppState.chatData.activeChat = null;
};

// ========================
// UTILITY FUNCTIONS
// ========================

// Show/hide loading indicator
const showLoading = (message = 'Loading...') => {
  let loadingEl = document.getElementById('loadingIndicator');
  if (!loadingEl) {
    loadingEl = document.createElement('div');
    loadingEl.id = 'loadingIndicator';
    loadingEl.className = 'loading-indicator';
    document.body.appendChild(loadingEl);
  }

  loadingEl.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div class="loading-text">${message}</div>
    </div>
  `;
  loadingEl.style.display = 'flex';
};

const hideLoading = () => {
  const loadingEl = document.getElementById('loadingIndicator');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
};

// Format time functions
const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatRelativeTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const diff = now - new Date(date);

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

// Logout function
window.logout = async () => {
  try {
    const result = await signOutUser();
    if (result.success) {
      utils.showNotification('Logged out successfully', 'success');
    } else {
      utils.showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Logout error:', error);
    utils.showNotification('Error logging out', 'error');
  }
};

// ========================
// EVENT LISTENERS SETUP
// ========================

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  setupEventListeners();

  // Setup message send functionality
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendMessageBtn');

  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage(messageInput.value);
      }
    });
  }

  if (sendButton) {
    sendButton.addEventListener('click', () => {
      const messageInput = document.getElementById('messageInput');
      if (messageInput) {
        sendChatMessage(messageInput.value);
      }
    });
  }
});

// Keep all the existing utility functions from the original app.js
// ... (rest of the original utility functions remain the same)



// ========================
// ORIGINAL UTILITY FUNCTIONS (keeping all the existing functionality)
// ========================

const utils = {
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  formatPrice(price) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(price);
  },

  calculateSavings(originalPrice, currentPrice) {
    if (!originalPrice || originalPrice <= currentPrice) return null;
    return originalPrice - currentPrice;
  },

  animateValue(element, start, end, duration, formatter = (val) => val) {
    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = start + (end - start) * utils.easeOutCubic(progress);
      element.textContent = formatter(Math.floor(value));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  },

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  },

  createRipple(event, element) {
    const ripple = document.createElement("div");
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: rippleEffect 0.6s ease-out;
      pointer-events: none;
      z-index: 10;
    `;

    element.style.position = "relative";
    element.style.overflow = "hidden";
    element.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  },

  showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;

    const colors = {
      success: {
        bg: "rgba(0, 255, 136, 0.1)",
        border: "rgba(0, 255, 136, 0.3)",
        color: "#00FF88",
        icon: "✅",
      },
      error: {
        bg: "rgba(255, 84, 89, 0.1)",
        border: "rgba(255, 84, 89, 0.3)",
        color: "#FF5459",
        icon: "❌",
      },
      info: {
        bg: "rgba(0, 229, 255, 0.1)",
        border: "rgba(0, 229, 255, 0.3)",
        color: "#00E5FF",
        icon: "ℹ️",
      },
      warning: {
        bg: "rgba(255, 193, 7, 0.1)",
        border: "rgba(255, 193, 7, 0.3)",
        color: "#FFC107",
        icon: "⚠️",
      },
    };

    const style = colors[type] || colors.info;
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span>${style.icon}</span>
        <span>${message}</span>
      </div>
    `;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${style.bg};
      border: 1px solid ${style.border};
      color: ${style.color};
      padding: 16px 20px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
      z-index: 10000;
      font-weight: 500;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-out";
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }
};

// Keep all the existing functions like showSection, displayItems, etc.
// ... (include all the original functions here)

