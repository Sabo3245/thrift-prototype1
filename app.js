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
    email: "student@gmail.com",
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
  chatData: {
    conversations: [
      {
        id: "chat1",
        participantName: "Alex Kumar",
        lastMessage: "Is the MacBook still available?",
        timestamp: "2 hours ago",
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
          {
            text: "Is the MacBook still available?",
            sender: "received",
            time: "3:00 PM",
          },
        ],
      },
      {
        id: "chat2",
        participantName: "Priya Singh",
        lastMessage: "Thanks for the quick delivery!",
        timestamp: "1 day ago",
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
    ],
    activeChat: null,
  },
  currentRemoveItemId: null,
  currentBoostItemId: null,
};

// Sample data with enhanced features
const sampleItems = [
  {
    id: 1,
    title: "Vintage Denim Jacket",
    category: "Clothes",
    condition: "Used",
    price: 1200,
    originalPrice: 2500,
    description: "Perfect condition vintage denim jacket, size M",
    hostel: "Boys",
    images: ["jacket1.jpg"],
    icon: "👕",
    isBoosted: false,
    hearts: 0,
    sellerId: "user1",
    clothingChecklist: {
      quality: "Good",
      detailedCondition: "Minimal wear, no stains",
      age: "1-2 years",
    },
  },
  {
    id: 2,
    title: 'MacBook Pro 13"',
    category: "Electronics",
    condition: "Used",
    price: 85000,
    originalPrice: 120000,
    description: "2019 MacBook Pro, excellent condition, 512GB SSD",
    hostel: "Girls",
    images: ["macbook1.jpg"],
    icon: "💻",
    isBoosted: true,
    hearts: 3,
    sellerId: "user2",
  },
  {
    id: 3,
    title: "Calculus Textbook",
    category: "Books",
    condition: "Used",
    price: 800,
    originalPrice: 1500,
    description: "Engineering Mathematics textbook, minimal highlighting",
    hostel: "Boys",
    images: ["book1.jpg"],
    icon: "📚",
    isBoosted: false,
    hearts: 1,
    sellerId: "user1",
  },
  {
    id: 4,
    title: "Makeup Palette Set",
    category: "Cosmetics",
    condition: "Unused",
    price: 2500,
    originalPrice: 3200,
    description: "Brand new eyeshadow palette, never opened",
    hostel: "Girls",
    images: ["makeup1.jpg"],
    icon: "💄",
    isBoosted: false,
    hearts: 2,
    sellerId: "user3",
  },
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

  // Data persistence
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
    }, 3000);
  },
};

// Global navigation function
function switchToSection(sectionName) {
  console.log("Global switchToSection called:", sectionName);

  // Update active states for navigation tabs
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    const isActive = tab.getAttribute("data-section") === sectionName;
    if (isActive) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // Show/hide sections
  document.querySelectorAll(".section").forEach((section) => {
    if (section.id === sectionName) {
      section.style.display = "block";
      section.classList.add("active");
    } else {
      section.classList.remove("active");
      section.style.display = "none";
    }
  });

  AppState.currentSection = sectionName;

  // Update navigation indicator
  updateNavigationIndicator();

  // Load section-specific data
  if (sectionName === "profile" && window.profile) {
    window.profile.loadData();
  } else if (sectionName === "chat" && window.chat) {
    window.chat.loadConversations();
  }
}

// FIX: This function now uses `offsetLeft` and `transform` for smoother animation
function updateNavigationIndicator() {
  const activeTab = document.querySelector(".nav-tab.active");
  const indicator = document.querySelector(".nav-indicator");
  if (!activeTab || !indicator) return;

  const container = activeTab.parentElement; // .nav-tabs
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }

  const left = activeTab.offsetLeft;
  const width = activeTab.offsetWidth;

  indicator.style.width = width + "px";
  indicator.style.transform = "translateX(" + left + "px)";
  indicator.style.opacity = "1";
}

// Loading Screen Handler
class LoadingScreen {
  constructor() {
    this.loadingScreen = document.getElementById("loadingScreen");
    this.progressFill = document.querySelector(".progress-fill");
    this.loadingText = document.querySelector(".loading-text");
    this.particles = document.querySelectorAll(".particle");
  }

  init() {
    this.startLoading();
    this.animateParticles();
  }

  startLoading() {
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
        this.loadingText.style.animation = "none";
        setTimeout(() => {
          this.loadingText.style.animation =
            "textPulse 1.5s ease-in-out infinite";
        }, 50);
      }

