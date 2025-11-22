// user-session.js - User Session Management System
// This file handles authentication state, user data, and session management

class UserSessionManager {
  constructor() {
    this.currentUser = null;
    this.userData = null;
    this.isInitialized = false;
    this.auth = null;
    this.db = null;
    this.modules = null;

    console.log("🔐 UserSessionManager initialized");
    this.setupConnectivityListeners();
    this.waitForFirebase();
  }

  async waitForFirebase() {
    return new Promise((resolve) => {
      const checkFirebase = () => {
        if (
          window.firebaseAuth &&
          window.firebaseDb &&
          window.firebaseModules
        ) {
          console.log("✅ Firebase detected, setting up session manager");
          this.auth = window.firebaseAuth;
          this.db = window.firebaseDb;
          this.modules = window.firebaseModules;
          this.setupAuthStateListener();
          resolve();
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
    });
  }

  setupConnectivityListeners() {
    // Listen for online/offline events
    window.addEventListener("online", () => {
      console.log("🌐 Network connection restored");
      this.handleOnlineMode();
    });

    window.addEventListener("offline", () => {
      console.log("📵 Network connection lost");
      this.handleOfflineMode();
    });
  }

  async handleOfflineMode() {
    console.log("📱 Entering offline mode...");

    // Try to load cached user data
    const cachedData = this.getCachedUserData();
    if (cachedData) {
      this.userData = cachedData;
      console.log("✅ Using cached user data");
      this.updateUI();
    } else {
      // Use minimal fallback data
      await this.useFallbackData();
    }

    // Update UI to show offline status
    this.showOfflineNotification();
  }

  async handleOnlineMode() {
    console.log("🌐 Entering online mode...");

    // Hide offline notification
    this.hideOfflineNotification();

    // Try to reload user data from server
    if (this.currentUser) {
      await this.loadUserData();
    }
  }

  cacheUserData(userData) {
    try {
      const cacheData = {
        userData: userData,
        timestamp: Date.now(),
        userId: this.currentUser?.uid,
      };
      localStorage.setItem("campusKart_userCache", JSON.stringify(cacheData));
      console.log("💾 User data cached successfully");
    } catch (error) {
      console.warn("⚠️ Failed to cache user data:", error);
    }
  }

  getCachedUserData() {
    try {
      const cached = localStorage.getItem("campusKart_userCache");
      if (!cached) return null;

      const cacheData = JSON.parse(cached);

      // Check if cache is valid (less than 24 hours old and for current user)
      const isValid =
        cacheData.timestamp > Date.now() - 24 * 60 * 60 * 1000 &&
        cacheData.userId === this.currentUser?.uid;

      if (isValid) {
        console.log("📦 Retrieved cached user data");
        return cacheData.userData;
      } else {
        // Clear invalid cache
        localStorage.removeItem("campusKart_userCache");
        return null;
      }
    } catch (error) {
      console.warn("⚠️ Failed to retrieve cached data:", error);
      return null;
    }
  }

  tryLoadCachedData() {
    const cachedData = this.getCachedUserData();
    if (cachedData) {
      this.userData = cachedData;
      console.log("✅ Loaded cached user data for UI update");
      this.updateUI();
    } else {
      console.log("⏳ No cached data available, showing loading state");
      this.showLoadingState();
    }
  }

  async useFallbackData() {
    console.log("🔄 Using fallback user data...");

    this.userData = {
      firstName: this.currentUser.displayName?.split(" ")[0] || "",
      lastName:
        this.currentUser.displayName?.split(" ").slice(1).join(" ") || "",
      email: this.currentUser.email,
      phone: "",
      hostel: "",
      createdAt: new Date().toISOString(),
      authProvider:
        this.currentUser.providerData[0]?.providerId === "google.com"
          ? "google"
          : "email",
      profileComplete: false,
      totalTransactions: 0,
      points: 0,
      moneySaved: 0,
      listings: [],
      heartedItems: [],
    };

    console.log("✅ Fallback data created");
    this.updateUI();
  }

  showOfflineNotification() {
    // Update status indicator to show offline
    const statusIndicator = document.querySelector(".status-indicator");
    if (statusIndicator) {
      statusIndicator.className = "status-indicator offline";
      statusIndicator.innerHTML =
        '<span class="status-dot"></span><span class="status-text">Offline</span>';
    }

    // Show offline banner if it doesn't exist
    if (!document.getElementById("offlineBanner")) {
      const banner = document.createElement("div");
      banner.id = "offlineBanner";
      banner.className = "offline-banner";
      banner.innerHTML = `
        <div class="offline-content">
          📵 You're currently offline. Some features may be limited.
          <button onclick="window.location.reload()" class="retry-btn">Retry</button>
        </div>
      `;
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }

  hideOfflineNotification() {
    // Update status indicator to show online
    const statusIndicator = document.querySelector(".status-indicator");
    if (statusIndicator) {
      statusIndicator.className = "status-indicator active";
      statusIndicator.innerHTML =
        '<span class="status-dot"></span><span class="status-text">Online</span>';
    }

    // Remove offline banner
    const banner = document.getElementById("offlineBanner");
    if (banner) {
      banner.remove();
    }
  }

  showLoadingState() {
    // Show loading state in profile section
    this.addProfileLoadingState();

    // Update profile elements with loading text
    const profileNameEl = document.querySelector(".profile-name");
    const profileEmailEl = document.querySelector(".profile-email");

    if (profileNameEl) profileNameEl.textContent = "Loading...";
    if (profileEmailEl) profileEmailEl.textContent = "Loading...";
  }

  updateConnectivityStatus() {
    // Update status based on current connectivity
    if (navigator.onLine) {
      this.hideOfflineNotification();
    } else {
      this.showOfflineNotification();
    }
  }

  setupAuthStateListener() {
    // Listen for authentication state changes
    this.modules.onAuthStateChanged(this.auth, async (user) => {
      console.log(
        "🔄 Auth state changed:",
        user ? "User signed in" : "User signed out"
      );

      if (user) {
        console.log("👤 User details:", {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });

        this.currentUser = user;
        await this.loadUserData();
        this.updateUI();

          const loadingScreen = document.getElementById("loadingScreen");
  if (loadingScreen) {
    loadingScreen.style.animation = "fadeOut 1s ease-out forwards";
    setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 1000);
  }

  const mainApp = document.getElementById("mainApp");
  if (mainApp) {
    mainApp.classList.remove("hidden");
  }

  // Start the app (this was in app.js's hide() function)
  window.app.init();
  // --- END OF NEW BLOCK ---
      } else {
        console.log("👤 No user signed in");
        this.currentUser = null;
        this.userData = null;
        this.handleUnauthenticated();
      }

      this.isInitialized = true;
    });
  }

  async loadUserData(retryCount = 0) {
    if (!this.currentUser) return;

    try {
      console.log("📊 Loading user data from Firestore...");
      this.addProfileLoadingState();

      // Check if we're online first
      if (!navigator.onLine) {
        console.log("📵 Device appears offline, checking cached data...");
        await this.handleOfflineMode();
        return;
      }

      const userDoc = await this.modules.getDoc(
        this.modules.doc(this.db, "users", this.currentUser.uid)
      );

      if (userDoc.exists()) {
        this.userData = userDoc.data();
        console.log("✅ User data loaded:", this.userData);

        // Cache user data for offline use
        this.cacheUserData(this.userData);

        // Check if profile is complete
        if (
          !this.userData.profileComplete &&
          this.userData.authProvider === "google"
        ) {
          this.showProfileCompletePrompt();
        }
      } else {
        console.log("⚠️ User document not found, creating...");
        await this.createUserDocument();
      }
    } catch (error) {
      console.error("❌ Failed to load user data:", error);

      // Handle specific Firebase errors
      if (error.code === "unavailable" || error.message.includes("offline")) {
        console.log("🔄 Firestore unavailable, handling offline mode...");
        await this.handleOfflineMode();
      } else if (error.code === "unauthenticated") {
        console.log("🔐 Authentication required, redirecting...");
        this.handleUnauthenticated();
      } else if (retryCount < 3) {
        console.log(`🔄 Retrying data load (attempt ${retryCount + 1}/3)...`);
        setTimeout(
          () => this.loadUserData(retryCount + 1),
          2000 * (retryCount + 1)
        );
      } else {
        console.error("❌ Max retries reached, using fallback data");
        await this.useFallbackData();
      }
    }
  }

  async createUserDocument() {
    if (!this.currentUser) return;

    const userData = {
      firstName: this.currentUser.displayName?.split(" ")[0] || "",
      lastName:
        this.currentUser.displayName?.split(" ").slice(1).join(" ") || "",
      email: this.currentUser.email,
      phone: "",
      hostel: "",
      createdAt: new Date().toISOString(),
      authProvider:
        this.currentUser.providerData[0]?.providerId === "google.com"
          ? "google"
          : "email",
      profileComplete: false,
      totalTransactions: 0,
      points: 5, // Welcome bonus
      moneySaved: 0,
      listings: [],
      heartedItems: [],
    };

    try {
      await this.modules.setDoc(
        this.modules.doc(this.db, "users", this.currentUser.uid),
        userData
      );

      this.userData = userData;
      console.log("✅ User document created");
    } catch (error) {
      console.error("❌ Failed to create user document:", error);
    }
  }

  updateUI() {
    if (!this.currentUser) {
      console.log("⚠️ UI update skipped - no authenticated user");
      this.handleUnauthenticated();
      return;
    }

    if (!this.userData) {
      console.log("⚠️ UI update skipped - missing user data");
      // Try to use cached data or show loading state
      this.tryLoadCachedData();
      return;
    }

    console.log("🎨 Updating UI with user data");

    // Remove loading state from profile
    this.removeProfileLoadingState();

    // Update profile information
    this.updateProfileSection();

        // Update item card seller names
    this.updateItemCardSellerNames();

    // Update navigation to show user status
    this.updateNavigation();

    // Show personalized content
    this.updatePersonalizedContent();

    // Update user-specific features
    this.updateUserFeatures();

    // Update connectivity status
    this.updateConnectivityStatus();
  }

  updateItemCardSellerNames() {
    // Find all item cards and update the seller name if it matches the current user
    const itemCards = document.querySelectorAll('.item-card');
    itemCards.forEach(card => {
      const sellerId = card.dataset.sellerId;
      if (sellerId === this.currentUser?.uid) {
        const sellerNameElement = card.querySelector('.seller-name');
        if (sellerNameElement) {
          sellerNameElement.textContent = `${this.userData.firstName || ''} ${this.userData.lastName || 'Anonymous'}`;
        }
      }
    });
  }



  updateProfileSection() {
    console.log("👤 Updating profile section with user data...");

    // Update profile name - try multiple selectors
    const profileNameSelectors = [".profile-name", "#profileDisplayName"];
    for (const selector of profileNameSelectors) {
      const profileNameEl = document.querySelector(selector);
      if (profileNameEl && this.userData) {
        const fullName = `${this.userData.firstName || ""} ${
          this.userData.lastName || ""
        }`.trim();
        const displayName =
          fullName || this.userData.email?.split("@")[0] || "User";
        profileNameEl.textContent = displayName;
        console.log("✅ Profile name updated:", displayName);
        break;
      }
    }

    // Update profile email - try multiple selectors
    const profileEmailSelectors = [".profile-email", "#profileDisplayEmail"];
    for (const selector of profileEmailSelectors) {
      const profileEmailEl = document.querySelector(selector);
      if (profileEmailEl && this.currentUser) {
        profileEmailEl.textContent = this.currentUser.email || "No email";
        console.log("✅ Profile email updated:", this.currentUser.email);
        break;
      }
    }

    const profileHostelEl = document.getElementById("profileHostel");
    if (profileHostelEl && this.userData) {
      const hostelText = this.userData.hostel ? `Hostel: ${this.userData.hostel}` : "Hostel: Not set";
      profileHostelEl.textContent = hostelText;
    }

    // Update user stats
    const userPointsEl = document.getElementById("userPoints");
    if (userPointsEl && this.userData) {
      userPointsEl.textContent = this.userData.points || 0;
    }

    const totalTransactionsEl = document.getElementById("totalTransactions");
    if (totalTransactionsEl && this.userData) {
      totalTransactionsEl.textContent = this.userData.totalTransactions || 0;
    }

    const moneySavedEl = document.getElementById("moneySaved");
    if (moneySavedEl && this.userData) {
      moneySavedEl.textContent = `₹${this.userData.moneySaved || 0}`;
    }

    // Update points progress
    const progressTextEl = document.getElementById("progressText");
    const pointsProgressEl = document.getElementById("pointsProgress");
    if (this.userData) {
      const currentPoints = this.userData.points || 0;
      const pointsToBoost = 25;
      const pointsNeeded = Math.max(0, pointsToBoost - currentPoints);
      const progressPercentage = Math.min(
        100,
        (currentPoints / pointsToBoost) * 100
      );

      if (progressTextEl) {
        if (currentPoints >= pointsToBoost) {
          progressTextEl.textContent = `${currentPoints}/${pointsToBoost} points - Ready to boost!`;
        } else {
          progressTextEl.textContent = `${currentPoints}/${pointsToBoost} points to next boost`;
        }
      }

      if (pointsProgressEl) {
        pointsProgressEl.style.width = `${progressPercentage}%`;
      }

      console.log("✅ Points progress updated:", {
        currentPoints,
        progressPercentage,
      });
    }

    // Update avatar with initials
    const avatarEls = document.querySelectorAll(".avatar-circle, .chat-avatar");
    if (avatarEls.length > 0 && this.userData) {
      const initials =
        `${this.userData.firstName?.[0] || ""}${
          this.userData.lastName?.[0] || ""
        }`.toUpperCase() || "👤";
      avatarEls.forEach((el) => {
        el.textContent = initials;
      });
    }
  }

// Inside UserSessionManager class in user-session.js

  updateNavigation() {
    // Add user indicator to navigation
    const navBrand = document.querySelector(".nav-brand");
    if (navBrand && this.userData) {
      let userIndicator = navBrand.querySelector(".user-indicator");
      if (!userIndicator) {
        userIndicator = document.createElement("div");
        userIndicator.className = "user-indicator";
        navBrand.appendChild(userIndicator);
      }

      // --- CHANGED: Added an ID to the points span and made it look clickable ---
      userIndicator.innerHTML = `
        <span class="user-welcome">Welcome, ${
          this.userData.firstName || "User"
        }!</span>
        <button id="navPointsBtn" class="user-points" style="background:none; border:none; cursor:pointer; font:inherit; padding:0;">
          <span style="
            background: var(--color-secondary); 
            padding: 4px 12px; 
            border-radius: 999px; 
            border: 1px solid var(--color-border); 
            color: var(--color-primary); 
            font-weight: 500; 
            font-size: var(--font-size-sm);
            transition: all 0.2s ease;
          ">
            🟡 ${this.userData.points || 0} CampusKoins
          </span>
        </button>
      `;
      
      // --- NEW: Add Event Listener ---
      const pointsBtn = document.getElementById('navPointsBtn');
      if (pointsBtn) {
        pointsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          // Navigate to our new section
          window.app.navigateToSection('campusKoins');
        });
        
        // Add simple hover effect
        pointsBtn.addEventListener('mouseenter', () => {
          pointsBtn.querySelector('span').style.borderColor = 'var(--color-primary)';
          pointsBtn.querySelector('span').style.background = 'var(--color-surface)';
        });
        pointsBtn.addEventListener('mouseleave', () => {
          pointsBtn.querySelector('span').style.borderColor = 'var(--color-border)';
          pointsBtn.querySelector('span').style.background = 'var(--color-secondary)';
        });
      }
    }
  }



