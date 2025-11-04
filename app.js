// App State and Data with localStorage persistence
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
  userProfile: {
    username: "student123",
    email: "student@gmafil.com",
    phone: "Not verified",
    points: 15,
    totalTransactions: 3,
    moneySaved: 0,
    comfortPreference: "Comfortable meeting anyone",
    recentListings: [],
    heartedPosts: [],
    transactions: [
      { id: 1, type: "sale", amount: 1200, points: 5, date: "2025-09-01" },
      { id: 2, type: "purchase", amount: 800, points: 5, date: "2025-09-03" },
      { id: 3, type: "sale", amount: 2500, points: 5, date: "2025-09-05" },
    ],
  },
  // Replace the existing chatData in AppState
  chatData: {
    conversations: [
      {
        id: "chat1",
        participantName: "Alex Kumar",
        lastMessage: "Is the MacBook still available?",
        timestamp: "2 hours ago",
        type: "selling", // You are selling an item TO Alex
        unread: true,
        messages: [
          {
            text: "Hey! Is the MacBook still available?",
            sender: "received",
            time: "2:30 PM",
          },
          {
            text: "Yes, it is! Would you like to meet up?",
            sender: "sent",
            time: "2:45 PM",
          },
        ],
      },
      {
        id: "chat2",
        participantName: "Priya Singh",
        lastMessage: "Thanks for the quick delivery!",
        timestamp: "1 day ago",
        type: "buying", // You are buying an item FROM Priya
        unread: false,
        messages: [
          {
            text: "Thanks for the quick delivery!",
            sender: "received",
            time: "Yesterday",
          },
          {
            text: "You're welcome! Hope you like it!",
            sender: "sent",
            time: "Yesterday",
          },
        ],
      },
      {
        id: "chat3",
        participantName: "Rohan Desai",
        lastMessage: "Can you do ₹1000 for the jacket?",
        timestamp: "5 hours ago",
        type: "selling",
        unread: false,
        messages: [
          {
            text: "Can you do ₹1000 for the jacket?",
            sender: "received",
            time: "10:00 AM",
          },
          {
            text: "Sorry, the price is firm at ₹1200.",
            sender: "sent",
            time: "10:05 AM",
          },
        ],
      },
      {
        id: "chat4",
        participantName: "Sneha Reddy",
        lastMessage: "I'll take the book. Where can we meet?",
        timestamp: "2 days ago",
        type: "selling",
        unread: false,
        messages: [
          {
            text: "I'll take the book. Where can we meet?",
            sender: "received",
            time: "Tue",
          },
          {
            text: "How about the library entrance at 4 PM?",
            sender: "sent",
            time: "Tue",
          },
        ],
      },
      {
        id: "chat5",
        participantName: "Vikram Rathore",
        lastMessage: "The headphones are not working properly.",
        timestamp: "3 days ago",
        type: "buying",
        unread: true,
        messages: [
          {
            text: "The headphones are not working properly.",
            sender: "received",
            time: "Mon",
          },
        ],
      },
      {
        id: "chat6",
        participantName: "Anjali Mehta",
        lastMessage: "Perfect, see you then!",
        timestamp: "4 days ago",
        type: "buying",
        unread: false,
        messages: [
          {
            text: "Great, I've sent the payment.",
            sender: "received",
            time: "Sun",
          },
          { text: "Perfect, see you then!", sender: "sent", time: "Sun" },
        ],
      },
    ],
    activeChat: null,
    activeFilter: "all", // Default filter
  },
  currentRemoveItemId: null,
  currentBoostItemId: null,
};

const sampleItems = [
  {
    id: "item1",
    title: "Barely Used C++ Textbook",
    category: "Stationery",
    condition: "Used",
    price: 500,
    originalPrice: 1200,
    description: "Latest edition textbook for CS101. No highlighting or marks. Bought last semester.",
    hostel: "A",
    images: [],
    icon: "📚",
    sellerId: "sampleUser1",
    sellerName: "Rohan Kumar",
    sellerEmail: "rohan@example.com",
    status: "available",
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    isBoosted: true,
    isActive: true,
    approved: true,
    flagged: false,
    hearts: 2,
  },
  {
    id: "item2",
    title: "Gaming Mouse",
    category: "Electronics",
    condition: "New",
    price: 1500,
    originalPrice: 2500,
    description: "Brand new gaming mouse, unopened box. Got it as a gift, but I already have one.",
    hostel: "B",
    images: [],
    icon: "💻",
    sellerId: "sampleUser2",
    sellerName: "Priya Sharma",
    sellerEmail: "priya@example.com",
    status: "available",
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    isBoosted: false,
    isActive: true,
    approved: true,
    flagged: false,
    hearts: 5,
  },
  {
    id: "item3",
    title: "Hoodie (Size M)",
    category: "Clothes",
    condition: "Used",
    price: 300,
    originalPrice: 1000,
    description: "Comfortable black hoodie. Used for one winter. Good condition.",
    hostel: "C",
    images: [],
    icon: "👕",
    sellerId: "sampleUser3",
    sellerName: "Ankit Singh",
    sellerEmail: "ankit@example.com",
    status: "available",
    createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
    isBoosted: false,
    isActive: true,
    approved: true,
    flagged: false,
    hearts: 1,
  }
];