      if (progress >= 100) {
        clearInterval(loadingInterval);
        setTimeout(() => this.hide(), 500);
      }
    }, 100);
  }

  animateParticles() {
    this.particles.forEach((particle, index) => {
      const randomDelay = Math.random() * 2000;
      setTimeout(() => {
        particle.style.animation = `particleFloat 3s ease-in-out infinite ${
          index * 0.5
        }s`;
      }, randomDelay);
    });
  }

  hide() {
    this.loadingScreen.style.animation = "fadeOut 1s ease-out forwards";
    setTimeout(() => {
      this.loadingScreen.style.display = "none";
      document.getElementById("mainApp").classList.remove("hidden");
      window.app.init();
    }, 1000);
  }
}

// Navigation Handler
class Navigation {
  init() {
    console.log("Navigation initialized");
    this.bindEvents();
    updateNavigationIndicator();
  }

  bindEvents() {
    // Add click handlers to navigation tabs
    document.addEventListener("click", (e) => {
      const navTab = e.target.closest(".nav-tab");
      if (navTab) {
        e.preventDefault();
        e.stopPropagation();
        const section = navTab.getAttribute("data-section");
        console.log("Navigation tab clicked:", section);
        switchToSection(section);
        utils.createRipple(e, navTab);
      }

      // Handle FAB button
      const fabButton = e.target.closest("#fabButton");
      if (fabButton) {
        e.preventDefault();
        e.stopPropagation();
        console.log("FAB clicked");
        switchToSection("post");
        utils.createRipple(e, fabButton);
      }
    });

    // Add hover effects
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      tab.addEventListener("mouseenter", () => {
        if (!tab.classList.contains("active")) {
          tab.style.transform = "translateY(-2px)";
          tab.style.background = "rgba(255, 255, 255, 0.08)";
        }
      });

      tab.addEventListener("mouseleave", () => {
        if (!tab.classList.contains("active")) {
          tab.style.transform = "translateY(0)";
          tab.style.background = "";
        }
      });
    });
  }
}

// Marketplace Handler
class Marketplace {
  async init() {
    await this.loadData();
    this.bindEvents();
    this.renderItems();
    this.initScrollLoading();
  }

  async loadData() {
    // Try to load from Firestore first; fall back to local storage/sample data
    const savedProfile = utils.loadFromStorage(
      "user_profile",
      AppState.userProfile
    );
    AppState.userProfile = { ...AppState.userProfile, ...savedProfile };

    try {
      if (window.firebaseDb && window.firebaseModules) {
        const { collection, query, where, orderBy, getDocs } = window.firebaseModules;
        const itemsRef = collection(window.firebaseDb, 'items');
        let items = [];
        try {
          // Primary query: requires composite index (status + createdAt)
          const q = query(
            itemsRef,
            where('status', '==', 'available'),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        } catch (e) {
          // Fallback: query without orderBy if index is missing or any 400 occurs
          const msg = (e?.message || '').toLowerCase();
          if (e?.code === 'failed-precondition' || msg.includes('index')) {
            console.warn('Index not ready; retrying items fetch without orderBy');
            const q2 = query(itemsRef, where('status', '==', 'available'));
            const snapshot2 = await getDocs(q2);
            items = [];
            snapshot2.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
          } else {
            throw e;
          }
        }
        
        AppState.items = [...items];
        AppState.originalItems = [...items];
        AppState.filteredItems = [...items];
        this.calculateMoneySaved();
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch items from Firestore, using local storage fallback:', err);
    }

    // Fallback to local storage or sample data
    const savedItems = utils.loadFromStorage("marketplace_items", sampleItems);
    AppState.items = [...savedItems];
    AppState.originalItems = [...savedItems];
    AppState.filteredItems = [...savedItems];
    this.calculateMoneySaved();
  }

  calculateMoneySaved() {
    let totalSaved = 0;
    AppState.userProfile.heartedPosts.forEach((itemId) => {
      const item = AppState.originalItems.find((i) => i.id === itemId);
      if (item && item.originalPrice) {
        const savings = utils.calculateSavings(item.originalPrice, item.price);
        if (savings) totalSaved += savings;
      }
    });
    AppState.userProfile.moneySaved = totalSaved;
    utils.saveToStorage("user_profile", AppState.userProfile);
  }

  bindEvents() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener(
        "input",
        utils.debounce((e) => {
          AppState.searchQuery = e.target.value.toLowerCase();
          this.filterItems();
        }, 300)
      );
    }

    const categoryFilter = document.getElementById("categoryFilter");
    const conditionFilter = document.getElementById("conditionFilter");
    const hostelFilter = document.getElementById("hostelFilter");

    [categoryFilter, conditionFilter, hostelFilter].forEach((filter) => {
      if (filter) {
        filter.addEventListener("change", (e) => {
          const filterType = e.target.id.replace("Filter", "");
          AppState.filters[filterType] = e.target.value;
          this.filterItems();
        });
      }
    });

    // Search button
    const searchBtn = document.querySelector(".search-btn");
    if (searchBtn) {
      searchBtn.addEventListener("click", (e) => {
        utils.createRipple(e, e.target);
        this.performSearch();
      });
    }
  }