  updatePersonalizedContent() {
    // Show welcome message (This is for the status bar "Online" text)
    this.showWelcomeMessage();

    /* --- DELETE OR COMMENT OUT THIS ENTIRE BLOCK ---
    // Update page titles with user's name
    const pageTitles = document.querySelectorAll(".page-title");
    pageTitles.forEach((title) => {
      const originalText = title.dataset.originalText || title.textContent;
      title.dataset.originalText = originalText;

      if (this.userData?.firstName && !originalText.includes("Welcome")) {
        title.textContent = `Welcome back, ${this.userData.firstName}! ${originalText}`;
      }
    });
    --- END OF DELETED BLOCK --- */

    // Load user's listings
    this.loadUserListings();

    // Load hearted items
    this.loadHeartedItems();
  }

  updateUserFeatures() {
    // Enable user-specific features
    const postButtons = document.querySelectorAll(
      '.fab, [data-section="post"]'
    );
    postButtons.forEach((btn) => {
      btn.style.display = "block"; // Show posting features for authenticated users
    });

    // Show user's transaction history
    this.loadTransactionHistory();
  }

  showWelcomeMessage() {
    if (!this.userData?.firstName) return;

    const statusIndicator = document.querySelector(".status-text");
    if (statusIndicator) {
      statusIndicator.textContent = `Welcome, ${this.userData.firstName}!`;
    }
  }