// Utility Functions
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
    if (!element) return;
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
    const computedStyle = getComputedStyle(element);
    if (computedStyle.position === "static") {
      element.style.position = "relative";
    }

    element.style.overflow = "hidden";
    element.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  },

  saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("localStorage not available");
    }
  },

  loadFromStorage(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn("localStorage not available");
      return defaultValue;
    }
  },

  getTimestamp(dateField) {
    if (!dateField) return 0;
    // Case 1: Firestore Timestamp object (from server)
    if (typeof dateField.toDate === 'function') {
      return dateField.toDate().getTime();
    }
    // Case 2: ISO String or Date object (local)
    const date = new Date(dateField);
    // Check if it's a valid date
    if (!isNaN(date.getTime())) { 
      return date.getTime();
    }
    return 0; // Fallback
  },
  // END OF NEW FUNCTION

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
                <div class="notification-content">
                    <span class="notification-icon">${style.icon}</span>
                    <span>${message}</span>
                </div>
            `;

    notification.style.cssText = `
              position: fixed;
              top: 100px;
              right: 20px;
              background: ${style.bg};
              border: 1px solid ${style.border};
              color: ${style.color};
              padding: 16px 20px;
              border-radius: 12px;
              backdrop-filter: blur(10px);
              animation: slideInRight 0.5s ease-out;
              z-index: 1000;
              max-width: 300px;
          `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.5s ease-out forwards";
      setTimeout(() => notification.remove(), 500);
    }, 4000);
  },
};

function switchToSection(sectionName) {
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.section === sectionName);
  });

  document.querySelectorAll(".section").forEach((section) => {
    const isActive = section.id === sectionName;
    section.style.display = isActive ? "block" : "none";
    section.classList.toggle("active", isActive);
  });

  const fabButton = document.getElementById("fabButton");
  if (fabButton) {
    fabButton.classList.toggle("hidden", sectionName !== "marketplace");
  }

  AppState.currentSection = sectionName;
  updateNavigationIndicator();

  if (sectionName === "profile" && window.profile) window.profile.loadData();
  else if (sectionName === "chat" && window.chat)
    window.chat.loadConversations();
}

function updateNavigationIndicator() {
  const activeTab = document.querySelector(".nav-tab.active");
  const indicator = document.querySelector(".nav-indicator");
  if (!activeTab || !indicator) return;

  const container = activeTab.parentElement;
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }

  indicator.style.width = `${activeTab.offsetWidth}px`;
  indicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
  indicator.style.opacity = "1";
}

class LoadingScreen {
  constructor() {
    this.loadingScreen = document.getElementById("loadingScreen");
    this.progressFill = document.querySelector(".progress-fill");
    this.loadingText = document.querySelector(".loading-text");
  }

  init() {
    const messages = [
      "Loading your marketplace...",
      "Connecting students...",
      "Preparing awesome deals...",
      "Almost ready!",
    ];
    let messageIndex = 0;
    let progress = 0;

    const loadingInterval = setInterval(() => {
      progress += Math.random() * 25;
      progress = Math.min(progress, 100);
      this.progressFill.style.transform = `translateX(${progress - 100}%)`;

      if (
        messageIndex < messages.length - 1 &&
        progress > (messageIndex + 1) * 25
      ) {
        messageIndex++;
        this.loadingText.textContent = messages[messageIndex];
      }

      if (progress >= 100) {
        clearInterval(loadingInterval);
        setTimeout(() => this.hide(), 500);
      }
    }, 100);
  }

  hide() {
    this.loadingScreen.style.animation = "fadeOut 1s ease-out forwards";
    setTimeout(() => {
      this.loadingScreen.style.display = "none";
      document.getElementById("mainApp").classList.remove("hidden");
      window.app.init(); // This will now correctly call the async init
    }, 1000);
  }
}

class Navigation {
  init() {
    this.bindEvents();
    updateNavigationIndicator();
  }

  bindEvents() {
    document.addEventListener("click", (e) => {
      const navTab = e.target.closest(".nav-tab");
      if (navTab) {
        e.preventDefault();
        switchToSection(navTab.dataset.section);
        utils.createRipple(e, navTab);
      }
      const fabButton = e.target.closest("#fabButton");
      if (fabButton) {
        e.preventDefault();
        switchToSection("post");
        utils.createRipple(e, fabButton);
      }
    });
  }
}

class Marketplace {
  async init() {
    await this.loadData();
    this.bindEvents();
    this.filterItems();
  }

  async loadData() {
    const savedProfile = utils.loadFromStorage(
      "user_profile",
      AppState.userProfile
    );
    AppState.userProfile = { ...AppState.userProfile, ...savedProfile };

    try {
      if (window.firebaseDb && window.firebaseModules) {
        const { collection, query, where, orderBy, getDocs } = window.firebaseModules;
        const itemsRef = collection(window.firebaseDb, "items");
        let items = [];

        // 1) Try status == 'available' AND isActive == true ordered by createdAt desc
        try {
          const q = query(itemsRef, where("status", "==", "available"), where("isActive", "==", true), orderBy("createdAt", "desc"));
          const snapshot = await getDocs(q);
          snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
        } catch (e) {
          const msg = (e?.message || "").toLowerCase();
          if (e?.code === "failed-precondition" || msg.includes("index")) {
            console.warn("Index not ready; retrying items fetch without orderBy");
            const q2 = query(itemsRef, where("status", "==", "available"), where("isActive", "==", true));
            const snapshot2 = await getDocs(q2);
            snapshot2.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
          } else {
            throw e;
          }
        }

        // 2) Backward-compat: legacy field isActive == true
        if (items.length === 0) {
          try {
            const qLegacy = query(itemsRef, where("isActive", "==", true));
            const snapLegacy = await getDocs(qLegacy);
            snapLegacy.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
          } catch (e) {
            console.warn("Legacy isActive query failed:", e?.message || e);
          }
        }

        // 3) If still empty, fall back to local cache/sample
        if (items.length === 0) {
          const savedItems = utils.loadFromStorage("marketplace_items", sampleItems);
          AppState.items = [...savedItems];
          AppState.originalItems = [...savedItems];
          AppState.filteredItems = [...savedItems];
          
          return;
        }

        // Success
        AppState.items = [...items];
        AppState.originalItems = [...items];
        AppState.filteredItems = [...items];
        
        return;
      }
    } catch (err) {
      console.warn("Failed to fetch items from Firestore, using fallback:", err);
    }

    // No Firebase: use local stored/sample data
    const savedItems = utils.loadFromStorage("marketplace_items", sampleItems);
    AppState.items = [...savedItems];
    AppState.originalItems = [...savedItems];
    AppState.filteredItems = [...savedItems];
    
  }



  bindEvents() {
    document.getElementById("searchInput")?.addEventListener(
      "input",
      utils.debounce((e) => {
        AppState.searchQuery = e.target.value.toLowerCase();
        this.filterItems();
      }, 300)
    );

    ["categoryFilter", "conditionFilter", "hostelFilter"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", (e) => {
        const filterType = id.replace("Filter", "");
        AppState.filters[filterType] = e.target.value;
        this.filterItems();
      });
    });
  }

  filterItems() {
    AppState.filteredItems = AppState.originalItems.filter((item) => {
      // Only show active (approved) items in the marketplace
      const matchesActive = item.isActive !== false;
      const { searchQuery, filters } = AppState;
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery);
      if (!matchesActive) return false;
      const matchesCategory =
        !filters.category || item.category === filters.category;
      const matchesCondition =
        !filters.condition || item.condition === filters.condition;
      let matchesHostel = true; // Default to true (for "All Hostels")

      if (filters.hostel === 'myHostel') {
        // User selected "My Hostel", get their data
        const currentUser = window.userSession?.getCurrentUser?.();
        const userData = window.userSession?.getUserData?.();
        const userHostel = (currentUser && userData) ? userData.hostel : null;

        if (userHostel) {
          // User is logged in and has a hostel, so filter
          matchesHostel = item.hostel === userHostel;
        } else {
          // User is not logged in or has no hostel. "My Hostel" filter should match nothing.
          matchesHostel = false;
        }
      }
      return (
        matchesSearch && matchesCategory && matchesCondition && matchesHostel
      );
    });

      
    AppState.filteredItems.sort((a, b) => {
      const aIsBoosted = a.isBoosted || false;
      const bIsBoosted = b.isBoosted || false;

      // 1. One is boosted, one is not
      if (aIsBoosted && !bIsBoosted) return -1; // a comes first
      if (!aIsBoosted && bIsBoosted) return 1;  // b comes first

      // 2. Both are boosted: sort by updatedAt descending
      if (aIsBoosted && bIsBoosted) {
        // We use 'updatedAt' because boosting updates this field
        const aTime = utils.getTimestamp(a.updatedAt);
        const bTime = utils.getTimestamp(b.updatedAt);
        return bTime - aTime; // Higher (more recent) timestamp first
      }

      // 3. Neither is boosted: sort by createdAt descending
      if (!aIsBoosted && !bIsBoosted) {
        const aTime = utils.getTimestamp(a.createdAt);
        const bTime = utils.getTimestamp(b.createdAt);
        return bTime - aTime; // Higher (more recent) timestamp first
      }
      
      return 0; // Should be unreachable
    });
    
    this.renderItems();
  }

  renderItems() {
    const itemsGrid = document.getElementById("itemsGrid");
    if (!itemsGrid) return;
    itemsGrid.innerHTML = "";

    if (AppState.filteredItems.length === 0) {
      itemsGrid.innerHTML = `<div class="no-items"><h3>No items found</h3><p>Try adjusting your search or filters</p></div>`;
      return;
    }
    AppState.filteredItems.forEach((item, index) => {
      itemsGrid.appendChild(this.createItemCard(item, index));
    });
  }

  createItemCard(item, index) {
    const card = document.createElement("div");
    card.className = `item-card glass-card${item.isBoosted ? " boosted" : ""}`;
    card.style.animationDelay = `${index * 0.1}s`;

    const savings = item.originalPrice
      ? utils.calculateSavings(item.originalPrice, item.price)
      : null;
    const isUserItem =
      !!item.sellerId &&
      item.sellerId === window.userSession?.getCurrentUser?.()?.uid;
    const isHearted = AppState.userProfile.heartedPosts.includes(item.id);
    const primaryImage =
      Array.isArray(item.images) && item.images.length > 0
        ? item.images[0]
        : null;

    card.innerHTML = `
      <div class="item-image">
          ${
            primaryImage
              ? `<img src="${primaryImage}" alt="${item.title}" class="item-img" style="width:100%;height:160px;object-fit: contain;border-radius:12px;"/>`
              : `<span class="item-emoji">${item.icon || "📦"}</span>`
          }
          <button class="heart-btn ${isHearted ? "hearted" : ""}" data-id="${
      item.id
    }" title="Heart this item">${isHearted ? "❤️" : "🤍"}</button>
      </div>

      <div class="item-card-content">
        <h3 class="item-title">${item.title}</h3>
        <div class="item-prices">
            <div class="item-price">${utils.formatPrice(item.price)}</div>
            ${
              item.originalPrice
                ? `<div class="item-original-price">${utils.formatPrice(
                    item.originalPrice
                  )}</div>`
                : ""
            }
            ${savings ? `<div class="item-savings">Save ₹${savings}</div>` : ""}
        </div>
        <div class="item-details">
            <span class="item-tag">${item.category}</span>
            <span class="item-tag">${item.condition}</span>
            <span class="item-tag">${item.hostel}</span>
        </div>
        <div class="item-seller-info">
            <span class="seller-label">Sold by:</span>
            <span class="seller-name" data-seller-name="${item.sellerName || "Anonymous"}">${item.sellerName || "Anonymous"}</span>
        </div>
        <div class="item-actions">
            <button class="btn btn--primary btn--sm contact-btn" data-id="${
              item.id
            }">Contact Seller</button>
            ${
              isUserItem
                ? `
                <button class="boost-btn" data-id="${item.id}" title="Boost post">🚀</button>
                <button class="remove-btn" data-id="${item.id}" title="Remove post">🗑️</button>`
                : ""
            }
        </div>
      </div>
      `;

    card.addEventListener("click", (e) => this.handleCardClick(e, item.id));
    return card;
  }

  handleCardClick(e, itemId) {
    const target = e.target;
    if (target.closest(".contact-btn")) {
      this.contactSeller(itemId);
    } else if (target.closest(".heart-btn")) {
      this.toggleHeart(itemId, target.closest(".heart-btn"));
    } else if (target.closest(".boost-btn")) {
      this.showBoostModal(itemId);
    } else if (target.closest(".remove-btn")) {
      this.showRemoveModal(itemId);
    } else {
      // Open detail section for general card clicks
      const newUrl = `${window.location.pathname}?item=${itemId}`;
      // Update the browser history and URL bar
      window.history.pushState({ itemId: itemId }, `Item ${itemId}`, newUrl);
      
      // Now, open the detail section
      window.itemDetail?.showById?.(itemId);
    }
  }

  async contactSeller(itemId) {
    const currentUser = window.userSession?.getCurrentUser?.() || window.firebaseAuth?.currentUser || null;
    if (!currentUser) {
      utils.showNotification('Please sign in to contact sellers', 'error');
      return;
    }
    const item = AppState.originalItems.find((i) => String(i.id) === String(itemId));
    if (!item) {
      utils.showNotification('Item not found', 'error');
      return;
    }
    if (item.sellerId === currentUser.uid) {
      utils.showNotification("You can't contact yourself", 'warning');
      return;
    }
    try {
      await window.chat.startConversationForItem(item);
      switchToSection('chat');
    } catch (e) {
      console.error('Failed to start conversation:', e);
      utils.showNotification('Could not start chat. Please try again.', 'error');
    }
  }

  toggleHeart(itemId, button) {
    const isHearted = AppState.userProfile.heartedPosts.includes(itemId);

    if (isHearted) {
      AppState.userProfile.heartedPosts =
        AppState.userProfile.heartedPosts.filter((id) => id !== itemId);
      if (button) {
        button.classList.remove("hearted");
        button.textContent = "🤍";
      }
      utils.showNotification("Removed from favorites", "info");
    } else {
      AppState.userProfile.heartedPosts.push(itemId);
      if (button) {
        button.classList.add("hearted");
        button.textContent = "❤️";
      }
      utils.showNotification("Added to favorites! ❤️", "success");
    }

    const item = AppState.originalItems.find((i) => i.id === itemId);
    if (item) {
      item.hearts = (item.hearts || 0) + (isHearted ? -1 : 1);
    }

    
    utils.saveToStorage("user_profile", AppState.userProfile);
    utils.saveToStorage("marketplace_items", AppState.originalItems);
  }

  showBoostModal(itemId) {
    AppState.currentBoostItemId = itemId;

    // --- 1. Get all modal elements ---
    const modal = document.getElementById("boostModal");
    if (!modal) return; // Safety check

    const titleEl = document.getElementById("boostModalTitle");
    const messageEl = document.getElementById("boostModalMessage");
    const pointsSpan = document.getElementById("currentPoints");
    const confirmBtn = document.getElementById("confirmBoost");

    // --- 2. Get item and user data ---
    const item = AppState.originalItems.find(i => String(i.id) === String(itemId));
    if (!item) {
      utils.showNotification("Could not find that item.", "error");
      return;
    }

    const userData = window.userSession?.getUserData?.() || {};
    const currentPoints = userData.points || 0;
    const requiredPoints = 25;
    let buttonText = "";

    // --- 3. Set modal text based on item's boosted status ---
    if (item.isBoosted) {
      // RE-BOOST LOGIC
      if (titleEl) titleEl.textContent = "Re-Boost Your Post";
      if (messageEl) messageEl.textContent = "This item is already boosted. Boosting it again will list it at the top of the marketplace again. Do you wish to continue?";
      buttonText = `Re-Boost (${requiredPoints} points)`;

    } else {
      // FIRST-TIME BOOST LOGIC
      if (titleEl) titleEl.textContent = "Boost Your Post";
      if (messageEl) messageEl.textContent = "Use 25 points to boost this post and pin it to the top for 7 days!";
      buttonText = `Boost Post (${requiredPoints} points)`;
    }

    // --- 4. Handle points and button state (common logic) ---
    if (pointsSpan) {
      pointsSpan.textContent = currentPoints;
    }

    if (confirmBtn) {
      if (currentPoints >= requiredPoints) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = buttonText; // Set the correct text
      } else {
        confirmBtn.disabled = true;
        confirmBtn.textContent = `Need ${requiredPoints - currentPoints} more points`;
      }
    }
    
    // --- 5. Show the modal ---
    modal.classList.remove("hidden");
    document.body.classList.add('modal-open');
  }

  showRemoveModal(itemId) {
    AppState.currentRemoveItemId = itemId;
    document.getElementById("removeModal")?.classList.remove("hidden");
  }

 async boostPost(itemId) {
    const requiredPoints = 25;
    const currentUser = window.userSession?.getCurrentUser?.() || window.firebaseAuth?.currentUser;
    const userData = window.userSession?.getUserData?.() || {};
    const currentPoints = userData.points || 0;

    // 1. Check for user and points
    if (!currentUser) {
      utils.showNotification("Please sign in to boost posts", "error");
      return;
    }
    
    if (currentPoints < requiredPoints) {
      utils.showNotification("Not enough points to boost", "error");
      return;
    }

    // 2. Check for Firebase services
    const { doc, updateDoc, increment, setDoc } = window.firebaseModules || {};
    if (!window.firebaseDb || !doc || !updateDoc || !increment || !setDoc) {
      utils.showNotification("Cannot connect to server. Please try again.", "error");
      return;
    }

    // 3. Perform the server update
    try {
      const itemRef = doc(window.firebaseDb, 'items', String(itemId));
      const userRef = doc(window.firebaseDb, 'users', currentUser.uid);
      
      // Update the item to be boosted
      await updateDoc(itemRef, { 
        isBoosted: true, 
        updatedAt: new Date().toISOString() // Good practice to update this
      });
      
      // Spend the user's points
      // Using setDoc + merge + increment is the safest way
      await setDoc(userRef, { 
        points: increment(-requiredPoints) 
      }, { merge: true });

      // 4. Update local state
      const item = AppState.originalItems.find(i => i.id === itemId);
      if(item) {
          item.isBoosted = true;
      }


      // 5. Update UI
      this.filterItems(); // Re-render to show boosted status
      utils.showNotification("Post boosted successfully! 🚀", "success");
      
      // Also update profile if it's the current section
      if (AppState.currentSection === 'profile' && window.profile) {
          window.profile.loadData();
      }

    } catch (error) {
      console.error("Failed to boost post:", error);
      utils.showNotification("Failed to boost post. Please try again.", "error");
    }
  }

  async removePost(itemId) {
    const currentUser =
      window.userSession?.getCurrentUser?.() || window.firebaseAuth?.currentUser || null;

    let removedInCloud = false;
    if (window.firebaseDb && window.firebaseModules && currentUser) {
      const { doc, deleteDoc, updateDoc } = window.firebaseModules;
      const itemRef = doc(window.firebaseDb, 'items', String(itemId));

      const withTimeout = (p, ms) => new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), ms);
        p.then(v => { clearTimeout(t); resolve(v); }).catch(e => { clearTimeout(t); reject(e); });
      });

      try {
        await withTimeout(deleteDoc(itemRef), 8000);
        removedInCloud = true;
      } catch (err) {
        // Fallback to soft-delete if hard delete is blocked
        try {
          await withTimeout(updateDoc(itemRef, { status: 'removed', updatedAt: new Date().toISOString() }), 8000);
          removedInCloud = true;
        } catch (e2) {
          // Fire-and-forget background attempts
          deleteDoc(itemRef).catch(() => {});
          updateDoc(itemRef, { status: 'removed', updatedAt: new Date().toISOString() }).catch(() => {});
        }
      }
    }

    // Update UI and local cache regardless
    AppState.originalItems = AppState.originalItems.filter((i) => i.id !== itemId);
    AppState.items = [...AppState.originalItems];
    utils.saveToStorage("marketplace_items", AppState.originalItems);
    this.filterItems();

    utils.showNotification(
      removedInCloud ? "Post removed successfully" : "Post removed locally. Will sync when online.",
      removedInCloud ? "success" : "info"
    );
  }
}

class PostItem {
  constructor() {
    this.selectedFiles = []; // To manage files for previews and removal
  }

  init() {
    this.bindEvents();
    this.initUploadArea();
  }

  initUploadArea() {
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("itemPhotos");

    if (uploadArea && fileInput) {
      uploadArea.addEventListener("click", () => fileInput.click());

      fileInput.addEventListener("change", (e) => {
        // Limit to 5 total images
        const newFiles = Array.from(e.target.files).slice(
          0,
          5 - this.selectedFiles.length
        );
        this.selectedFiles.push(...newFiles);
        this.renderPreviews();
        // Reset the input so the user can select the same file again if they remove it
        fileInput.value = "";
      });
    }
  }

  renderPreviews() {
    const uploadedImagesContainer = document.getElementById("uploadedImages");
    if (!uploadedImagesContainer) return;

    uploadedImagesContainer.innerHTML = ""; // Clear existing previews

    this.selectedFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement("div");
        div.className = "uploaded-image-thumb";
        div.innerHTML = `
          <img src="${e.target.result}" alt="${file.name}" />
          <button type="button" class="remove-btn" data-index="${index}">&times;</button>
        `;
        uploadedImagesContainer.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  }

  removePreview(indexToRemove) {
    this.selectedFiles.splice(indexToRemove, 1);
    this.renderPreviews();
  }

  bindEvents() {
    const form = document.getElementById("postForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.submitForm();
      });
    }



    // Add a delegated event listener for remove buttons on previews
    document
      .getElementById("uploadedImages")
      ?.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-btn")) {
          const index = parseInt(e.target.dataset.index, 10);
          this.removePreview(index);
        }
      });

    const disclaimerCheckbox = document.getElementById("disclaimerCheckbox");
    // Select the button inside the postForm
    const submitBtn = document.querySelector("#postForm button[type='submit']");

    if (disclaimerCheckbox && submitBtn) {
      // Add listener to the checkbox
      disclaimerCheckbox.addEventListener("change", () => {
        // Enable the button ONLY if the checkbox is checked
        submitBtn.disabled = !disclaimerCheckbox.checked;
      });
    }

    const openTermsBtn = document.getElementById('openTermsBtn');
    const termsModal = document.getElementById('termsModal');
    
    if (openTermsBtn && termsModal) {
      // Open the modal
      openTermsBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Stop the <a> tag from jumping
        termsModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
      });
    }
  }

  async uploadImagesToStorage(uid) {
    if (
      !this.selectedFiles.length ||
      !(window.firebaseStorage && window.firebaseModules)
    ) {
      return [];
    }

    const { ref, uploadBytes, getDownloadURL } = window.firebaseModules;
    const uploadPromises = this.selectedFiles.map(async (file) => {
      if (!file.type.startsWith("image/")) return null;

      const path = `items/${uid}/${Date.now()}_${file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      )}`;
      const storageRef = ref(window.firebaseStorage, path);

      try {
        const snap = await uploadBytes(storageRef, file);
        return await getDownloadURL(snap.ref);
      } catch (error) {
        console.error("Error uploading file:", file.name, error);
        utils.showNotification(`Failed to upload ${file.name}`, "error");
        return null;
      }
    });

    const urls = await Promise.all(uploadPromises);
    return urls.filter((url) => url !== null); // Filter out failed uploads
  }

  async submitForm() {
    const form = document.getElementById("postForm");
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector(".btn-text");
    const btnLoader = submitBtn.querySelector(".btn-loader");

    btnText.classList.add("hidden");
    btnLoader.classList.remove("hidden");
    submitBtn.disabled = true;

    try {
      const currentUser =
        window.userSession?.getCurrentUser?.() ||
        window.firebaseAuth?.currentUser;
      if (!currentUser) {
        throw new Error("Please sign in to post an item.");
      }

      const userListings = AppState.originalItems.filter(
        (item) => item.sellerId === currentUser.uid
      );
      if (userListings.length >= 10) {
        throw new Error("You have reached the weekly listing limit.");
      }

      const imageUrls = await this.uploadImagesToStorage(currentUser.uid);

      const categoryVal = document.getElementById("itemCategory").value;
      const newItem = {
        title: document.getElementById("itemTitle").value.trim(),
        category: categoryVal,
        condition: document.getElementById("itemCondition").value,
        price: parseInt(document.getElementById("itemPrice").value, 10),
        originalPrice:
          parseInt(document.getElementById("itemOriginalPrice").value, 10) ||
          null,
        description: document.getElementById("itemDescription").value.trim(),
        hostel: document.getElementById("itemHostel").value,
        images: imageUrls,
        icon: this.getCategoryIcon(categoryVal),
        sellerId: currentUser.uid,
        sellerEmail: currentUser.email || "",
        sellerName:
          window.userSession?.getUserData?.().displayName ||
          currentUser.displayName ||
          "Anonymous",
        status: "available",
      };


      if (window.firebaseDb && window.firebaseModules) {
        const { collection, addDoc, serverTimestamp, doc, getDoc } = window.firebaseModules;

        // Prevent banned users from posting
        const userRef = doc(window.firebaseDb, 'users', currentUser.uid);
        try {
          const userSnapshot = await getDoc(userRef);
          const userData = userSnapshot?.data?.() || {};
          if (userData.banned) {
            throw new Error('Your account has been banned from posting due to policy violations. Contact support if you believe this is an error.');
          }
        } catch (err) {
          // Re-throw so it is handled by outer catch
          throw err;
        }

        const itemsRef = collection(window.firebaseDb, "items");
        const docToSave = {
          ...newItem,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isBoosted: false,
          // Start as active; Cloud Function will set to false if profanity detected
          isActive: true,
          approved: false,
          flagged: false,
          hearts: 0,
          heartedBy: [],
        };
        const docRef = await addDoc(itemsRef, docToSave);
        // Add to local state with actual timestamp for immediate display
        const nowTimestamp = new Date();
        AppState.originalItems.unshift({ 
          ...docToSave, 
          id: docRef.id,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp
        });
      }

      // The item is posted live immediately; Cloud Function will remove it if profanity is detected
      utils.showNotification("Item posted successfully!", "success");
      form.reset();
      this.selectedFiles = []; // Clear selected files
      this.renderPreviews(); // Clear previews from UI
      window.marketplace?.filterItems();

      setTimeout(() => switchToSection("marketplace"), 500);
    } catch (error) {
      console.error("Failed to post item:", error);
      utils.showNotification(
        error.message || "Failed to post item. Please try again.",
        "error"
      );
    } finally {
      btnText.classList.remove("hidden");
      btnLoader.classList.add("hidden");
      submitBtn.disabled = false;
    }
  }

  getCategoryIcon(category) {
    const icons = {
      Clothes: "👕",
      Electronics: "💻",
      Stationery: "📚", // CHANGED from "Books"
      Cosmetics: "💄",
      Miscellaneous: "📦",
      Food: "🍔", // ADDED this line
    };
    return icons[category] || "📦";
  }
}

// Replace the entire Chat class with this functional version
class Chat {
// In the Chat class, update the init method
  init() {
    this.db = window.firebaseDb;
    this.modules = window.firebaseModules || {};
    this.auth = window.firebaseAuth;
    this.conversations = [];
    this.activeConversation = null;
    this.unsubConversations = null;
    this.unsubMessages = null;
    this.activeFilter = 'all'; // NEW: Add this line to track the filter state

    this.bindEvents();

    const chatBackButton = document.getElementById('chatBackButton');
    const chatContainer = document.querySelector('.chat-container');
    
    if (chatBackButton && chatContainer) {
      chatBackButton.addEventListener('click', () => {
        chatContainer.classList.remove('chat-active');
      });
    }
    // Try to subscribe now (if user is already available)
    this.subscribeConversations();
    // And resubscribe on auth state changes
    if (this.modules.onAuthStateChanged && this.auth) {
      this.modules.onAuthStateChanged(this.auth, (user) => {
        if (user) {
          this.subscribeConversations();
        } else {
          // Cleanup when signed out
          if (this.unsubConversations) { this.unsubConversations(); this.unsubConversations = null; }
          if (this.unsubMessages) { this.unsubMessages(); this.unsubMessages = null; }
          this.conversations = [];
          this.renderConversationList();
          const chatMessages = document.getElementById('chatMessages');
          if (chatMessages) chatMessages.innerHTML = '';
        }
      });
    }
  }

  // Backward-compat: keep old API so switchToSection can safely call it
  loadConversations() {
    this.renderConversationList();
  }

  // Subscribe to conversations for the current user
  subscribeConversations() {
    const conversationList = document.getElementById('conversationList');
    if (!conversationList || !this.db || !this.modules?.onSnapshot) return;

    const user = this.auth?.currentUser;
    if (!user) return;

    const { collection, query, where, onSnapshot } = this.modules;
    const convRef = collection(this.db, 'conversations');
    const q = query(convRef, where('participants', 'array-contains', user.uid));

    if (this.unsubConversations) this.unsubConversations();

    this.unsubConversations = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      // client-side sort by lastMessageAt desc
      list.sort((a, b) => (b.lastMessageAt?.toMillis?.() || 0) - (a.lastMessageAt?.toMillis?.() || 0));
      this.conversations = list;
      this.renderConversationList();
    }, (error) => {
      console.error('Failed to subscribe to conversations:', error);
    });
  }

// Replace the existing renderConversationList function with this one
// Replace the entire renderConversationList method in the Chat class
  renderConversationList() {
    const conversationList = document.getElementById('conversationList');
    if (!conversationList) return;
    conversationList.innerHTML = '';

    const me = this.auth?.currentUser;
    if (!me) {
      conversationList.innerHTML = `<div class="empty-state"><p>Please sign in to see your messages.</p></div>`;
      return;
    }

    // NEW: Filter conversations based on the active filter
    let filteredConversations = this.conversations;
    if (this.activeFilter === 'selling') {
      filteredConversations = this.conversations.filter(c => c.sellerId === me.uid);
    } else if (this.activeFilter === 'buying') {
      filteredConversations = this.conversations.filter(c => c.buyerId === me.uid);
    }
    
    if (filteredConversations.length === 0) {
      conversationList.innerHTML = `<div class="empty-state"><p>No conversations here yet.</p></div>`;
      return;
    }

    // Use the filtered list to render the items
    filteredConversations.forEach((c) => {
      const otherUid = (c.participants || []).find((p) => p !== me?.uid) || '';
      
      let displayName = 'Conversation';
      if (otherUid) {
          displayName = c.participantNames?.[otherUid]
                      || c.participantEmails?.[otherUid]
                      || c.sellerEmail;
      }

      const preview = c.lastMessage || (c.itemTitle ? `About: ${c.itemTitle}` : '');

      const myUnreadCount = (c.unreadCounts && c.unreadCounts[me.uid]) ? c.unreadCounts[me.uid] : 0;
      const el = document.createElement('div');
      el.className = 'conversation-item';
      el.dataset.chatId = c.id;
      el.innerHTML = `
        <div class="conversation-details">
          <div class="conversation-name">${displayName}</div>
          <div class="conversation-preview">${preview || ''}</div>
        </div>
        <div class="conversation-meta">
        <div class="conversation-time">${c.lastMessageAt?.toDate?.()?.toLocaleString?.() || ''}</div>
          ${myUnreadCount > 0 ? `<span class="unread-bubble">${myUnreadCount}</span>` : ''}
        </div>
      `;
      el.addEventListener('click', () => this.openChat(c.id));
      conversationList.appendChild(el);
    });
  }

  // Start or reuse a conversation for a given item
  async startConversationForItem(item) {
    if (!this.db || !this.modules) throw new Error("Chat not initialized.");
    const me = this.auth?.currentUser;
    if (!me) {
      utils.showNotification("Please sign in to start a chat.", "error");
      return;
    }
    if (!item || !item.sellerId) throw new Error("Invalid item data.");
    if (item.sellerId === me.uid) {
        utils.showNotification("You cannot start a conversation about your own item.", "warning");
        return;
    }

    const { collection, query, where, getDocs, addDoc, serverTimestamp } = this.modules;

    // Check for an existing conversation for this item with this user
    const convRef = collection(this.db, 'conversations');
    const q = query(convRef,
        where('itemId', '==', String(item.id)),
        where('participants', 'array-contains', me.uid)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        // Conversation already exists, just open it
        const existingConvo = snapshot.docs[0];
        this.openChat(existingConvo.id);
        return;
    }

    // No existing conversation, so create a new one
    const sellerData = { displayName: item.sellerName || 'Seller', email: item.sellerEmail || '' };
    const buyerData = { displayName: me.displayName || 'Buyer', email: me.email || '' };

    const newConversation = {
        itemId: String(item.id),
        itemTitle: item.title,
        itemPrice: item.price,
        sellerId: item.sellerId,
        buyerId: me.uid,
        participants: [me.uid, item.sellerId],
        participantNames: {
            [me.uid]: buyerData.displayName,
            [item.sellerId]: sellerData.displayName,
        },
        participantEmails: {
            [me.uid]: buyerData.email,
            [item.sellerId]: sellerData.email,
        },
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessage: `Conversation started about "${item.title}"`,
        itemSold: false,
    };

    const docRef = await addDoc(convRef, newConversation);
    // Open the newly created chat
    this.openChat(docRef.id);
  }

  // Start or reuse a conversation for a given item
// Replace the existing startConversationForItem function with this one
// Start or reuse a conversation for a given item


// Replace the existing openChat function with this one
// Replace the existing openChat function with this one
 async openChat(chatId) {
    const convo = this.conversations.find((c) => c.id === chatId) || { id: chatId };
    this.activeConversation = convo;

    document.querySelector('.chat-container')?.classList.add('chat-active');
    const me = this.auth?.currentUser;

    const chatUserName = document.getElementById('chatUserName');
    const chatUserStatus = document.getElementById('chatUserStatus');
    const chatInputContainer = document.getElementById('chatInputContainer');

    if (chatUserName) {
      
      const otherUid = (convo.participants || []).find((p) => p !== me?.uid);
      
      let name = 'Chat'; // Default name
      if (otherUid) {
          name = convo.participantNames?.[otherUid]
               || convo.participantEmails?.[otherUid]
               || convo.sellerEmail;
      }
      chatUserName.textContent = name;
      
      const chatAvatar = document.querySelector('.chat-avatar');
      if (chatAvatar) {
        let initials = '👤';
        if (name && name !== 'Chat' && name.trim().length > 0) {
          const nameParts = name.trim().split(' ');
          const firstInitial = nameParts[0][0] || '';
          const lastInitial = nameParts.length > 1 ? (nameParts[nameParts.length - 1][0] || '') : '';
          initials = `${firstInitial}${lastInitial}`.toUpperCase();
        }
        chatAvatar.textContent = initials;
      }
    }
    
    if (chatUserStatus) chatUserStatus.innerHTML = '<div style = " justify-content : left"class="status-indicator active"><span class="status-dot"></span><span class="status-text">Online</span></div>';
    if (chatInputContainer) chatInputContainer.classList.remove('hidden');

    if (me && this.db && this.modules?.doc && this.modules?.setDoc) {
      const { doc, setDoc } = this.modules;
      const convoRef = doc(this.db, 'conversations', chatId);
      try {
        // Update the unread count for *this* user to 0
        await setDoc(convoRef, {
          unreadCounts: {
            [me.uid]: 0 // Set *my* count to 0
          }
        }, { merge: true }); // 'merge: true' is critical so we don't wipe out the other user's count
      } catch (error) {
        console.warn("Could not clear unread count:", error);
      }
    }

    // Subscribe to active conversation doc and messages; update UI for sold state
    this.subscribeActiveConversation(chatId);
    this.subscribeMessages(chatId);
    this.updateSoldUI();
  }

  subscribeActiveConversation(conversationId) {
    if (!this.db || !this.modules?.onSnapshot) return;
    const { doc, onSnapshot } = this.modules;
    const convRef = doc(this.db, 'conversations', conversationId);
    if (this.unsubActiveConvo) { this.unsubActiveConvo(); this.unsubActiveConvo = null; }
    this.unsubActiveConvo = onSnapshot(convRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      this.activeConversation = { id: conversationId, ...data };
      this.updateSoldUI();

      // REMOVE: The following block is now removed since points are awarded proactively:
      /*
      const me = this.auth?.currentUser;
      if (data.itemSold && data.soldToId && me && data.soldToId === me.uid && !data.buyerAwarded) {
        this.awardBuyerPoints(conversationId);
      }
      */
    });
  }
  
  async updateSoldUI() {
    const convo = this.activeConversation || {};
    const me = this.auth?.currentUser;
    const isSeller = me && convo.sellerId === me.uid;
    
    // --- NEW: Check the database directly for the item's status ---
    let isItemSoldInDB = false;
    if (convo.itemId && this.db && this.modules?.doc && this.modules?.getDoc) {
        try {
            const { doc, getDoc } = this.modules;
            const itemRef = doc(this.db, 'items', String(convo.itemId));
            const itemSnap = await getDoc(itemRef);
            if (itemSnap.exists() && itemSnap.data().status === 'sold') {
                isItemSoldInDB = true;
            }
        } catch (e) {
            console.error("Failed to fetch item status:", e);
        }
    }
    
    // The 'sold' status is true if EITHER the conversation says so OR the database confirms it.
    const sold = !!convo.itemSold || isItemSoldInDB;

    const btn = document.getElementById('markAsSoldBtn');
    const messages = document.getElementById('chatMessages');

    if (btn) {
      if (isSeller) {
        btn.style.display = 'inline-flex';
        
        if (sold) {
          btn.textContent = 'This Item Has Been Sold'; 
          btn.disabled = true;
          btn.classList.remove('btn--primary');
          btn.classList.add('btn--outline');
        } else {
          btn.textContent = 'Mark as Sold';
          btn.disabled = false;
          btn.classList.add('btn--primary');
          btn.classList.remove('btn--outline');
        }
      } else {
        btn.style.display = 'none';
      }
    }
    
    const input = document.getElementById('chatInput');
    const send = document.getElementById('chatSendBtn');

    if (sold) {
      if (input) input.disabled = true;
      if (send) send.disabled = true;
      
      if (messages && !messages.querySelector('.sold-banner')) {
        const div = document.createElement('div');
        div.className = 'sold-banner';
        div.style.cssText = 'text-align:center;color:#ff6b6b;margin:8px 0;opacity:0.9;';
        div.textContent = 'This item has been sold';
        messages.prepend(div);
      }
    } else {
      if (input) input.disabled = false;
      if (send) send.disabled = false;
      const banner = messages?.querySelector('.sold-banner');
      if (banner) banner.remove();
    }
}

  getOtherParticipantEmail() {
    const me = this.auth?.currentUser;
    const convo = this.activeConversation || {};
    if (!convo.participantEmails || !convo.participants) return '';
    const otherUid = (convo.participants || []).find((p) => p !== me?.uid);
    return convo.participantEmails[otherUid] || '';
  }

async awardPoints(userId) {
    // This is the common function to award points to any user (buyer or seller)
    try {
      if (!userId || !this.db || !this.modules) return;
      // Destructure modules, ensuring increment and setDoc are available
      const { doc, setDoc, increment } = this.modules;
      if (!increment || !setDoc) {
        throw new Error("Firebase modules for atomic update are missing.");
      }
      
      const userRef = doc(this.db, 'users', userId);

      // CRITICAL FIX: Use setDoc with merge: true and increment. 
      // This is the most robust operation: it will create the 'users' document 
      // if it doesn't exist and then successfully apply the 5 point increment.
      await setDoc(userRef, { points: increment(5) }, { merge: true });

    } catch (e) {
      console.error('Failed to award points to user:', userId, e);
      // Re-throw the error so markItemAsSold can catch it and display a warning/error.
      throw e; 
    }
  }


// app.js

async markItemAsSold() {
    const me = this.auth?.currentUser;
    const convo = this.activeConversation || {};
    const markAsSoldBtn = document.getElementById('markAsSoldBtn');

    if (!me || !convo?.id || !this.db || !this.modules || !markAsSoldBtn) return;
    
    if (convo.itemSold || markAsSoldBtn.disabled) {
        utils.showNotification('Item is already marked as sold.', 'warning');
        return;
    }
    
    const originalText = markAsSoldBtn.textContent;
    markAsSoldBtn.disabled = true;
    markAsSoldBtn.textContent = 'Processing...';

    const buyerId = convo.buyerId || (convo.participants || []).find((p) => p !== me.uid);
    if (!buyerId) {
        utils.showNotification('Cannot determine buyer', 'error');
        markAsSoldBtn.disabled = false;
        markAsSoldBtn.textContent = originalText;
        return;
    }

    const { doc, updateDoc, query, where, collection, getDocs, serverTimestamp, addDoc } = this.modules;

    let criticalFailed = false;
    let warnings = [];
    const itemTitle = convo.itemTitle || 'Item';
    const price = convo.itemPrice || null;

    // 1) Update item status to sold (critical)
    try {
        if (convo.itemId) {
            const itemRef = doc(this.db, 'items', String(convo.itemId));
            await updateDoc(itemRef, { status: 'sold', soldToId: buyerId, updatedAt: serverTimestamp() });
        }
    } catch (e) {
        criticalFailed = true;
        console.error('Item status update failed:', e);
    }

    // 2) Award points to BOTH seller and buyer
    let sellerAwardedSuccessfully = false;
    let buyerAwardedSuccessfully = false;
    if (!criticalFailed) {
        try {
            await this.awardPoints(me.uid);
            sellerAwardedSuccessfully = true;
        } catch (e) { warnings.push('Seller point award failed.'); }
        try {
            await this.awardPoints(buyerId);
            buyerAwardedSuccessfully = true;
        } catch (e) { warnings.push('Buyer point award failed.'); }
    }

    // 3) Update all related conversations
    const updatePayload = { itemSold: true, soldToId: buyerId, soldAt: serverTimestamp() };
    try {
        if (convo.itemId) {
            const convRef = collection(this.db, 'conversations');
            const q = query(convRef, where('itemId', '==', String(convo.itemId)));
            const snap = await getDocs(q);
            const updates = snap.docs.map(d => updateDoc(d.ref, updatePayload));
            await Promise.allSettled(updates);
        } else {
            await updateDoc(doc(this.db, 'conversations', convo.id), updatePayload);
        }
        this.activeConversation = { ...this.activeConversation, ...updatePayload };
    } catch (e) {
        warnings.push('Conversation state update encountered issues.');
    }
    
    // 4) Create transaction records
    if (!criticalFailed) {
        const txRef = collection(this.db, 'transactions');
        const transactionPromises = [];

        // Seller Transaction: Assigned to the SELLER
        transactionPromises.push(addDoc(txRef, {
            userId: me.uid, // <-- Correctly uses the seller's ID
            type: 'sale',
            itemId: String(convo.itemId || ''),
            itemTitle,
            price,
            counterpartId: buyerId,
            createdAt: serverTimestamp(),
            pointsAwarded: sellerAwardedSuccessfully ? 5 : 0
        }));
      
        // Buyer Transaction: Assigned to the BUYER
        transactionPromises.push(addDoc(txRef, { 
            userId: buyerId, // <-- Correctly uses the buyer's ID
            type: 'purchase',
            itemId: String(convo.itemId || ''),
            itemTitle,
            price,
            counterpartId: me.uid,
            createdAt: serverTimestamp(),
            pointsAwarded: buyerAwardedSuccessfully ? 5 : 0
        }));
      
        await Promise.allSettled(transactionPromises);
    }

    // 5) Final Notification and UI Cleanup
    if (criticalFailed) {
        markAsSoldBtn.disabled = false;
        markAsSoldBtn.textContent = originalText;
        utils.showNotification('Failed to mark item as sold. Please try again.', 'error');
    } else {
        utils.showNotification('Item marked as sold! Points awarded. 🎉', 'success');
        this.updateSoldUI();
    }
}

  subscribeMessages(conversationId) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages || !this.db || !this.modules?.onSnapshot) return;

    chatMessages.innerHTML = '';

    if (this.unsubMessages) this.unsubMessages();

    const { collection, onSnapshot, query, orderBy } = this.modules;
    const msgsRef = collection(this.db, 'conversations', conversationId, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));

    this.unsubMessages = onSnapshot(q, (snapshot) => {
      chatMessages.innerHTML = '';
      snapshot.forEach((doc) => {
        const m = doc.data();
        const mine = m.senderId === this.auth?.currentUser?.uid;
        const el = document.createElement('div');
        el.className = `message ${mine ? 'sent' : 'received'}`;
        el.innerHTML = `
          <div class="message-text">${m.text || ''}</div>
          <div class="message-time">${m.createdAt?.toDate?.()?.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) || ''}</div>
        `;
        chatMessages.appendChild(el);
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, (error) => {
      console.error('Failed to subscribe to messages:', error);
    });
  }

// Replace the entire bindEvents method in the Chat class
  bindEvents() {
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatInput = document.getElementById('chatInput');
    const chatFilters = document.querySelector('.chat-filters'); // Get the filter container
    const markAsSoldBtn = document.getElementById('markAsSoldBtn');

    if (markAsSoldBtn) {
      markAsSoldBtn.addEventListener('click', () => {
        const buyerEmail = this.getOtherParticipantEmail();
        const span = document.getElementById('soldBuyerEmail');
        if (span) span.textContent = buyerEmail || 'this user';
        document.getElementById('markSoldModal')?.classList.remove('hidden');
      });
    }

    // Handle sending a message
    if (chatSendBtn && chatInput) {
      chatSendBtn.addEventListener('click', () => this.sendMessage());
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }
    
    // NEW: Handle clicks on the filter buttons
    if (chatFilters) {
      chatFilters.addEventListener('click', (e) => {
        const target = e.target.closest('.chat-filter-btn');
        if (!target) return;

        // Get the filter from the button's data attribute
        this.activeFilter = target.dataset.filter;

        // Update the active class on the UI
        chatFilters.querySelectorAll('.chat-filter-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        target.classList.add('active');

        // Re-render the list with the new filter
        this.renderConversationList();
      });
    }
  }

 async sendMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;

    const convo = this.activeConversation;
    if (!convo?.id) return;

    const user = this.auth?.currentUser;
    if (!user) {
      utils.showNotification('Please sign in to send messages', 'error');
      return;
    }

    const chatMessages = document.getElementById('chatMessages');
    // Optimistic UI: append the message immediately
    if (chatMessages) {
      const welcome = chatMessages.querySelector('.welcome-message');
      if (welcome) welcome.remove();
      const el = document.createElement('div');
      el.className = 'message sent';
      const now = new Date();
      el.innerHTML = `
        <div class="message-text">${text}</div>
        <div class="message-time">${now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
      `;
      chatMessages.appendChild(el);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- START MODIFICATION ---
    // Get 'increment' and 'setDoc' from modules
    const { collection, addDoc, serverTimestamp, doc, setDoc, increment } = this.modules;
    // --- END MODIFICATION ---

    const msgsRef = collection(this.db, 'conversations', convo.id, 'messages');

    // Send the message first (critical)
    try {
      await addDoc(msgsRef, {
        senderId: user.uid,
        text,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Failed to send message:', e);
      utils.showNotification('Message failed. Please try again.', 'error');
      return;
    }

    // Update convo metadata (non-critical)
    try {
      // --- START: NEW LOGIC ---
      // Find the *other* user
      const otherUid = (convo.participants || []).find(p => p !== user.uid);
      
      let updateData = {
        lastMessage: text,
        lastMessageAt: serverTimestamp()
      };

      // If we found the other user, increment their unread count
      if (otherUid && increment) {
        // We will store unread counts in a map: { userId1: 2, userId2: 0 }
        updateData.unreadCounts = {
          [otherUid]: increment(1)
        };
      }
      // --- END: NEW LOGIC ---

      const convRef = doc(this.db, 'conversations', convo.id);
      
      // --- MODIFICATION: Use setDoc + merge for safety ---
      // This will create or update the 'unreadCounts' map safely
      await setDoc(convRef, updateData, { merge: true });
      
    } catch (e) {
      console.warn('Message sent, but failed to update conversation metadata:', e);
    }

    chatInput.value = '';
  }
 
}

class Profile {
  init() {
    this.loadData();
    this.bindEvents();
    // Attach event listeners for password change modal buttons (as they are outside the class scope)
    document.getElementById("changePasswordBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        this.openChangePasswordModal();
    });
    document.getElementById("saveChangePassword")?.addEventListener("click", (e) => {
        e.preventDefault();
        this.savePasswordChange();
    });
  }

  // Binds clicks to all the interactive elements in the profile section
  bindEvents() {
    const avatarEditBtn = document.querySelector(".avatar-edit");
    const saveEditNameBtn = document.getElementById("saveEditName");
    const cancelEditNameBtn = document.getElementById("cancelEditName");
    const logoutBtn = document.getElementById("logoutBtn");
    const deleteAccountBtn = document.getElementById("deleteAccountBtn");
    const settingsHelpBtn = document.getElementById("settingsHelpBtn");
    const changePasswordBtn = document.getElementById("changePasswordBtn");
    const notificationSettingsBtn = document.getElementById(
      "notificationSettingsBtn"
    );

    // NEW: Make the pencil icon open the Edit Name modal
    if (avatarEditBtn) {
      avatarEditBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openEditNameModal();
      });
    }

    // Save the new name when "Save" is clicked in the modal
    if (saveEditNameBtn) {
      saveEditNameBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await this.saveEditedName();
      });
    }

    // Close the modal when "Cancel" is clicked
    if (cancelEditNameBtn) {
      cancelEditNameBtn.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("editNameModal")?.classList.add("hidden");
      });
    }

    // Handle logout
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.logout();
      });
    }

    // Handle delete account (open confirm modal)
    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const modal = document.getElementById("deleteAccountModal");
        modal?.classList.remove("hidden");
      });
    }

    if (notificationSettingsBtn) {
      notificationSettingsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // utils.showNotification("Notification settings coming soon!", "info"); // <-- OLD
        
        // NEW LOGIC:
        window.notifications?.loadNotifications(); // Load data
        switchToSection("notifications"); // Switch view
      });
    }
  }

  // ... (Keep openEditNameModal and saveEditedName methods as they are) ...
  openEditNameModal() {
    const modal = document.getElementById("editNameModal");
    if (!modal) return;
    const userData = window.userSession?.getUserData?.() || {};
    document.getElementById("editFirstName").value = userData.firstName || "";
    document.getElementById("editLastName").value = userData.lastName || "";
    modal.classList.remove("hidden");
  }

  async saveEditedName() {
    const firstName = document.getElementById("editFirstName").value.trim();
    const lastName = document.getElementById("editLastName").value.trim();
    const fullName = `${firstName} ${lastName}`.trim();

    if (!fullName) {
      utils.showNotification("Please enter a name.", "warning");
      return;
    }
    try {
      if (window.userSession?.updateUserData) {
        await window.userSession.updateUserData({ firstName, lastName });
      }
      const user = window.firebaseAuth?.currentUser;
      if (user && window.firebaseModules?.updateProfile) {
        await window.firebaseModules.updateProfile(user, {
          displayName: fullName,
        });
      }
      document.getElementById("profileDisplayName").textContent = fullName;
      utils.showNotification("Name updated successfully!", "success");
      document.getElementById("editNameModal").classList.add("hidden");
    } catch (error) {
      utils.showNotification(
        "Could not update name. Please try again.",
        "error"
      );
    }
  }

  // ... (Keep openChangePasswordModal and savePasswordChange methods as they are) ...
  openChangePasswordModal() {
    const user = window.firebaseAuth?.currentUser;
    if (!user) {
      utils.showNotification("Please sign in to continue.", "error");
      return;
    }

    const isPasswordProvider = user.providerData.some(
      (provider) => provider.providerId === "password"
    );

    if (!isPasswordProvider) {
      utils.showNotification(
        "Accounts created with Google manage their password via Google.",
        "info"
      );
      return;
    }

    const modal = document.getElementById("changePasswordModal");
    if (modal) {
      document.getElementById("changePasswordForm")?.reset();
      modal.classList.remove("hidden");
    }
  }

  async savePasswordChange() {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmNewPassword =
      document.getElementById("confirmNewPassword").value;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      utils.showNotification("Please fill out all fields.", "warning");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      utils.showNotification("New passwords do not match.", "error");
      return;
    }
    if (newPassword.length < 6) {
      utils.showNotification(
        "Password must be at least 6 characters.",
        "warning"
      );
      return;
    }

    const user = window.firebaseAuth?.currentUser;
    if (!user) {
      utils.showNotification("You must be logged in.", "error");
      return;
    }

    const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } =
      window.firebaseModules;
    if (
      !EmailAuthProvider ||
      !reauthenticateWithCredential ||
      !updatePassword
    ) {
      utils.showNotification("Error: Auth features not available.", "error");
      return;
    }

    const saveButton = document.getElementById("saveChangePassword");
    saveButton.disabled = true;
    saveButton.textContent = "Updating...";

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      utils.showNotification("Password updated successfully!", "success");
      document.getElementById("changePasswordModal").classList.add("hidden");
    } catch (error) {
      let msg = "Failed to update password.";
      if (error.code === "auth/wrong-password")
        msg = "Incorrect current password.";
      else if (error.code === "auth/too-many-requests")
        msg = "Too many attempts. Try again later.";
      utils.showNotification(msg, "error");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Update Password";
    }
  }

  // ... (Keep logout and deleteAccount methods as they are) ...
  logout() {
    if (window.userSession?.logout) {
      utils.showNotification("Logging you out...", "info");
      window.userSession.logout();
    }
  }

  // Permanently delete the user's account and their listings
  async deleteAccount() {
    try {
      const user = window.firebaseAuth?.currentUser;
      if (!user) {
        utils.showNotification('No user signed in.', 'error');
        return;
      }

      utils.showNotification('Deleting your account...', 'warning');

      const { collection, query, where, getDocs, doc, updateDoc, deleteDoc } = window.firebaseModules || {};
      const db = window.firebaseDb;

      // 1) Soft-delete all items owned by the user (so they disappear from public listings)
      if (db && collection && query && where && getDocs && doc && updateDoc) {
        try {
          const itemsRef = collection(db, 'items');
          const q = query(itemsRef, where('sellerId', '==', user.uid));
          const snap = await getDocs(q);
          const updates = [];
          snap.forEach((d) => {
            const itemRef = doc(db, 'items', d.id);
            updates.push(updateDoc(itemRef, { status: 'removed', updatedAt: new Date().toISOString() }));
          });
          await Promise.allSettled(updates);
        } catch (e) {
          console.warn('Failed to soft-delete items during account deletion:', e);
        }
      }

      // 2) Delete the user profile document
      if (db && doc && deleteDoc) {
        try {
          await deleteDoc(doc(db, 'users', user.uid));
        } catch (e) {
          console.warn('Failed to delete user profile document:', e);
        }
      }

      // 3) Delete the Auth user
      if (window.firebaseModules?.deleteUser) {
        try {
          await window.firebaseModules.deleteUser(user);
        } catch (e) {
          // Requires recent login
          console.error('Failed to delete auth user:', e);
          utils.showNotification('Please re-login and try deleting again (recent sign-in required).', 'error');
          return;
        }
      }

      // 4) Clear local storage and redirect
      try {
        localStorage.removeItem('user_profile');
        localStorage.removeItem('marketplace_items');
      } catch {}

      utils.showNotification('Account deleted. Goodbye!', 'success');
      setTimeout(() => {
        window.location.href = 'auth.html';
      }, 800);
    } catch (err) {
      console.error('Account deletion failed:', err);
      utils.showNotification('Failed to delete account. Please try again.', 'error');
    }
  }


  loadData() {
    this.updateDisplayName(); // New method to ensure name/email are correct
    this.updateStats();
    this.loadMyListings();
    this.loadHeartedPosts();
    this.loadTransactionHistory();
  }
  
  updateDisplayName() {
    const user = window.firebaseAuth?.currentUser;
    const userData = window.userSession?.getUserData?.() || {};
    const displayNameEl = document.getElementById("profileDisplayName");
    const emailEl = document.getElementById("profileDisplayEmail");
    
    if(displayNameEl) {
        displayNameEl.textContent = userData.displayName || user?.displayName || 'CampusKart User';
    }
    if(emailEl) {
        emailEl.textContent = user?.email || 'N/A';
    }
  }

  // CRITICAL FIX: Ensure all 3 stats are updated here.
updateStats(transactionCount, moneySaved) {
    const userData = window.userSession?.getUserData?.() || {};
    const currentPoints = userData.points || 0;

    // --- 1. POINTS ---
    utils.animateValue(
      document.getElementById("userPoints"),
      0,
      currentPoints,
      1000
    );
    
    // --- 2. TOTAL TRANSACTIONS (Now reliable) ---
    utils.animateValue(
      document.getElementById("totalTransactions"),
      0,
      transactionCount, // <-- USES THE RELIABLE COUNT PASSED AS AN ARGUMENT
      1000
    );

    // --- 3. MONEY SAVED (Now reliable) ---
    utils.animateValue(
      document.getElementById("moneySaved"),
      0,
      moneySaved, // <-- USES THE RELIABLE VALUE PASSED AS AN ARGUMENT
      1000,
      (val) => `₹${utils.formatPrice(val).replace('₹', '')}`
    );
    
    // Update the points progress bar
    const pointsProgress = document.getElementById("pointsProgress");
    const progressText = document.getElementById("progressText");
    const requiredForBoost = 25;
    
    if (pointsProgress && progressText) {
        const progressPercent = Math.min((currentPoints / requiredForBoost) * 100, 100);
        pointsProgress.style.width = `${progressPercent}%`;
        progressText.textContent = `${currentPoints} / ${requiredForBoost} Points (Next Boost)`;
    }
}

  // ... (Keep loadMyListings, loadHeartedPosts, and loadTransactionHistory as they are) ...
  loadMyListings() {
    const myListingsContainer = document.getElementById("myListings");
    const emptyNotice = document.querySelector(".my-listings .empty-notice");
    if (!myListingsContainer || !emptyNotice) return;

    const currentUser =
      window.userSession?.getCurrentUser?.() ||
      window.firebaseAuth?.currentUser;
    if (!currentUser) {
      myListingsContainer.innerHTML = `<div class="empty-state"><p>Please log in to see your listings.</p></div>`;
      emptyNotice.style.display = "block";
      return;
    }

    const userListings = AppState.originalItems.filter(
      (item) => item.sellerId === currentUser.uid
    );

    myListingsContainer.innerHTML = "";

    if (userListings.length === 0) {
      myListingsContainer.innerHTML = `
        <div class="empty-state">
            <p>🛍️ You haven't posted anything yet. Start selling to see your items here!</p>
        </div>
      `;
      emptyNotice.style.display = "block";
    } else {
      emptyNotice.style.display = "none";
      userListings.forEach((item) => {
        const listingCard = document.createElement("div");
        listingCard.className = "compact-item-card";

        const firstImage =
          item.images && item.images.length > 0 ? item.images[0] : null;

        listingCard.innerHTML = `
            <div class="compact-item-visual">
              ${
                firstImage
                  ? `<img src="${firstImage}" alt="${item.title}" class="compact-item-image">`
                  : `<div class="compact-item-icon">${item.icon || "📦"}</div>`
              }
            </div>
            <h4 class="compact-item-title">${item.title}</h4>
            <p class="compact-item-price">${utils.formatPrice(item.price)}</p>
        `;
        
       
        listingCard.addEventListener('click', () => {
          // Update URL for sharing
          const newUrl = `${window.location.pathname}?item=${item.id}`;
          window.history.pushState({ itemId: item.id }, `Item ${item.id}`, newUrl);
          
          // Show the item detail page
          window.itemDetail?.showById?.(item.id);
        });
        

        myListingsContainer.appendChild(listingCard);
      });
    }
  }

  loadHeartedPosts() {
    const heartedPostsContainer = document.getElementById("heartedPosts");
    if (!heartedPostsContainer) return;

    heartedPostsContainer.innerHTML = "";

    if (AppState.userProfile.heartedPosts.length === 0) {
      heartedPostsContainer.innerHTML = `
          <div class="empty-state">
              <p>💖 Items you heart will appear here</p>
          </div>
      `;
      return;
    }

    AppState.userProfile.heartedPosts.forEach((itemId) => {
      const item = AppState.originalItems.find((i) => i.id === itemId);
      if (!item) return;

      const heartedCard = document.createElement("div");
      heartedCard.className = "compact-item-card";

      const firstImage =
        item.images && item.images.length > 0 ? item.images[0] : null;

      heartedCard.innerHTML = `
        <div class="compact-item-visual">
          ${
            firstImage
              ? `<img src="${firstImage}" alt="${item.title}" class="compact-item-image">`
              : `<div class="compact-item-icon">${item.icon || "📦"}</div>`
          }
        </div>
        <h4 class="compact-item-title">${item.title}</h4>
        <p class="compact-item-price">${utils.formatPrice(item.price)}</p>
      `;

      heartedCard.addEventListener('click', () => {
        // Update URL for sharing
        const newUrl = `${window.location.pathname}?item=${item.id}`;
        window.history.pushState({ itemId: item.id }, `Item ${item.id}`, newUrl);
        
        // Show the item detail page
        window.itemDetail?.showById?.(item.id);
      });
      heartedPostsContainer.appendChild(heartedCard);
    });
  }



async loadTransactionHistory() {
    const container = document.getElementById('transactionList');
    if (!container) return;
    container.innerHTML = '<h4>Loading Transactions...</h4>';

    try {
        const me = window.firebaseAuth?.currentUser;
        if (!me) throw new Error("User not signed in.");

        const { collection, query, where, orderBy, getDocs, doc, getDoc } = window.firebaseModules;
        const txRef = collection(window.firebaseDb, 'transactions');

        const q = query(txRef, where('userId', '==', me.uid), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const allTransactions = [];
        snapshot.forEach((d) => allTransactions.push({ id: d.id, ...d.data() }));

        let totalMoneySaved = 0;
        // This loop now runs on all fetched transactions
        for (const transaction of allTransactions) {
            if (transaction.type === 'purchase' && transaction.itemId) {
                try {
                    const itemRef = doc(window.firebaseDb, 'items', String(transaction.itemId));
                    const itemSnap = await getDoc(itemRef);
                    if (itemSnap.exists()) {
                        const itemData = itemSnap.data();
                        if (itemData.originalPrice && itemData.price) {
                            const savings = itemData.originalPrice - itemData.price;
                            if (savings > 0) totalMoneySaved += savings;
                        }
                    }
                } catch (e) {
                    console.warn(`Could not fetch details for sold item ${transaction.itemId}:`, e);
                }
            }
        }

        if (allTransactions.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No transactions yet.</p></div>`;
            this.updateStats(0, 0); // <-- UPDATE STATS WITH 0s
            return;
        }

        // Render the list
        const html = allTransactions.map((t) => {
            const isPurchase = t.type === 'purchase';
            const when = t.createdAt?.toDate?.()?.toLocaleDateString?.() || 'Just now';
            const label = isPurchase ? 'Purchased' : 'Sold';
            const points = (t.pointsAwarded === 5) ? '+5' : '';
            const typeClass = isPurchase ? 'purchase' : 'sale';
            return `
              <div class="transaction-item transaction-${typeClass}">
                <div class="transaction-info">
                  <div class="transaction-type">${label}: ${t.itemTitle || ''}</div>
                  <div class="transaction-date">${when}</div>
                </div>
                <div class="transaction-points">${points}</div>
              </div>
            `;
        }).join('');
        container.innerHTML = html;

        // Finally, update the stats with the correct, calculated data
        this.updateStats(allTransactions.length, totalMoneySaved);

    } catch (e) {
        console.error('Failed to load transactions:', e);
        container.innerHTML = `<div class="empty-state"><p>Failed to load transactions.</p></div>`;
        this.updateStats(0, 0); // <-- UPDATE STATS WITH 0s ON ERROR
    }
}
}