  filterItems() {
    AppState.filteredItems = AppState.originalItems.filter((item) => {
      const matchesSearch =
        !AppState.searchQuery ||
        item.title.toLowerCase().includes(AppState.searchQuery) ||
        item.description.toLowerCase().includes(AppState.searchQuery) ||
        item.category.toLowerCase().includes(AppState.searchQuery);

      const matchesCategory =
        !AppState.filters.category ||
        item.category === AppState.filters.category;

      const matchesCondition =
        !AppState.filters.condition ||
        item.condition === AppState.filters.condition;

      const matchesHostel =
        !AppState.filters.hostel || item.hostel === AppState.filters.hostel;

      return (
        matchesSearch && matchesCategory && matchesCondition && matchesHostel
      );
    });

    // Sort boosted items to the top
    AppState.filteredItems.sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      return 0;
    });

    this.renderItems();
  }

  renderItems() {
    const itemsGrid = document.getElementById("itemsGrid");
    if (!itemsGrid) return;

    itemsGrid.innerHTML = "";

    if (AppState.filteredItems.length === 0) {
      itemsGrid.innerHTML = `
                <div class="no-items">
                    <div class="no-items-icon">🔍</div>
                    <h3>No items found</h3>
                    <p>Try adjusting your search or filters</p>
                    <button class="btn btn--outline" onclick="window.marketplace.clearFilters()">Clear Filters</button>
                </div>
            `;
      return;
    }

    AppState.filteredItems.forEach((item, index) => {
      const itemCard = this.createItemCard(item, index);
      itemsGrid.appendChild(itemCard);
    });
  }

  clearFilters() {
    AppState.searchQuery = "";
    AppState.filters = { category: "", condition: "", hostel: "" };

    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const conditionFilter = document.getElementById("conditionFilter");
    const hostelFilter = document.getElementById("hostelFilter");

    if (searchInput) searchInput.value = "";
    if (categoryFilter) categoryFilter.value = "";
    if (conditionFilter) conditionFilter.value = "";
    if (hostelFilter) hostelFilter.value = "";

    this.filterItems();
  }

  createItemCard(item, index) {
    const card = document.createElement("div");
    card.className = `item-card glass-card${item.isBoosted ? " boosted" : ""}`;
    card.style.animationDelay = `${index * 0.1}s`;

    const savings = item.originalPrice
      ? utils.calculateSavings(item.originalPrice, item.price)
      : null;
    const isUserItem = !!item.sellerId && (item.sellerId === ((window.userSession?.getCurrentUser?.()?.uid) || (window.firebaseAuth?.currentUser?.uid) || "user1"));
    const isHearted = AppState.userProfile.heartedPosts.includes(item.id);

    const primaryImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;

    card.innerHTML = `
            <div class="item-image">
                ${primaryImage ? `<img src="${primaryImage}" alt="${item.title}" class="item-img" style="width:100%;height:160px;object-fit:cover;border-radius:12px;"/>` : `<span class="item-emoji">${item.icon || "📦"}</span>`}
            </div>
            <h3 class="item-title">${item.title}</h3>
            <div class="item-prices">
                <div class="item-price">${utils.formatPrice(item.price)}</div>
                ${
                  item.originalPrice
                    ? `
                    <div class="item-original-price">${utils.formatPrice(
                      item.originalPrice
                    )}</div>
                    ${
                      savings
                        ? `<div class="item-savings">Save ₹${savings}</div>`
                        : ""
                    }
                `
                    : ""
                }
            </div>
            <div class="item-details">
                <span class="item-tag">${item.category}</span>
                <span class="item-tag">${item.condition}</span>
                <span class="item-tag">${item.hostel}</span>
                ${
                  item.clothingChecklist
                    ? `<span class="item-tag">Quality: ${item.clothingChecklist.quality}</span>`
                    : ""
                }
            </div>
            <p class="item-description">${item.description}</p>
            <div class="item-actions">
                <button class="btn btn--primary btn--sm contact-btn" data-id="${
                  item.id
                }">
                    Contact Seller
                </button>
                <button class="heart-btn ${
                  isHearted ? "hearted" : ""
                }" data-id="${item.id}" title="Heart this item">
                    ${isHearted ? "❤️" : "🤍"}
                </button>
                ${
                  isUserItem
                    ? `
                    
                    <button class="boost-btn" data-id="${item.id}" title="Boost this post">🚀</button>
                    <button class="remove-btn" data-id="${item.id}" title="Remove this post">🗑️</button>
                `
                    : ""
                }
            </div>
            ${
              item.hearts > 0
                ? `<div class="heart-count">${item.hearts} hearts</div>`
                : ""
            }
        `;

    this.bindItemCardEvents(card, item);
    return card;
  }

  bindItemCardEvents(card, item) {
    card.addEventListener("click", (e) => {
      const target = e.target;

      if (target.classList.contains("contact-btn")) {
        e.stopPropagation();
        utils.createRipple(e, target);
        this.contactSeller(item.id);
      } else if (target.classList.contains("heart-btn")) {
        e.stopPropagation();
        utils.createRipple(e, target);
        this.toggleHeart(item.id, target);
      } else if (target.classList.contains("boost-btn")) {
        e.stopPropagation();
        utils.createRipple(e, target);
        this.showBoostModal(item.id);
      } else if (target.classList.contains("remove-btn")) {
        e.preventDefault();
        e.stopPropagation();
        utils.createRipple(e, target);
        this.showRemoveModal(item.id);
      }
    });

    // Hover effects
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-8px) scale(1.02)";
      card.style.boxShadow =
        "0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(139, 95, 255, 0.2)";
      card.style.borderColor = "#8B5FFF";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0) scale(1)";
      card.style.boxShadow = "";
      card.style.borderColor = "";
    });
  }

  contactSeller(itemId) {
    utils.showNotification("Chat request sent! 💬", "success");
    setTimeout(() => {
      switchToSection("chat");
    }, 1000);
  }

  toggleHeart(itemId, button) {
    const isHearted = AppState.userProfile.heartedPosts.includes(itemId);

    if (isHearted) {
      AppState.userProfile.heartedPosts =
        AppState.userProfile.heartedPosts.filter((id) => id !== itemId);
      button.classList.remove("hearted");
      button.textContent = "🤍";
      utils.showNotification("Removed from favorites", "info");
    } else {
      AppState.userProfile.heartedPosts.push(itemId);
      button.classList.add("hearted");
      button.textContent = "❤️";
      utils.showNotification("Added to favorites! ❤️", "success");

      const heart = document.createElement("div");
      heart.innerHTML = "💖";
      heart.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                animation: heartFloat 1s ease-out forwards;
                pointer-events: none;
                font-size: 24px;
                z-index: 10;
            `;

      button.style.position = "relative";
      button.appendChild(heart);

      setTimeout(() => heart.remove(), 1000);
    }

    const item = AppState.originalItems.find((i) => i.id === itemId);
    if (item) {
      item.hearts += isHearted ? -1 : 1;
    }

    this.calculateMoneySaved();
    utils.saveToStorage("user_profile", AppState.userProfile);
    utils.saveToStorage("marketplace_items", AppState.originalItems);
  }

  showBoostModal(itemId) {
    AppState.currentBoostItemId = itemId;
    const modal = document.getElementById("boostModal");
    if (modal) {
      modal.classList.remove("hidden");
    }
  }

  showRemoveModal(itemId) {
    AppState.currentRemoveItemId = itemId;
    const modal = document.getElementById("removeModal");
    if (modal) {
      modal.classList.remove("hidden");
    }
  }

  boostPost(itemId) {
    const item = AppState.originalItems.find((i) => i.id === itemId);
    if (item && AppState.userProfile.points >= 25) {
      item.isBoosted = true;
      AppState.userProfile.points -= 25;

      utils.saveToStorage("marketplace_items", AppState.originalItems);
      utils.saveToStorage("user_profile", AppState.userProfile);

      this.filterItems();
      utils.showNotification("Post boosted successfully! 🚀", "success");
    }
  }

  removePost(itemId) {
    AppState.originalItems = AppState.originalItems.filter(
      (i) => i.id !== itemId
    );
    AppState.items = [...AppState.originalItems];

    utils.saveToStorage("marketplace_items", AppState.originalItems);

    this.filterItems();
    utils.showNotification("Post removed successfully", "info");
  }

  performSearch() {
    this.filterItems();
  }

  initScrollLoading() {
    // Scroll loading functionality
  }
}

// Post Item Handler
class PostItem {
  init() {
    this.bindEvents();
    this.initUploadArea();
  }

  bindEvents() {
    const form = document.getElementById("postForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.submitForm();
      });
    }

    // Show/hide clothing checklist
    const categorySelect = document.getElementById("itemCategory");
    const clothingChecklist = document.getElementById("clothingChecklist");

    if (categorySelect && clothingChecklist) {
      categorySelect.addEventListener("change", (e) => {
        if (e.target.value === "Clothes") {
          clothingChecklist.classList.remove("hidden");
        } else {
          clothingChecklist.classList.add("hidden");
        }
      });
    }
  }

  initUploadArea() {
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("itemPhotos");
    const uploadedImagesContainer = document.getElementById("uploadedImages");

    if (uploadArea && fileInput) {
      uploadArea.addEventListener("click", () => {
        fileInput.click();
      });
      // Basic preview for selected images
      fileInput.addEventListener("change", (e) => {
        if (!uploadedImagesContainer) return;
        uploadedImagesContainer.innerHTML = "";
        const files = Array.from(e.target.files || []);
        files.slice(0, 5).forEach((file) => {
          if (!file.type.startsWith('image/')) return;
          const reader = new FileReader();
          reader.onload = () => {
            const div = document.createElement('div');
            div.className = 'uploaded-image-thumb';
            div.style.cssText = 'display:inline-block;margin:6px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.15)';
            div.innerHTML = `<img src="${reader.result}" alt="preview" style="width:96px;height:96px;object-fit:cover;" />`;
            uploadedImagesContainer.appendChild(div);
          };
          reader.readAsDataURL(file);
        });
      });
    }
  }

  async uploadImagesToStorage(uid) {
    const fileInput = document.getElementById("itemPhotos");
    const files = Array.from(fileInput?.files || []);
    if (!files.length || !(window.firebaseStorage && window.firebaseModules)) return [];

    const { ref, uploadBytes, getDownloadURL } = window.firebaseModules;
    const urls = [];
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const f = files[i];
      if (!f.type.startsWith('image/')) continue;
      const path = `items/${uid}/${Date.now()}_${i}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storageRef = ref(window.firebaseStorage, path);
      const snap = await uploadBytes(storageRef, f);
      const url = await getDownloadURL(snap.ref);
      urls.push(url);
    }
    return urls;
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
      const currentUser = window.userSession?.getCurrentUser?.() || window.firebaseAuth?.currentUser || null;
      if (!currentUser) {
        utils.showNotification("Please sign in to post an item", "error");
        submitBtn.disabled = false;
        btnText.classList.remove("hidden");
        btnLoader.classList.add("hidden");
        return;
      }

      const categoryVal = document.getElementById("itemCategory").value;
      const newItem = {
        title: document.getElementById("itemTitle").value.trim(),
        category: categoryVal,
        condition: document.getElementById("itemCondition").value,
        price: parseInt(document.getElementById("itemPrice").value, 10),
        originalPrice:
          parseInt(document.getElementById("itemOriginalPrice").value, 10) || null,
        description: document.getElementById("itemDescription").value.trim(),
        hostel: document.getElementById("itemHostel").value,
        icon: this.getCategoryIcon(categoryVal),
        isBoosted: false,
        hearts: 0,
        heartedBy: [],
        images: [],
        sellerId: currentUser.uid,
        sellerEmail: currentUser.email || '',
        sellerName: (window.userSession?.getUserData?.()?.firstName || '') + ' ' + (window.userSession?.getUserData?.()?.lastName || ''),
        status: 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (newItem.category === "Clothes") {
        newItem.clothingChecklist = {
          quality: document.getElementById("clothingQuality").value,
          detailedCondition: document.getElementById("clothingCondition").value,
          age: document.getElementById("clothingAge").value,
        };
      }

      // Upload images if possible
      let imageUrls = [];
      try {
        imageUrls = await this.uploadImagesToStorage(currentUser.uid);
      } catch (e) {
        console.warn('Image upload failed, proceeding without images:', e);
      }
      newItem.images = imageUrls;

      // Attempt to save to Firestore if available
      if (window.firebaseDb && window.firebaseModules) {
        const { collection, addDoc, serverTimestamp } = window.firebaseModules;
        const itemsRef = collection(window.firebaseDb, 'items');
        const docToSave = { ...newItem, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };

        // Guard against hanging network by enforcing a timeout
        const withTimeout = (p, ms) => new Promise((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('timeout')), ms);
          p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
        });

        // Try to write, but don't hang UI if the network is blocked
        let savedItem;
        try {
          const docRef = await withTimeout(addDoc(itemsRef, docToSave), 10000);
          savedItem = { ...newItem, id: docRef.id };
        } catch (err) {
          if (err && err.message === 'timeout') {
            // Offline or blocked network: show locally and sync later
            const tempId = 'temp_' + Date.now();
            savedItem = { ...newItem, id: tempId };
            // Background attempt (non-blocking)
            addDoc(itemsRef, docToSave).catch(e => console.warn('Background sync failed:', e));
            utils.showNotification("Saved locally. Will sync when online.", "info");
          } else {
            throw err;
          }
        }

        // Reflect in local state for immediate UI update
        AppState.originalItems.unshift(savedItem);
        AppState.items = [...AppState.originalItems];
        AppState.filteredItems = [...AppState.originalItems];
        utils.showNotification("Item posted successfully! ✨", "success");
        form.reset();
        // Re-render marketplace
        if (window.marketplace) {
          window.marketplace.filterItems();
        }
      } else {
        // Fallback: local storage
        const localItem = { id: Date.now(), ...newItem };
        AppState.originalItems.unshift(localItem);
        AppState.items = [...AppState.originalItems];
        AppState.filteredItems = [...AppState.originalItems];
        utils.saveToStorage("marketplace_items", AppState.originalItems);
        utils.showNotification("Item posted locally (offline)", "info");
        form.reset();
      }

      // Reward points locally (optional)
      AppState.userProfile.points = (AppState.userProfile.points || 0) + 5;
      utils.saveToStorage("user_profile", AppState.userProfile);

      // Switch to marketplace view
      setTimeout(() => {
        switchToSection("marketplace");
      }, 500);

    } catch (err) {
      console.error('Failed to post item:', err);
      if (err && err.message === 'timeout') {
        // Already handled by local fallback above; just switch view
        switchToSection("marketplace");
      } else {
        const msg = err?.code ? `${err.code}: ${err.message || 'Failed to post item'}` : 'Failed to post item. Please try again.';
        utils.showNotification(msg, "error");
      }
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
      Books: "📚",
      Cosmetics: "💄",
      Miscellaneous: "📦",
    };
    return icons[category] || "📦";
  }
}