  showProfileCompletePrompt() {
    // Show a subtle prompt for users to complete their profile
    const messageContainer = document.createElement("div");
    messageContainer.className = "profile-complete-prompt";
    messageContainer.innerHTML = `
      <div class="prompt-card">
        <button class="prompt-close" aria-label="Close">&times;</button>
        <h4>👋 Welcome to CampusKart!</h4>
        <p>Complete your profile to start buying and selling.</p>
      </div>
    `;

    document.body.appendChild(messageContainer);

    // Add click handler for close button
    const closeBtn = messageContainer.querySelector('.prompt-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        messageContainer.remove();
      });
    }

    // Also allow clicking anywhere on the prompt to dismiss it
    messageContainer.addEventListener('click', (e) => {
      if (e.target === messageContainer) {
        messageContainer.remove();
      }
    });

    // Auto-hide after 5 seconds (reduced from 10)
    setTimeout(() => {
      if (messageContainer.parentElement) {
        messageContainer.remove();
      }
    }, 5000);
  }

  async loadUserListings() {
    // Load user's posted items
    const listingsContainer = document.getElementById("myListings");
    if (!listingsContainer || !this.currentUser) return;

    try {
      // Query items posted by this user
      const listingsQuery = this.modules.query(
        this.modules.collection(this.db, "items"),
        this.modules.where("userId", "==", this.currentUser.uid)
      );

      const querySnapshot = await this.modules.getDocs(listingsQuery);

      if (querySnapshot.empty) {
        listingsContainer.innerHTML = `
          <div class="empty-state">
            <p>🛍️ You haven't posted anything yet. Start selling to see your items here!</p>
          </div>
        `;
      } else {
        let listingsHTML = "";
        querySnapshot.forEach((doc) => {
          const item = doc.data();
          listingsHTML += this.createItemCard(item, doc.id, true);
        });
        listingsContainer.innerHTML = listingsHTML;
      }
    } catch (error) {
      console.error("❌ Failed to load user listings:", error);
    }
  }

  async loadHeartedItems() {
    // Load items the user has hearted
    const heartedContainer = document.getElementById("heartedPosts");
    if (!heartedContainer || !this.userData?.heartedItems?.length) return;

    try {
      const heartedHTML = this.userData.heartedItems
        .map((itemId) => {
          // In a real implementation, you'd fetch the actual item data
          return `<div class="hearted-item" data-item-id="${itemId}">❤️ Item ${itemId}</div>`;
        })
        .join("");

      heartedContainer.innerHTML =
        heartedHTML ||
        `
        <div class="empty-state">
          <p>💖 Items you heart will appear here</p>
        </div>
      `;
    } catch (error) {
      console.error("❌ Failed to load hearted items:", error);
    }
  }

  async loadTransactionHistory() {
    // Load user's transaction history
    const transactionContainer = document.getElementById("transactionList");
    if (!transactionContainer) return;

    // Mock transaction data - replace with real data from Firestore
    const transactions = [
      { type: "Welcome Bonus", points: 5, date: new Date().toISOString() },
      // Add more transactions from database
    ];

    const transactionHTML = transactions
      .map(
        (transaction) => `
      <div class="transaction-item">
        <div>
          <div class="transaction-type">${transaction.type}</div>
          <div class="transaction-date">${new Date(
            transaction.date
          ).toLocaleDateString()}</div>
        </div>
        <div class="transaction-points">+${transaction.points}</div>
      </div>
    `
      )
      .join("");

    transactionContainer.innerHTML = transactionHTML;
  }

  createItemCard(item, itemId, isOwner = false) {
    return `
      <div class="item-card" data-item-id="${itemId}">
        <div class="item-image">📦</div>
        <div class="item-title">${item.title}</div>
        <div class="item-prices">
          <span class="item-price">₹${item.price}</span>
          ${
            item.originalPrice
              ? `<span class="item-original-price">₹${item.originalPrice}</span>`
              : ""
          }
        </div>
        <div class="item-details">
          <span class="item-tag">${item.category}</span>
          <span class="item-tag">${item.condition}</span>
        </div>
        <div class="item-actions">
          ${
            isOwner
              ? `
            <button class="btn btn--outline btn--sm edit-btn">Edit</button>
            <button class="btn btn--outline btn--sm remove-btn">Remove</button>
          `
              : `
            <button class="btn btn--primary contact-btn">Contact Seller</button>
            <button class="heart-btn">❤️</button>
          `
          }
        </div>
      </div>
    `;
  }

  handleUnauthenticated() {
    console.log("🚪 User not authenticated, redirecting...");

    // Don't redirect if we're already on the auth page
    if (window.location.pathname.includes("auth.html")) {
      return;
    }

    // Show loading briefly, then redirect
    this.showAuthRedirectMessage();

    setTimeout(() => {
      window.location.href = "auth.html";
    }, 1500);
  }