class Help {
  init() {
    console.log("Help section initialized.");
  }
}

class ItemDetail {
  constructor() {
    this.currentItemId = null;
  }

  init() {
    const backBtn = document.getElementById('backToMarketplace');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.pushState({ section: 'marketplace' }, 'Marketplace', window.location.pathname);
        switchToSection('marketplace');
      });
    }

    const contactBtn = document.getElementById('detailContactBtn');
    if (contactBtn) {
      contactBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.currentItemId != null) {
          window.marketplace?.contactSeller?.(this.currentItemId);
        }
      });
    }

    const copyBtn = document.getElementById('copyUrlBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Pass the button element itself for visual feedback
        this.copyItemUrl(copyBtn);
      });
    }
  }

  copyItemUrl(buttonElement) {
    // This gets the full URL, including the ?item=... query parameter
    const urlToCopy = window.location.href;
    
    // Use the modern clipboard API
    navigator.clipboard.writeText(urlToCopy).then(() => {
      // Success!
      // Show your custom notification
      utils.showNotification('Link copied to clipboard!', 'success');
      
      // Temporarily change button text for more feedback
      const originalText = buttonElement.innerHTML;
      buttonElement.innerHTML = 'Copied! ✅';
      buttonElement.disabled = true;
      
      // Revert button text after 2.5 seconds
      setTimeout(() => {
        buttonElement.innerHTML = originalText;
        buttonElement.disabled = false;
      }, 2500);
      
    }).catch(err => {
      // Failure
      console.error('Failed to copy URL: ', err);
      utils.showNotification('Could not copy link.', 'error');
    });
  }

