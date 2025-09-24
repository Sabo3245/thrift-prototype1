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
    sellerName: "Rohan Sharma",
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

// File: app.js

// NEW: Faster, cleaner LoadingScreen class
class LoadingScreen {
  constructor() {
    this.loadingScreen = document.getElementById("loadingScreen");
    this.progressFill = document.querySelector(".progress-fill");
    this.loadingText = document.querySelector(".loading-text");
  }

  // This function is now much simpler.
  init() {
    // 1. Instantly set the loading text to the only message needed.
    this.loadingText.textContent = "Loading your marketplace...";

    // 2. Animate the progress bar to 100% over 0.4 seconds.
    if (this.progressFill) {
      // We use a CSS transition for a much smoother animation.
      this.progressFill.style.transition = "transform 0.4s ease-out";
      this.progressFill.style.transform = "translateX(0%)";
    }

    // 3. Hide the loading screen right after the animation finishes.
    setTimeout(() => this.hide(), 1000); // 500ms = 0.5s
  }

  hide() {
    if (!this.loadingScreen) return;

    // Fade out the entire loading screen.
    this.loadingScreen.style.animation = "fadeOut 0.5s ease-out forwards";

    setTimeout(() => {
      this.loadingScreen.style.display = "none";
      const mainApp = document.getElementById("mainApp");
      if (mainApp) {
        mainApp.classList.remove("hidden");
      }
      // This correctly starts the rest of your app.
      window.app.init();
    }, 500);
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
    this.renderItems();
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

        // 1) Try status == 'available' ordered by createdAt desc (may need index)
        try {
          const q = query(itemsRef, where("status", "==", "available"), orderBy("createdAt", "desc"));
          const snapshot = await getDocs(q);
          snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
        } catch (e) {
          const msg = (e?.message || "").toLowerCase();
          if (e?.code === "failed-precondition" || msg.includes("index")) {
            console.warn("Index not ready; retrying items fetch without orderBy");
            const q2 = query(itemsRef, where("status", "==", "available"));
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
          this.calculateMoneySaved();
          return;
        }

        // Success
        AppState.items = [...items];
        AppState.originalItems = [...items];
        AppState.filteredItems = [...items];
        this.calculateMoneySaved();
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
    this.calculateMoneySaved();
  }

  // File: app.js

  calculateMoneySaved() {
    // This function is updated to prevent incorrect calculations based on hearted items.
    // "Money Saved" will be correctly calculated from actual transactions in a future update.
    const totalSaved = 0;

    AppState.userProfile.moneySaved = totalSaved;
    utils.saveToStorage("user_profile", AppState.userProfile);
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
      const { searchQuery, filters } = AppState;
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery);
      const matchesCategory =
        !filters.category || item.category === filters.category;
      const matchesCondition =
        !filters.condition || item.condition === filters.condition;
      const matchesHostel = !filters.hostel || item.hostel === filters.hostel;
      return (
        matchesSearch && matchesCategory && matchesCondition && matchesHostel
      );
    });

    AppState.filteredItems.sort(
      (a, b) => (b.isBoosted || 0) - (a.isBoosted || 0)
    );
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
              ? `<img src="${primaryImage}" alt="${item.title}" class="item-img" style="width:100%;height:160px;object-fit:cover;border-radius:12px;"/>`
              : `<span class="item-emoji">${item.icon || "📦"}</span>`
          }
          <button class="heart-btn ${isHearted ? "hearted" : ""}" data-id="${
      item.id
    }" title="Heart this item">${isHearted ? "❤️" : "🤍"}</button>
      </div>
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
          <span class="seller-name">${item.sellerName || "Anonymous"}</span>
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
      </div>`;

    card.addEventListener("click", (e) => this.handleCardClick(e, item.id));
    return card;
  }

  handleCardClick(e, itemId) {
    const target = e.target;
    if (target.closest(".contact-btn")) this.contactSeller(itemId);
    else if (target.closest(".heart-btn"))
      this.toggleHeart(itemId, target.closest(".heart-btn"));
    else if (target.closest(".boost-btn")) this.showBoostModal(itemId);
    else if (target.closest(".remove-btn")) this.showRemoveModal(itemId);
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

  // File: app.js

  // File: app.js

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
    // The incorrect calculation is now removed.
    utils.saveToStorage("user_profile", AppState.userProfile);
    utils.saveToStorage("marketplace_items", AppState.originalItems);
  }

  showBoostModal(itemId) {
    AppState.currentBoostItemId = itemId;
    const modal = document.getElementById("boostModal");
    if (modal) {
      modal.classList.remove("hidden");
      document.body.classList.add("modal-open");
    }
  }

  showRemoveModal(itemId) {
    AppState.currentRemoveItemId = itemId;
    document.getElementById("removeModal")?.classList.remove("hidden");
  }

  boostPost(itemId) {
    // Logic can be implemented here, for now, it's a placeholder
    const item = AppState.originalItems.find((i) => i.id === itemId);
    if (item) {
      item.isBoosted = true;
      this.filterItems(); // Re-render to show boosted status
      utils.showNotification("Post boosted successfully! 🚀", "success");
    }
  }

  async removePost(itemId) {
    const currentUser =
      window.userSession?.getCurrentUser?.() ||
      window.firebaseAuth?.currentUser ||
      null;

    let removedInCloud = false;
    if (window.firebaseDb && window.firebaseModules && currentUser) {
      const { doc, deleteDoc, updateDoc } = window.firebaseModules;
      const itemRef = doc(window.firebaseDb, "items", String(itemId));

      const withTimeout = (p, ms) =>
        new Promise((resolve, reject) => {
          const t = setTimeout(() => reject(new Error("timeout")), ms);
          p.then((v) => {
            clearTimeout(t);
            resolve(v);
          }).catch((e) => {
            clearTimeout(t);
            reject(e);
          });
        });

      try {
        await withTimeout(deleteDoc(itemRef), 8000);
        removedInCloud = true;
      } catch (err) {
        // Fallback to soft-delete if hard delete is blocked
        try {
          await withTimeout(
            updateDoc(itemRef, {
              status: "removed",
              updatedAt: new Date().toISOString(),
            }),
            8000
          );
          removedInCloud = true;
        } catch (e2) {
          // Fire-and-forget background attempts
          deleteDoc(itemRef).catch(() => {});
          updateDoc(itemRef, {
            status: "removed",
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }
      }
    }

    // Update UI and local cache regardless
    AppState.originalItems = AppState.originalItems.filter(
      (i) => i.id !== itemId
    );
    AppState.items = [...AppState.originalItems];
    utils.saveToStorage("marketplace_items", AppState.originalItems);
    this.filterItems();

    utils.showNotification(
      removedInCloud
        ? "Post removed successfully"
        : "Post removed locally. Will sync when online.",
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

    document.getElementById("itemCategory")?.addEventListener("change", (e) => {
      document
        .getElementById("clothingChecklist")
        ?.classList.toggle("hidden", e.target.value !== "Clothes");
    });

    // Add a delegated event listener for remove buttons on previews
    document
      .getElementById("uploadedImages")
      ?.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-btn")) {
          const index = parseInt(e.target.dataset.index, 10);
          this.removePreview(index);
        }
      });
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

      if (newItem.category === "Clothes") {
        newItem.clothingChecklist = {
          quality: document.getElementById("clothingQuality").value,
          age: document.getElementById("clothingAge").value,
          detailedCondition: document.getElementById("clothingCondition").value,
        };
      }

      if (window.firebaseDb && window.firebaseModules) {
        const { collection, addDoc, serverTimestamp } = window.firebaseModules;
        const itemsRef = collection(window.firebaseDb, "items");
        const docToSave = {
          ...newItem,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isBoosted: false,
          hearts: 0,
          heartedBy: [],
        };
        const docRef = await addDoc(itemsRef, docToSave);

        AppState.originalItems.unshift({ ...docToSave, id: docRef.id });
      }

      utils.showNotification("Item posted successfully! ✨", "success");
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
      Books: "📚",
      Cosmetics: "💄",
      Miscellaneous: "📦",
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
        </div>
      `;
      el.addEventListener('click', () => this.openChat(c.id));
      conversationList.appendChild(el);
    });
  }

  // Start or reuse a conversation for a given item