showAuthRedirectMessage() {
  const loadingScreen = document.getElementById("loadingScreen");
  if (loadingScreen) {
    // Just update the text. Don't un-hide it.
    const loadingText = loadingScreen.querySelector(".loading-text");
    if (loadingText) {
      loadingText.textContent = "Please sign in to continue...";
    }
  }
}

  async logout() {
    try {
      console.log("ðŸšª Logging out user...");

      // Use modular API signOut(auth)
      await this.modules.signOut(this.auth);

      // Clear local data
      this.currentUser = null;
      this.userData = null;

      console.log("âœ… User logged out successfully");

      // Redirect to auth page
      window.location.href = "auth.html";
    } catch (error) {
      console.error("âŒ Logout failed:", error);
    }
  }

  switchToProfile() {
    // Switch to profile tab
    const profileTab = document.querySelector('[data-section="profile"]');
    if (profileTab) {
      profileTab.click();
    }

    // Remove profile complete prompt
    const prompt = document.querySelector(".profile-complete-prompt");
    if (prompt) {
      prompt.remove();
    }
  }

  // Loading state management
  addProfileLoadingState() {
    const profileCard = document.querySelector(".profile-card");
    if (profileCard) {
      profileCard.classList.add("user-data-loading");
    }
  }

  removeProfileLoadingState() {
    const profileCard = document.querySelector(".profile-card");
    if (profileCard) {
      profileCard.classList.remove("user-data-loading");
      profileCard.classList.add("authenticated");
    }
  }

  // Public methods for external use
  isAuthenticated() {
    return !!this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUserData() {
    return this.userData;
  }

async updateUserData(updates) {
    if (!this.currentUser) return;

    try {
      // 1. Update Firestore
      await this.modules.updateDoc(
        this.modules.doc(this.db, "users", this.currentUser.uid),
        updates
      );

      // 2. Update local data
      this.userData = { ...this.userData, ...updates };
      this.cacheUserData(this.userData);

      // --- FIX: Only update items if the NAME actually changed ---
      if (updates.firstName || updates.lastName) {
         console.log("📝 Name changed, updating listing names...");
         await this.updateItemsWithNewSellerName(this.userData.firstName, this.userData.lastName);
      }
      // ----------------------------------------------------------

      this.updateUI();
      
      // Refresh marketplace to show new data (like if you filter by "My Hostel")
      if (this.refreshMarketplace) {
          this.refreshMarketplace();
      }

      console.log("✅ User data updated");
    } catch (error) {
      console.error("❌ Failed to update user data:", error);
      throw error; // Re-throw so app.js knows it failed
    }
  }

  async updateItemsWithNewName(firstName, lastName) {
   return;
  }

  async updateItemsWithNewSellerName(firstName, lastName) {
    if (!this.currentUser) return;

    try {
      // 1. Find all items belonging to this seller
      const itemsQuery = this.modules.query(
        this.modules.collection(this.db, "items"),
        this.modules.where("sellerId", "==", this.currentUser.uid)
      );
      
      const querySnapshot = await this.modules.getDocs(itemsQuery);

      // 2. Update each item with the new name
      const updatePromises = [];
      querySnapshot.forEach((doc) => {
        const promise = this.modules.updateDoc(doc.ref, {
          sellerName: `${firstName} ${lastName}`,
        });
        updatePromises.push(promise);
      });

      await Promise.all(updatePromises);
      console.log(`✅ Updated seller name on ${updatePromises.length} items`);

    } catch (error) {
      console.error("❌ Failed to update items with new sellerName:", error);
      // We don't throw here, so the main profile update can still succeed
    }
  }



  async refreshMarketplace() {
    console.log("🔄 Refreshing marketplace section...");
    
    // Check if the marketplace module exists
    if (window.marketplace) {
      try {
        // 1. Reload the data from Firebase/Storage
        await window.marketplace.loadData();
        
        // 2. Re-run filters to update the UI (this renders the grid)
        window.marketplace.filterItems();
        
        console.log("✅ Marketplace refreshed with new user details");
      } catch (err) {
        console.warn("⚠️ Failed to refresh marketplace UI:", err);
      }
    }
  }


}

// Create global instance
let userSession;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Initializing user session manager...");
  userSession = new UserSessionManager();

  // Make it globally available
  window.userSession = userSession;
});

// Export for module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = UserSessionManager;
}