showById(itemId) {
    const item = AppState.originalItems.find((i) => String(i.id) === String(itemId));
    if (!item) {
      utils.showNotification('Item not found', 'error');
      return;
    }

    this.currentItemId = item.id;

    // Get all UI elements
    const titleEl = document.getElementById('detailTitle');
    const nameEl = document.getElementById('detailName');
    const sellerEl = document.getElementById('detailSeller');
    const priceEl = document.getElementById('detailPrice');
    const statusEl = document.getElementById('detailStatus');
    const descEl = document.getElementById('detailDescription');
    
    // --- Image Gallery Elements ---
    const mainImgEl = document.getElementById('detailMainImage');
    const emojiEl = document.getElementById('detailEmoji');
    const thumbnailsEl = document.getElementById('detailThumbnails');
    
    // --- Set Text Details ---
    if (titleEl) titleEl.textContent = 'Item Details';
    if (nameEl) nameEl.textContent = item.title || '';
    if (sellerEl) sellerEl.textContent = item.sellerName || 'Anonymous';
    if (priceEl) priceEl.textContent = utils.formatPrice(item.price || 0);
    if (statusEl) statusEl.textContent = item.condition || '';
    if (descEl) descEl.textContent = item.description || '';

    // --- Image Gallery Logic ---
    const allImages = Array.isArray(item.images) && item.images.length > 0 ? item.images : [];
    
    if (thumbnailsEl) thumbnailsEl.innerHTML = ''; // Clear old thumbnails

    if (allImages.length > 0) {
      // We have images
      if (mainImgEl) {
        mainImgEl.src = allImages[0]; // Set main image to the first one
        mainImgEl.style.display = 'block';
      }
      if (emojiEl) emojiEl.style.display = 'none';
      if (thumbnailsEl) thumbnailsEl.style.display = 'flex';

      // Create thumbnails
      allImages.forEach((imgUrl, index) => {
        const thumbImg = document.createElement('img');
        thumbImg.src = imgUrl;
        thumbImg.alt = `${item.title} thumbnail ${index + 1}`;
        thumbImg.className = 'detail-thumbnail-img';
        
        if (index === 0) {
          thumbImg.classList.add('active'); // Active state for the first one
        }

        // Add click listener to change main image
        thumbImg.addEventListener('click', () => {
          if (mainImgEl) mainImgEl.src = imgUrl;
          
          // Update active class
          thumbnailsEl.querySelectorAll('.detail-thumbnail-img').forEach(img => {
            img.classList.remove('active');
          });
          thumbImg.classList.add('active');
        });
        
        if (thumbnailsEl) thumbnailsEl.appendChild(thumbImg);
      });

    } else {
      // No images, show emoji
      if (mainImgEl) mainImgEl.style.display = 'none';
      if (emojiEl) {
        emojiEl.style.display = 'flex';
        emojiEl.textContent = item.icon || '📦';
      }
      if (thumbnailsEl) thumbnailsEl.style.display = 'none';
    }

    switchToSection('itemDetail');
  }
}