// Replace the existing startConversationForItem function with this one
  async startConversationForItem(item) {
    if (!this.db || !this.modules) throw new Error('Firebase not initialized');
    const user = this.auth?.currentUser;
    if (!user) throw new Error('Not authenticated');

    const buyerId = user.uid;
    const sellerId = item.sellerId;
    const key = [buyerId, sellerId].sort().join('_');

    // Get display names for both users
    const buyerName = window.userSession?.getUserData?.().displayName || user.displayName || 'Buyer';
    const sellerName = item.sellerName || 'Seller';

    // Use a deterministic conversation ID to avoid duplicates
    const convId = `${key}_${String(item.id)}`;
    const { doc, setDoc, serverTimestamp } = this.modules;

    await setDoc(doc(this.db, 'conversations', convId), {
      key,
      participants: [buyerId, sellerId],
      participantEmails: {
        [buyerId]: user.email || '',
        [sellerId]: item.sellerEmail || ''
      },
      // NEW: Add participant names to the document
      participantNames: {
        [buyerId]: buyerName,
        [sellerId]: sellerName
      },
      buyerId,
      sellerId,
      sellerEmail: item.sellerEmail || '',
      itemId: String(item.id),
      itemTitle: item.title || '',
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });

    // Open the chat immediately
    this.openChat(convId);
  }