// Chat Handler
class Chat {
  init() {
    this.loadConversations();
    this.bindEvents();
  }

  loadConversations() {
    const conversationList = document.getElementById("conversationList");
    if (!conversationList) return;

    conversationList.innerHTML = "";

    AppState.chatData.conversations.forEach((conversation) => {
      const element = document.createElement("div");
      element.className = "conversation-item";
      element.innerHTML = `
                <div class="conversation-name">${
                  conversation.participantName
                }</div>
                <div class="conversation-preview">${
                  conversation.lastMessage
                }</div>
                <div class="conversation-time">${conversation.timestamp}</div>
                ${
                  conversation.unread
                    ? '<div class="unread-indicator"></div>'
                    : ""
                }
            `;

      element.addEventListener("click", () => {
        this.openChat(conversation.id);
      });

      conversationList.appendChild(element);
    });
  }

  openChat(chatId) {
    const conversation = AppState.chatData.conversations.find(
      (c) => c.id === chatId
    );
    if (!conversation) return;

    // Update chat header
    const chatUserName = document.getElementById("chatUserName");
    const chatUserStatus = document.getElementById("chatUserStatus");
    const chatInputContainer = document.getElementById("chatInputContainer");

    if (chatUserName) chatUserName.textContent = conversation.participantName;
    if (chatUserStatus) chatUserStatus.textContent = "Online";
    if (chatInputContainer) chatInputContainer.classList.remove("hidden");

    // Load messages
    this.loadMessages(conversation);
  }