class Notifications {
  constructor() {
    this.container = document.getElementById("notificationListContainer");
    this.db = window.firebaseDb;
    this.modules = window.firebaseModules;
  }

  init() {
    const backBtn = document.getElementById("backToProfileBtn");
    if (backBtn) {
      backBtn.addEventListener("click", (e) => {
        e.preventDefault();
        switchToSection("profile");
      });
    }
  }

async loadNotifications() {
    // --- FIX: Grab the database and modules here, not in the constructor ---
    this.db = window.firebaseDb;
    this.modules = window.firebaseModules;
    // -----------------------------------------------------------------
    
    if (!this.container) return;
    if (!this.db || !this.modules) {
      this.container.innerHTML = `<div class="empty-state"><p>Error: Could not connect to database.</p></div>`;
      return;
    }

    this.container.innerHTML = `<div class="empty-state"><p>Loading notifications...</p></div>`;

    const { collection, query, orderBy, getDocs } = this.modules;

    try {
      const annRef = collection(this.db, "announcements");
      const q = query(annRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        this.container.innerHTML = `<div class="empty-state"><p>No new notifications from the admin team.</p></div>`;
        return;
      }

      const notifications = [];
      snapshot.forEach((doc) => {
        notifications.push(doc.data());
      });

      this.renderNotifications(notifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
      // --- FIX: Display the real Firebase error for easier debugging ---
      if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
         this.container.innerHTML = `<div class="empty-state"><p>Security Error: Could not load notifications. (Check Firestore Rules)</p></div>`;
      } else {
         this.container.innerHTML = `<div class="empty-state"><p>Failed to load notifications.</p></div>`;
      }
    }
  }