// Replace the existing openChat function with this one
// Replace the existing openChat function with this one
  openChat(chatId) {
    const convo = this.conversations.find((c) => c.id === chatId) || { id: chatId };
    this.activeConversation = convo;

    const chatUserName = document.getElementById('chatUserName');
    const chatUserStatus = document.getElementById('chatUserStatus');
    const chatInputContainer = document.getElementById('chatInputContainer');

    if (chatUserName) {
      const me = this.auth?.currentUser;
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
    
    if (chatUserStatus) chatUserStatus.textContent = 'Online';
    if (chatInputContainer) chatInputContainer.classList.remove('hidden');

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

      // Auto-award buyer if needed when they see the sold conversation
      const me = this.auth?.currentUser;
      if (data.itemSold && data.soldToId && me && data.soldToId === me.uid && !data.buyerAwarded) {
        this.awardBuyerPoints(conversationId);
      }
    });
  }

  updateSoldUI() {
    const convo = this.activeConversation || {};
    const me = this.auth?.currentUser;
    const isSeller = me && convo.sellerId === me.uid;
    const sold = !!convo.itemSold;

    const btn = document.getElementById('markAsSoldBtn');
    if (btn) btn.style.display = isSeller && !sold ? 'inline-flex' : 'none';

    const input = document.getElementById('chatInput');
    const send = document.getElementById('chatSendBtn');
    const messages = document.getElementById('chatMessages');

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

  async awardBuyerPoints(conversationId) {
    try {
      const me = this.auth?.currentUser;
      if (!me || !this.db || !this.modules) return;
      const { doc, setDoc, getDoc, updateDoc } = this.modules;

      // Prefer atomic increment that also works if the doc is missing (merge)
      if (this.modules.increment && setDoc) {
        await setDoc(doc(this.db, 'users', me.uid), { points: this.modules.increment(5) }, { merge: true });
      } else {
        const userRef = doc(this.db, 'users', me.uid);
        let current = window.userSession?.getUserData?.()?.points || 0;
        try {
          const snap = await getDoc(userRef);
          if (snap?.exists()) current = snap.data()?.points || 0;
        } catch {}
        try {
          await updateDoc(userRef, { points: current + 5 });
        } catch {
          await setDoc(userRef, { points: current + 5 }, { merge: true });
        }
      }

      await this.modules.updateDoc(this.modules.doc(this.db, 'conversations', conversationId), { buyerAwarded: true });
      const currentLocal = window.userSession?.getUserData?.()?.points || 0;
      window.userSession?.updateUserData?.({ points: currentLocal + 5 });
    } catch (e) {
      console.warn('Failed to award buyer points:', e);
    }
  }

  async markItemAsSold() {
    const me = this.auth?.currentUser;
    const convo = this.activeConversation || {};
    if (!me || !convo?.id || !this.db || !this.modules) return;
    if (convo.sellerId !== me.uid) {
      utils.showNotification('Only the seller can mark as sold', 'error');
      return;
    }
    const buyerId = convo.buyerId || (convo.participants || []).find((p) => p !== me.uid);
    if (!buyerId) {
      utils.showNotification('Cannot determine buyer', 'error');
      return;
    }

    const { doc, updateDoc, setDoc, getDoc, query, where, collection, getDocs, serverTimestamp, addDoc } = this.modules;

    let criticalFailed = false;
    const warnings = [];

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

    // 2) Update all conversations of this item (non-critical if some fail)
    try {
      if (convo.itemId) {
        const convRef = collection(this.db, 'conversations');
        const q = query(convRef, where('itemId', '==', String(convo.itemId)));
        const snap = await getDocs(q);
        const updates = [];
        snap.forEach((d) => {
          if (d.id === convo.id) {
            updates.push(updateDoc(doc(this.db, 'conversations', d.id), {
              itemSold: true,
              soldToId: buyerId,
              soldAt: serverTimestamp(),
              sellerAwarded: true
            }));
          } else {
            updates.push(updateDoc(doc(this.db, 'conversations', d.id), {
              itemSold: true,
              soldAt: serverTimestamp(),
              sellerAwarded: true
            }));
          }
        });
        const results = await Promise.allSettled(updates);
        if (results.some(r => r.status === 'rejected')) {
          warnings.push('Some conversations could not be updated.');
        }
      } else {
        await updateDoc(doc(this.db, 'conversations', convo.id), {
          itemSold: true,
          soldToId: buyerId,
          soldAt: serverTimestamp(),
          sellerAwarded: true
        });
      }
    } catch (e) {
      warnings.push('Conversation state update encountered issues.');
      console.warn('Conversation update warnings:', e);
    }

    // 3) Award seller points (important but not critical for marking sold)
    if (!criticalFailed) {
      try {
        const userRef = doc(this.db, 'users', me.uid);
        if (this.modules.increment && setDoc) {
          await setDoc(userRef, { points: this.modules.increment(5) }, { merge: true });
        } else {
          let currentPts = window.userSession?.getUserData?.()?.points || 0;
          try {
            const snap = await getDoc(userRef);
            if (snap?.exists()) currentPts = snap.data()?.points || 0;
          } catch {}
          try {
            await updateDoc(userRef, { points: currentPts + 5 });
          } catch {
            await setDoc(userRef, { points: currentPts + 5 }, { merge: true });
          }
        }
        const current = window.userSession?.getUserData?.()?.points || 0;
        window.userSession?.updateUserData?.({ points: current + 5 });
      } catch (e) {
        warnings.push('Awarded sale, but failed to update points right now.');
        console.warn('Points awarding warning:', e);
      }
    }

    // 4) Create transaction records (non-critical)
    if (!criticalFailed) {
      const txRef = collection(this.db, 'transactions');
      const itemTitle = convo.itemTitle || 'Item';
      const price = convo.itemPrice || null;
      try {
        await addDoc(txRef, {
          userId: me.uid,
          type: 'sale',
          itemId: String(convo.itemId || ''),
          itemTitle,
          price,
          counterpartId: buyerId,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        warnings.push('Could not log seller transaction.');
        console.warn('Seller transaction warning:', e);
      }
      try {
        await addDoc(txRef, {
          userId: buyerId,
          type: 'purchase',
          itemId: String(convo.itemId || ''),
          itemTitle,
          price,
          counterpartId: me.uid,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        warnings.push('Could not log buyer transaction.');
        console.warn('Buyer transaction warning:', e);
      }
    }

    if (!criticalFailed) {
      utils.showNotification('Item marked as sold', 'success');
      if (warnings.length) {
        utils.showNotification(warnings.join(' '), 'warning');
      }
      this.updateSoldUI();
    } else {
      utils.showNotification('Failed to mark as sold. Please try again.', 'error');
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

    if (!this.db || !this.modules) return;
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

    const { collection, addDoc, serverTimestamp, doc, updateDoc } = this.modules;
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
      const convRef = doc(this.db, 'conversations', convo.id);
      await updateDoc(convRef, {
        lastMessage: text,
        lastMessageAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Message sent, but failed to update conversation metadata:', e);
      // No error toast here; message already sent
    }

    chatInput.value = '';
  }
}

class Profile {
  init() {
    this.loadData();
    this.bindEvents(); // Attaches all necessary event listeners
  }

  // Binds clicks to all the interactive elements in the profile section
  bindEvents() {
    const avatarEditBtn = document.querySelector(".avatar-edit"); // The pencil icon
    const editNameBtn = document.getElementById("editNameBtn"); // The settings link
    const saveEditNameBtn = document.getElementById("saveEditName");
    const cancelEditNameBtn = document.getElementById("cancelEditName");
    const logoutBtn = document.getElementById("logoutBtn");
    const deleteAccountBtn = document.getElementById("deleteAccountBtn");

    // NEW: Make the pencil icon open the Edit Name modal
    if (avatarEditBtn) {
      avatarEditBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openEditNameModal();
      });
    }

    // Make the "Edit Name" link in settings open the modal
    if (editNameBtn) {
      editNameBtn.addEventListener("click", (e) => {
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
  }

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
        utils.showNotification("No user signed in.", "error");
        return;
      }

      utils.showNotification("Deleting your account...", "warning");

      const { collection, query, where, getDocs, doc, updateDoc, deleteDoc } =
        window.firebaseModules || {};
      const db = window.firebaseDb;

      // 1) Soft-delete all items owned by the user (so they disappear from public listings)
      if (db && collection && query && where && getDocs && doc && updateDoc) {
        try {
          const itemsRef = collection(db, "items");
          const q = query(itemsRef, where("sellerId", "==", user.uid));
          const snap = await getDocs(q);
          const updates = [];
          snap.forEach((d) => {
            const itemRef = doc(db, "items", d.id);
            updates.push(
              updateDoc(itemRef, {
                status: "removed",
                updatedAt: new Date().toISOString(),
              })
            );
          });
          await Promise.allSettled(updates);
        } catch (e) {
          console.warn(
            "Failed to soft-delete items during account deletion:",
            e
          );
        }
      }

      // 2) Delete the user profile document
      if (db && doc && deleteDoc) {
        try {
          await deleteDoc(doc(db, "users", user.uid));
        } catch (e) {
          console.warn("Failed to delete user profile document:", e);
        }
      }

      // 3) Delete the Auth user
      if (window.firebaseModules?.deleteUser) {
        try {
          await window.firebaseModules.deleteUser(user);
        } catch (e) {
          // Requires recent login
          console.error("Failed to delete auth user:", e);
          utils.showNotification(
            "Please re-login and try deleting again (recent sign-in required).",
            "error"
          );
          return;
        }
      }

      // 4) Clear local storage and redirect
      try {
        localStorage.removeItem("user_profile");
        localStorage.removeItem("marketplace_items");
      } catch {}

      utils.showNotification("Account deleted. Goodbye!", "success");
      setTimeout(() => {
        window.location.href = "auth.html";
      }, 800);
    } catch (err) {
      console.error("Account deletion failed:", err);
      utils.showNotification(
        "Failed to delete account. Please try again.",
        "error"
      );
    }
  }

  loadData() {
    this.updateStats();
    this.loadMyListings();
    this.loadHeartedPosts();
    this.loadTransactionHistory();
  }

  updateStats() {
    utils.animateValue(
      document.getElementById("userPoints"),
      0,
      AppState.userProfile.points,
      1000
    );
    utils.animateValue(
      document.getElementById("totalTransactions"),
      0,
      AppState.userProfile.totalTransactions,
      1000
    );
    utils.animateValue(
      document.getElementById("moneySaved"),
      0,
      AppState.userProfile.moneySaved,
      1000,
      (val) => `₹${val}`
    );
  }

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
      heartedPostsContainer.appendChild(heartedCard);
    });
  }

  async loadTransactionHistory() {
    const container = document.getElementById('transactionList');
    if (!container) return;
    container.innerHTML = '';

    try {
      const me = window.firebaseAuth?.currentUser;
      if (!me) {
        container.innerHTML = `<div class="empty-state"><p>Please sign in to see transactions.</p></div>`;
        return;
      }
      const { collection, query, where, orderBy, getDocs } = window.firebaseModules || {};
      if (!collection || !query || !where || !orderBy || !getDocs) {
        container.innerHTML = `<div class="empty-state"><p>Transactions unavailable.</p></div>`;
        return;
      }
      const txRef = collection(window.firebaseDb, 'transactions');
      const q = query(txRef, where('userId', '==', me.uid), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      if (snap.empty) {
        container.innerHTML = `<div class="empty-state"><p>No transactions yet.</p></div>`;
        return;
      }

      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      const html = items.map((t) => {
        const when = t.createdAt?.toDate?.()?.toLocaleDateString?.() || '';
        const label = t.type === 'sale' ? 'Sold' : 'Purchased';
        const amount = t.price ? ` - ₹${t.price}` : '';
        return `
          <div class="transaction-item">
            <div class="transaction-info">
              <div class="transaction-type">${label}: ${t.itemTitle || ''}</div>
              <div class="transaction-date">${when}</div>
            </div>
            <div class="transaction-points">+5</div>
          </div>
        `;
      }).join('');
      container.innerHTML = html;
    } catch (e) {
      console.error('Failed to load transactions:', e);
      container.innerHTML = `<div class="empty-state"><p>Failed to load transactions.</p></div>`;
    }
  }
}

class Help {
  init() {
    console.log("Help section initialized.");
  }
}

function initializeGlobalEventListeners() {
  document.body.addEventListener("click", async (e) => {
    const target = e.target;
    const modal = target.closest(".modal");

    // --- Modal Close Buttons ---
    if (
      target.id === "cancelEditName" ||
      target.id === "cancelChangePassword" ||
      target.id === "closeModal" ||
      target.id === "cancelRemove" ||
      target.id === "cancelBoost" ||
      target.id === "cancelDeleteAccount" || // Merged
      target.classList.contains("modal-overlay")
    ) {
      if (modal) {
        modal.classList.add("hidden");
        document.body.classList.remove("modal-open");
      }
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
          document.body.classList.remove("modal-open");
        }
      }
    }
    if (target.closest("#confirmDeleteAccount")) {
      // Merged
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

    this.navigation.init();

    // IMPORTANT: Wait for marketplace data to load before initializing other components
    await this.marketplace.init();

    this.postItem.init();
    this.chat.init();
    this.profile.init(); // Now this runs AFTER items are loaded
    this.help.init();

    initializeGlobalEventListeners();

    document.querySelectorAll(".btn").forEach((btn) => {
      btn.addEventListener("click", (e) => utils.createRipple(e, btn));
    });

    console.log("App initialized successfully");
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