  loadMessages(conversation) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;

    chatMessages.innerHTML = "";

    conversation.messages.forEach((message) => {
      const element = document.createElement("div");
      element.className = `message ${message.sender}`;
      element.innerHTML = `
                <div class="message-text">${message.text}</div>
                <div class="message-time">${message.time}</div>
            `;
      chatMessages.appendChild(element);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  bindEvents() {
    const chatSendBtn = document.getElementById("chatSendBtn");
    const chatInput = document.getElementById("chatInput");

    if (chatSendBtn && chatInput) {
      chatSendBtn.addEventListener("click", () => {
        this.sendMessage();
      });

      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.sendMessage();
        }
      });
    }
  }

  sendMessage() {
    const chatInput = document.getElementById("chatInput");
    if (!chatInput) return;

    const messageText = chatInput.value.trim();
    if (!messageText) return;

    // Add message to active conversation
    const newMessage = {
      text: messageText,
      sender: "sent",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const chatMessages = document.getElementById("chatMessages");
    if (chatMessages) {
      const messageElement = document.createElement("div");
      messageElement.className = "message sent";
      messageElement.innerHTML = `
                <div class="message-text">${messageText}</div>
                <div class="message-time">${newMessage.time}</div>
            `;
      chatMessages.appendChild(messageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatInput.value = "";
  }
}

// Profile Handler
// app.js

// (Replace the entire existing Profile class with this one)
class Profile {
  init() {
    this.loadData();
    this.bindEvents(); // Call the new method to attach event listeners
  }

  bindEvents() {
    // Get the buttons using their new IDs
    const logoutBtn = document.getElementById("logoutBtn");
    const editNameBtn = document.getElementById("editNameBtn");
    const changePasswordBtn = document.getElementById("changePasswordBtn");
    const notificationSettingsBtn = document.getElementById(
      "notificationSettingsBtn"
    );
    const deleteAccountBtn = document.getElementById("deleteAccountBtn");

    // Add click event listeners
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.logout();
      });
    }

    if (editNameBtn) {
      editNameBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openEditNameModal();
      });
    } else {
      // Fallback: delegate on document in case the element is rendered later
      document.addEventListener('click', (e) => {
        const link = e.target.closest('#editNameBtn');
        if (link) {
          e.preventDefault();
          this.openEditNameModal();
        }
      });
    }

    if (changePasswordBtn) {
      changePasswordBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.changePassword();
      });
    }

    if (notificationSettingsBtn) {
      notificationSettingsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // For now, this just shows a notification. Could lead to a settings page.
        utils.showNotification(
          "Notification settings are managed here.",
          "info"
        );
      });
    }

    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.deleteAccount();
      });
    }

    // Modal actions
    const cancelEditName = document.getElementById("cancelEditName");
    const saveEditName = document.getElementById("saveEditName");
    if (cancelEditName) {
      cancelEditName.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("editNameModal")?.classList.add("hidden");
      });
    }
    if (saveEditName) {
      saveEditName.addEventListener("click", async (e) => {
        e.preventDefault();
        await this.saveEditedName();
      });
    }
  }

  logout() {
    utils.showNotification("Logging you out...", "info");

    // Delegate to Firebase auth signOut via user session manager
    if (window.userSession && typeof window.userSession.logout === 'function') {
      window.userSession.logout();
    } else {
      // Fallback: clear local caches and go to auth page
      localStorage.removeItem("user_profile");
      localStorage.removeItem("marketplace_items");
      window.location.href = 'auth.html';
    }
  }

  // In app.js -> inside the Profile class
  changePassword() {
    // This function now simply opens the modal window
    const modal = document.getElementById("changePasswordModal");
    if (modal) {
      modal.classList.remove("hidden");
      // Clear previous input values when opening
      document.getElementById("passwordChangeForm").reset();
    }
  }

  async saveEditedName() {
    try {
      const firstName = (document.getElementById('editFirstName')?.value || '').trim();
      const lastName = (document.getElementById('editLastName')?.value || '').trim();
      if (!firstName && !lastName) {
        utils.showNotification('Please enter at least a first or last name', 'warning');
        return;
      }

      // Update Firestore user document
      if (window.userSession && typeof window.userSession.updateUserData === 'function') {
        await window.userSession.updateUserData({ firstName, lastName });
      }

      // Update Firebase Auth displayName for consistency
      const user = window.firebaseAuth?.currentUser;
      const fullName = `${firstName} ${lastName}`.trim();
      if (user && window.firebaseModules?.updateProfile && fullName) {
        await window.firebaseModules.updateProfile(user, { displayName: fullName });
      }

      utils.showNotification('Name updated successfully', 'success');
      document.getElementById('editNameModal')?.classList.add('hidden');
    } catch (err) {
      console.error('Failed to update name:', err);
      utils.showNotification('Failed to update name. Please try again.', 'error');
    }
  }

  openEditNameModal() {
    const modal = document.getElementById('editNameModal');
    const data = window.userSession?.getUserData?.() || {};
    const firstNameEl = document.getElementById('editFirstName');
    const lastNameEl = document.getElementById('editLastName');
    if (firstNameEl) firstNameEl.value = data.firstName || '';
    if (lastNameEl) lastNameEl.value = data.lastName || '';
    modal?.classList.remove('hidden');
  }

  deleteAccount() {
    // A confirmation step is crucial for destructive actions
    const confirmation = confirm(
      "Are you absolutely sure you want to delete your account?\nAll your data will be lost forever. This action cannot be undone."
    );

    if (confirmation) {
      utils.showNotification("Deleting your account...", "warning");

      // Similar to logout, clear all data and reload
      setTimeout(() => {
        localStorage.clear(); // Clears everything
        window.location.reload();
      }, 2000);
    }
  }

  loadData() {
    this.updateStats();
    this.loadMyListings();
    this.loadHeartedPosts();
    this.loadTransactionHistory();
  }

  updateStats() {
    const userPointsEl = document.getElementById("userPoints");
    const totalTransactionsEl = document.getElementById("totalTransactions");
    const moneySavedEl = document.getElementById("moneySaved");

    if (userPointsEl) {
      utils.animateValue(userPointsEl, 0, AppState.userProfile.points, 1000);
    }

    if (totalTransactionsEl) {
      utils.animateValue(
        totalTransactionsEl,
        0,
        AppState.userProfile.totalTransactions,
        1000
      );
    }

    if (moneySavedEl) {
      utils.animateValue(
        moneySavedEl,
        0,
        AppState.userProfile.moneySaved,
        1000,
        (val) => `₹${val}`
      );
    }
  }

  loadMyListings() {
    const myListings = document.getElementById("myListings");
    if (!myListings) return;

    myListings.innerHTML = `
            <div class="empty-state">
                <p>🛍️ You haven't posted anything yet. Start selling to see your items here!</p>
            </div>
        `;
  }

  loadHeartedPosts() {
    const heartedPosts = document.getElementById("heartedPosts");
    if (!heartedPosts) return;

    heartedPosts.innerHTML = "";

    if (AppState.userProfile.heartedPosts.length === 0) {
      heartedPosts.innerHTML = `
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
      heartedCard.className = "hearted-card";
      heartedCard.innerHTML = `
                <div class="hearted-icon" style="font-size: 2rem; margin-bottom: 8px;">${
                  item.icon
                }</div>
                <h4 style="margin: 0 0 8px 0; color: #f5f5f5; font-size: 14px;">${
                  item.title
                }</h4>
                <p style="margin: 0; color: #FF3366; font-weight: bold;">${utils.formatPrice(
                  item.price
                )}</p>
            `;

      heartedCard.style.cssText = `
                background: rgba(255, 51, 102, 0.05);
                border: 1px solid rgba(255, 51, 102, 0.2);
                border-radius: 12px;
                padding: 16px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
            `;

      heartedPosts.appendChild(heartedCard);
    });
  }

  loadTransactionHistory() {
    const transactionList = document.getElementById("transactionList");
    if (!transactionList) return;

    transactionList.innerHTML = "";

    AppState.userProfile.transactions.forEach((transaction) => {
      const element = document.createElement("div");
      element.className = "transaction-item";
      element.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-type">💰 ${transaction.type}</div>
                    <div class="transaction-date">${transaction.date}</div>
                </div>
                <div class="transaction-points ${
                  transaction.points > 0 ? "positive" : "negative"
                }">
                    ${transaction.points > 0 ? "+" : ""}${
        transaction.points
      } pts
                </div>
            `;

      transactionList.appendChild(element);
    });
  }
}
class Help {
  init() {
    // This is where you could add event listeners for the help page,
    // like a "copy email" button.
    console.log("Help section initialized.");
  }
}