  renderNotifications(notifications) {
    let html = "";
    let currentDate = "";

    const options = { year: 'numeric', month: 'long', day: 'numeric' };

    for (const notif of notifications) {
      const date = notif.createdAt?.toDate?.();
      if (!date) continue;
      
      const dateString = date.toLocaleDateString('en-US', options);

      // If the date is different from the last one, add a new date header
      if (dateString !== currentDate) {
        currentDate = dateString;
        html += `<h3 class="notification-date-header">${currentDate}</h3>`;
      }

  // Add the notification item
      html += `
        <div class="notification-item">
          <p class="notification-message">${this.escapeHtml(notif.message)}</p>
          <span class="notification-meta">Posted by Team CampusKart</span>
        </div>
      `;
    }

    this.container.innerHTML = html;
  }

  escapeHtml(s) { 
    return String(s||'').replace(/[&<>"']/g, (c)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); 
  }
}

function initializeGlobalEventListeners() {
  document.body.addEventListener("click", async (e) => {
    const target = e.target;
    const modal = target.closest(".modal");

    if (target.closest("#reportItemBtn")) {
      e.preventDefault();
      if (window.itemDetail?.currentItemId && window.firebaseDb && window.firebaseModules) {
        if (!confirm("Are you sure you want to report this item to a moderator?")) {
          return;
        }
        
        const { doc, updateDoc, serverTimestamp } = window.firebaseModules;
        const itemRef = doc(window.firebaseDb, 'items', window.itemDetail.currentItemId);
        
        try {
          await updateDoc(itemRef, { 
            flagged: true, 
            flagReason: 'user_reported',
            updatedAt: serverTimestamp() 
          });
          utils.showNotification('Item reported. A moderator will review it shortly.', 'success');
          // Send user back to marketplace
          window.history.pushState({ section: 'marketplace' }, 'Marketplace', window.location.pathname);
          switchToSection('marketplace');
        } catch (err) {
          console.error("Failed to report item:", err);
          utils.showNotification('Could not report item. Please try again.', 'error');
        }
      }
    }

    // --- Modal Close Buttons ---
    if (
      target.id === "cancelEditName" ||
      target.id === "cancelChangePassword" ||
      target.id === "closeModal" ||
      target.id === "cancelRemove" ||
      target.id === "cancelBoost" ||
      target.id === "closeTermsModal" ||
      target.id === "cancelDeleteAccount" || // Merged
      target.classList.contains("modal-overlay")
    ) {
      if (modal) {
        modal.classList.add("hidden");
        document.body.classList.remove('modal-open');
      }
    }

    if (target.closest("#settingsHelpBtn")) {
      e.preventDefault();
      switchToSection('help');
    }

    // --- Profile Page Actions (Merged from master) ---
    if (target.closest(".avatar-edit") || target.closest("#editNameBtn")) {
      e.preventDefault();
      window.profile.openEditNameModal();
    }
    if (target.closest("#saveEditName")) {
      e.preventDefault();
      await window.profile.saveEditedName();
    }
    if (target.closest("#changePasswordBtn")) {
      e.preventDefault();
      window.profile.openChangePasswordModal();
    }
    if (target.closest("#saveChangePassword")) {
      e.preventDefault();
      await window.profile.savePasswordChange();
    }
    if (target.closest("#logoutBtn")) {
      e.preventDefault();
      window.profile.logout();
    }

    // --- Modal Confirmations (Combined) ---
    if (target.closest("#confirmRemove")) {
      if (AppState.currentRemoveItemId && window.marketplace) {
        await window.marketplace.removePost(AppState.currentRemoveItemId);
        if (modal) modal.classList.add("hidden");
      }
    }
    if (target.closest("#confirmBoost")) {
      if (AppState.currentBoostItemId && window.marketplace) {
        window.marketplace.boostPost(AppState.currentBoostItemId);
        if (modal) {
            modal.classList.add("hidden");
            document.body.classList.remove('modal-open');
        }
      }
    }
    if (target.closest("#confirmDeleteAccount")) { // Merged
      e.preventDefault();
      if (window.profile?.deleteAccount) {
        await window.profile.deleteAccount();
      }
      if (modal) modal.classList.add("hidden");
    }
    if (target.closest('#confirmMarkSold')) {
      e.preventDefault();
      await window.chat?.markItemAsSold?.();
      if (modal) modal.classList.add('hidden');
    }
    if (target.closest('#cancelMarkSold')) {
      e.preventDefault();
      if (modal) modal.classList.add('hidden');
    }
  });
}

class App {
  constructor() {
    this.navigation = new Navigation();
    this.marketplace = new Marketplace();
    this.postItem = new PostItem();
    this.chat = new Chat();
    this.profile = new Profile();
    this.help = new Help();
    this.itemDetail = new ItemDetail();
    this.notifications = new Notifications();
  }

  // --- APP INITIALIZATION (FIXED) ---
  async init() {
    console.log("Initializing app...");

    window.navigation = this.navigation;
    window.marketplace = this.marketplace;
    window.postItem = this.postItem;
    window.chat = this.chat;
    window.profile = this.profile;
    window.help = this.help;
    window.itemDetail = this.itemDetail;
    window.notifications = this.notifications;

    this.navigation.init();

    // IMPORTANT: Wait for marketplace data to load before initializing other components
    await this.marketplace.init();

    this.postItem.init();
    this.chat.init();
    this.profile.init(); // Now this runs AFTER items are loaded
    this.help.init();
    this.itemDetail.init();
    this.notifications.init()

    this.personalizeHeaders()

    initializeGlobalEventListeners();

    this.handleUrlRouting(); // Check URL on initial load
    this.setupPopstateListener(); // Handle browser back/forward buttons

    document.querySelectorAll(".btn").forEach((btn) => {
      btn.addEventListener("click", (e) => utils.createRipple(e, btn));
    });

    console.log("App initialized successfully");
  }


  // This method checks the URL when the page first loads
  handleUrlRouting() {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('item');
    
    if (itemId) {
      console.log(`URL routing: Found item ID ${itemId}`);
      // App.init() already 'await'ed the item load, so our data is ready
      const itemExists = AppState.originalItems.some(i => String(i.id) === String(itemId));

      if (itemExists) {
        // This function will automatically switch to the itemDetail section
        window.itemDetail.showById(itemId);
      } else {
        console.warn(`Item ${itemId} not found. Clearing URL.`);
        // Clear the bad item ID from the URL
        window.history.replaceState({ section: 'marketplace' }, 'Marketplace', window.location.pathname);
        switchToSection('marketplace');
      }
    } else {
      // No item ID, just show the marketplace (which is the default)
      switchToSection('marketplace');
    }
  }

 
  personalizeHeaders() {
    const titleEl = document.getElementById('marketplace-title');
    const subtitleEl = document.getElementById('marketplace-subtitle');
    
    if (!titleEl || !subtitleEl) return; // Failsafe

    const user = window.userSession?.getCurrentUser?.();
    const userData = window.userSession?.getUserData?.();

    if (user && userData?.displayName) {
      titleEl.textContent = `Welcome back, ${userData.displayName}!`;
      subtitleEl.textContent = "Ready to find your next amazing deal?";
    } else {
      // Default text if user is not logged in
      titleEl.textContent = "Discover Amazing Deals";
      subtitleEl.textContent = "Find everything you need from fellow students";
    }
  }


  // This handles the browser's back/forward buttons
  setupPopstateListener() {
    window.onpopstate = (event) => {
      const state = event.state;
      if (state && state.itemId) {
        // User clicked 'forward' to an item page
        window.itemDetail.showById(state.itemId);
      } else {
        // User clicked 'back' to the marketplace
        switchToSection('marketplace');
      }
    };
  }
}

window.app = new App();
const loadingScreen = new LoadingScreen();
document.addEventListener("DOMContentLoaded", () => {
  loadingScreen.init();
});

const style = document.createElement("style");
style.textContent = `
    @keyframes slideInRight { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideOutRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100px); } }
    .notification-content { display: flex; align-items: center; gap: 8px; }
`;
document.head.appendChild(style);