// Initialize modal handlers
function initModals() {
  // --- START: ADD THIS NEW CODE ---

  document.addEventListener("click", (e) => {
    if (
      e.target.id === "cancelBoost" ||
      e.target.id === "cancelRemove" ||
      e.target.id === "cancelEditName" ||
      e.target.id === "closeModal"
    ) {
      e.target.closest(".modal").classList.add("hidden");
    }

    if (e.target.id === "confirmBoost") {
      if (AppState.currentBoostItemId && window.marketplace) {
        window.marketplace.boostPost(AppState.currentBoostItemId);
        e.target.closest(".modal").classList.add("hidden");
      }
    }

    if (e.target.id === "confirmRemove") {
      if (AppState.currentRemoveItemId && window.marketplace) {
        window.marketplace.removePost(AppState.currentRemoveItemId);
        e.target.closest(".modal").classList.add("hidden");
      }
    }

    if (e.target.classList.contains("modal-overlay")) {
      e.target.closest(".modal").classList.add("hidden");
    }
  });
}

// App Controller
class App {
  constructor() {
    this.loadingScreen = new LoadingScreen();
    this.navigation = new Navigation();
    this.marketplace = new Marketplace();
    this.postItem = new PostItem();
    this.chat = new Chat();
    this.profile = new Profile();
    this.help = new Help();
  }

  init() {
    console.log("Initializing enhanced Campus Thrift app...");

    // Initialize components
    this.navigation.init();
    this.marketplace.init();
    this.postItem.init();
    this.chat.init();
    this.profile.init();
    this.help.init();
    initModals();

    // Make components globally available
    window.navigation = this.navigation;
    window.marketplace = this.marketplace;
    window.postItem = this.postItem;
    window.chat = this.chat;
    window.profile = this.profile;
    window.help = this.help;
    this.addGlobalAnimations();

    console.log("Enhanced app initialized successfully");
  }

  addGlobalAnimations() {
    // Add button hover effects
    document.querySelectorAll(".btn").forEach((btn) => {
      btn.addEventListener("mouseenter", () => {
        btn.style.transform = "translateY(-2px)";
      });

      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "translateY(0)";
      });

      btn.addEventListener("click", (e) => {
        utils.createRipple(e, btn);
      });
    });
  }
}

// Initialize everything
window.app = new App();
const loadingScreen = new LoadingScreen();

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, starting Campus Thrift app...");
  loadingScreen.init();
});

// Add required CSS animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideInRight {
        from { opacity: 0; transform: translateX(100px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes slideOutRight {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100px); }
    }
    
    @keyframes heartFloat {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(0); }
        50% { opacity: 1; transform: translate(-50%, -70px) scale(1.2); }
        100% { opacity: 0; transform: translate(-50%, -100px) scale(0.8); }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .transaction-points.positive { color: #00FF88; }
    .transaction-points.negative { color: #FF5459; }
    
    .transaction-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        margin-bottom: 8px;
    }
`;

document.head.appendChild(style);
