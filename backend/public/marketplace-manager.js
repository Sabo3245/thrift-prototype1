// marketplace-manager.js - Complete marketplace functionality for CampusKart
// Handles item posting, loading, displaying, and interactions

class MarketplaceManager {
  constructor() {
    this.auth = null;
    this.db = null;
    this.storage = null;
    this.modules = null;
    this.currentUser = null;
    this.allItems = [];
    this.filteredItems = [];
    this.uploadedImages = [];
    this.isInitialized = false;

    console.log('🏪 MarketplaceManager initialized');
    this.waitForFirebase();
  }

  async waitForFirebase() {
    return new Promise((resolve) => {
      const checkFirebase = () => {
        if (window.firebaseAuth && window.firebaseDb && window.firebaseStorage && window.firebaseModules) {
          console.log('✅ Firebase detected for marketplace manager');
          this.auth = window.firebaseAuth;
          this.db = window.firebaseDb;
          this.storage = window.firebaseStorage;
          this.modules = window.firebaseModules;
          this.setupMarketplace();
          resolve();
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
    });
  }

  async setupMarketplace() {
    console.log('🔄 Setting up marketplace functionality...');
    
    // Wait for user session manager to be ready
    this.waitForUserSession();
    
    // Setup event listeners
    this.setupFormHandlers();
    this.setupSearchAndFilters();
    this.setupImageUpload();
    
    // Load marketplace items
    await this.loadMarketplaceItems();
    
    this.isInitialized = true;
    console.log('✅ Marketplace manager ready');
  }

  waitForUserSession() {
    const checkUserSession = () => {
      if (window.userSessionManager && window.userSessionManager.currentUser) {
        this.currentUser = window.userSessionManager.currentUser;
        console.log('👤 User session connected to marketplace');
      } else {
        setTimeout(checkUserSession, 100);
      }
    };
    checkUserSession();
  }

  setupFormHandlers() {
    console.log('📝 Setting up post form handlers...');
    
    // Post form submission
    const postForm = document.getElementById('postForm');
    if (postForm) {
      postForm.addEventListener('submit', this.handleItemPost.bind(this));
    }

    // Category change handler for clothing details
    const categorySelect = document.getElementById('itemCategory');
    if (categorySelect) {
      categorySelect.addEventListener('change', this.handleCategoryChange.bind(this));
    }

    // Price calculation for savings display
    const priceInputs = document.querySelectorAll('#itemPrice, #itemOriginalPrice');
    priceInputs.forEach(input => {
      input.addEventListener('input', this.calculateSavings.bind(this));
    });
  }

  setupSearchAndFilters() {
    console.log('🔍 Setting up search and filter functionality...');
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
    }

    // Filter selects
    const filters = ['categoryFilter', 'conditionFilter', 'hostelFilter'];
    filters.forEach(filterId => {
      const filter = document.getElementById(filterId);
      if (filter) {
        filter.addEventListener('change', this.applyFilters.bind(this));
      }
    });
  }

  setupImageUpload() {
    console.log('📸 Setting up image upload functionality...');
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('itemPhotos');
    
    if (uploadArea && fileInput) {
      // Drag and drop handlers
      uploadArea.addEventListener('click', () => fileInput.click());
      uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
      uploadArea.addEventListener('drop', this.handleDrop.bind(this));
      
      // File input change
      fileInput.addEventListener('change', this.handleFileSelect.bind(this));
    }
  }

  async handleItemPost(event) {
    event.preventDefault();
    
    if (!this.currentUser) {
      this.showMessage('Please sign in to post items', 'error');
      return;
    }

    console.log('📝 Processing item post...');
    
    // Show loading state
    this.setFormLoading(true);
    
    try {
      // Collect form data
      const itemData = this.collectFormData();
      
      // Validate data
      if (!this.validateItemData(itemData)) {
        this.setFormLoading(false);
        return;
      }

      // Upload images first
      const imageUrls = await this.uploadImages();
      itemData.images = imageUrls;

      // Add metadata
      itemData.sellerId = this.currentUser.uid;
      itemData.sellerName = window.userSessionManager?.userData?.firstName + ' ' + window.userSessionManager?.userData?.lastName || this.currentUser.email;
      itemData.sellerEmail = this.currentUser.email;
      itemData.createdAt = new Date().toISOString();
      itemData.updatedAt = new Date().toISOString();
      itemData.status = 'available';
      itemData.views = 0;
      itemData.hearts = 0;
      itemData.heartedBy = [];
      itemData.id = this.generateItemId();

      // Save to Firestore
      await this.saveItemToDatabase(itemData);
      
      // Update user's listing count
      await this.updateUserListingCount();
      
      // Reset form
      this.resetForm();
      
      // Reload marketplace
      await this.loadMarketplaceItems();
      
      // Switch to marketplace view
      this.switchToMarketplace();
      
      this.showMessage('Item posted successfully! 🎉', 'success');
      console.log('✅ Item posted successfully');
      
    } catch (error) {
      console.error('❌ Error posting item:', error);
      this.showMessage('Failed to post item. Please try again.', 'error');
    } finally {
      this.setFormLoading(false);
    }
  }

  collectFormData() {
    const formData = {
      title: document.getElementById('itemTitle').value.trim(),
      category: document.getElementById('itemCategory').value,
      condition: document.getElementById('itemCondition').value,
      price: parseFloat(document.getElementById('itemPrice').value),
      originalPrice: parseFloat(document.getElementById('itemOriginalPrice').value) || null,
      hostel: document.getElementById('itemHostel').value,
      description: document.getElementById('itemDescription').value.trim(),
    };

    // Add clothing-specific data if applicable
    if (formData.category === 'Clothes') {
      const clothingDetails = {
        quality: document.getElementById('clothingQuality')?.value || null,
        age: document.getElementById('clothingAge')?.value || null,
        detailedCondition: document.getElementById('clothingCondition')?.value || null
      };
      formData.clothingDetails = clothingDetails;
    }

    // Calculate savings percentage
    if (formData.originalPrice && formData.originalPrice > formData.price) {
      formData.savingsPercentage = Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100);
      formData.savedAmount = formData.originalPrice - formData.price;
    }

    return formData;
  }

  validateItemData(data) {
    const requiredFields = ['title', 'category', 'condition', 'price', 'hostel', 'description'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        this.showMessage(`Please fill in the ${field} field`, 'error');
        return false;
      }
    }

    if (data.price <= 0) {
      this.showMessage('Price must be greater than 0', 'error');
      return false;
    }

    if (data.title.length < 3) {
      this.showMessage('Title must be at least 3 characters long', 'error');
      return false;
    }

    if (data.description.length < 10) {
      this.showMessage('Description must be at least 10 characters long', 'error');
      return false;
    }

    return true;
  }

  async uploadImages() {
    if (this.uploadedImages.length === 0) {
      return [];
    }

    console.log(`📤 Uploading ${this.uploadedImages.length} images...`);
    const uploadPromises = this.uploadedImages.map(async (file, index) => {
      const fileName = `items/${this.currentUser.uid}/${Date.now()}_${index}_${file.name}`;
      const storageRef = this.modules.ref(this.storage, fileName);
      
      const snapshot = await this.modules.uploadBytes(storageRef, file);
      const downloadURL = await this.modules.getDownloadURL(snapshot.ref);
      
      return downloadURL;
    });

    const imageUrls = await Promise.all(uploadPromises);
    console.log('✅ Images uploaded successfully');
    return imageUrls;
  }

  async saveItemToDatabase(itemData) {
    console.log('💾 Saving item to database...');
    
    const itemRef = this.modules.doc(this.db, 'items', itemData.id);
    await this.modules.setDoc(itemRef, itemData);
    
    console.log('✅ Item saved to database');
  }

  async updateUserListingCount() {
    if (!window.userSessionManager?.userData) return;
    
    try {
      const userRef = this.modules.doc(this.db, 'users', this.currentUser.uid);
      const currentListings = window.userSessionManager.userData.listings || [];
      
      await this.modules.updateDoc(userRef, {
        listings: [...currentListings, this.generateItemId()],
        totalListings: currentListings.length + 1
      });
      
      // Award points for posting
      if (window.userSessionManager.userData.points !== undefined) {
        await this.modules.updateDoc(userRef, {
          points: window.userSessionManager.userData.points + 2 // 2 points for posting
        });
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to update user listing count:', error);
    }
  }

  async loadMarketplaceItems() {
    console.log('🔄 Loading marketplace items...');
    
    try {
      this.showLoadingState(true);
      
      const itemsRef = this.modules.collection(this.db, 'items');
      const querySnapshot = await this.modules.getDocs(
        this.modules.query(
          itemsRef, 
          this.modules.where('status', '==', 'available'),
          this.modules.orderBy('createdAt', 'desc')
        )
      );
      
      this.allItems = [];
      querySnapshot.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() };
        this.allItems.push(item);
      });
      
      this.filteredItems = [...this.allItems];
      this.renderMarketplaceItems();
      
      console.log(`✅ Loaded ${this.allItems.length} marketplace items`);
      
    } catch (error) {
      console.error('❌ Error loading marketplace items:', error);
      this.showMessage('Failed to load marketplace items', 'error');
    } finally {
      this.showLoadingState(false);
    }
  }

  renderMarketplaceItems() {
    const itemsGrid = document.getElementById('itemsGrid');
    if (!itemsGrid) return;

    if (this.filteredItems.length === 0) {
      itemsGrid.innerHTML = `
        <div class="no-items-message">
          <div class="no-items-icon">🛒</div>
          <h3>No items found</h3>
          <p>Be the first to post an item or try adjusting your filters!</p>
        </div>
      `;
      return;
    }

    itemsGrid.innerHTML = this.filteredItems.map(item => this.createItemCard(item)).join('');
    
    // Add event listeners to cards
    this.attachItemCardListeners();
  }

  createItemCard(item) {
    const primaryImage = item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/300x200?text=No+Image';
    const savingsText = item.savingsPercentage ? `${item.savingsPercentage}% off` : '';
    const originalPriceText = item.originalPrice ? `₹${item.originalPrice}` : '';
    
    return `
      <div class="item-card glass-card" data-item-id="${item.id}">
        <div class="item-image-container">
          <img src="${primaryImage}" alt="${item.title}" class="item-image" />
          ${savingsText ? `<span class="savings-badge">${savingsText}</span>` : ''}
          <button class="heart-btn ${item.heartedBy?.includes(this.currentUser?.uid) ? 'hearted' : ''}" 
                  data-item-id="${item.id}">
            <span class="heart-icon">♡</span>
            <span class="heart-count">${item.hearts || 0}</span>
          </button>
        </div>
        
        <div class="item-details">
          <h3 class="item-title">${item.title}</h3>
          <div class="item-meta">
            <span class="item-category">${item.category}</span>
            <span class="item-condition">${item.condition}</span>
            <span class="item-hostel">${item.hostel} Hostel</span>
          </div>
          
          <div class="price-container">
            <span class="current-price">₹${item.price}</span>
            ${originalPriceText ? `<span class="original-price">${originalPriceText}</span>` : ''}
          </div>
          
          <p class="item-description">${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}</p>
          
          <div class="item-footer">
            <div class="seller-info">
              <span class="seller-name">By ${item.sellerName}</span>
              <span class="post-date">${this.formatDate(item.createdAt)}</span>
            </div>
            
            <div class="item-actions">
              <button class="btn btn--secondary btn--small contact-btn" data-item-id="${item.id}">
                Contact Seller
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachItemCardListeners() {
    // Heart buttons
    document.querySelectorAll('.heart-btn').forEach(btn => {
      btn.addEventListener('click', this.handleHeartToggle.bind(this));
    });
    
    // Contact buttons
    document.querySelectorAll('.contact-btn').forEach(btn => {
      btn.addEventListener('click', this.handleContactSeller.bind(this));
    });
    
    // Item card clicks for detail view
    document.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', this.handleItemClick.bind(this));
    });
  }

  async handleHeartToggle(event) {
    event.stopPropagation();
    
    if (!this.currentUser) {
      this.showMessage('Please sign in to heart items', 'error');
      return;
    }
    
    const itemId = event.target.closest('.heart-btn').dataset.itemId;
    const item = this.allItems.find(i => i.id === itemId);
    
    if (!item) return;
    
    try {
      const isHearted = item.heartedBy?.includes(this.currentUser.uid) || false;
      const newHeartedBy = isHearted 
        ? item.heartedBy.filter(uid => uid !== this.currentUser.uid)
        : [...(item.heartedBy || []), this.currentUser.uid];
      
      const itemRef = this.modules.doc(this.db, 'items', itemId);
      await this.modules.updateDoc(itemRef, {
        heartedBy: newHeartedBy,
        hearts: newHeartedBy.length
      });
      
      // Update local data
      item.heartedBy = newHeartedBy;
      item.hearts = newHeartedBy.length;
      
      // Update UI
      const heartBtn = event.target.closest('.heart-btn');
      heartBtn.classList.toggle('hearted', !isHearted);
      heartBtn.querySelector('.heart-count').textContent = item.hearts;
      
    } catch (error) {
      console.error('❌ Error toggling heart:', error);
      this.showMessage('Failed to update heart status', 'error');
    }
  }

  handleContactSeller(event) {
    event.stopPropagation();
    
    if (!this.currentUser) {
      this.showMessage('Please sign in to contact sellers', 'error');
      return;
    }
    
    const itemId = event.target.dataset.itemId;
    const item = this.allItems.find(i => i.id === itemId);
    
    if (item && item.sellerId === this.currentUser.uid) {
      this.showMessage('You cannot contact yourself!', 'error');
      return;
    }
    
    // Open chat or contact modal
    this.openContactModal(item);
  }

  handleItemClick(event) {
    if (event.target.closest('.heart-btn') || event.target.closest('.contact-btn')) {
      return; // Don't open detail view for button clicks
    }
    
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.allItems.find(i => i.id === itemId);
    
    if (item) {
      this.openItemDetailModal(item);
      this.incrementItemViews(itemId);
    }
  }

  // Search and filter functionality
  handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    this.applyFilters(query);
  }

  applyFilters(searchQuery = '') {
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const conditionFilter = document.getElementById('conditionFilter')?.value || '';
    const hostelFilter = document.getElementById('hostelFilter')?.value || '';
    const searchInput = document.getElementById('searchInput')?.value.toLowerCase().trim() || searchQuery;
    
    this.filteredItems = this.allItems.filter(item => {
      const matchesSearch = !searchInput || 
        item.title.toLowerCase().includes(searchInput) ||
        item.description.toLowerCase().includes(searchInput) ||
        item.category.toLowerCase().includes(searchInput);
      
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesCondition = !conditionFilter || item.condition === conditionFilter;
      const matchesHostel = !hostelFilter || item.hostel === hostelFilter;
      
      return matchesSearch && matchesCategory && matchesCondition && matchesHostel;
    });
    
    this.renderMarketplaceItems();
    console.log(`🔍 Filtered to ${this.filteredItems.length} items`);
  }

  // Utility functions
  generateItemId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
  }

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
  }

  // UI helper functions
  setFormLoading(loading) {
    const submitBtn = document.querySelector('#postForm button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    if (loading) {
      submitBtn.disabled = true;
      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');
    } else {
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
    }
  }

  showLoadingState(show) {
    const loadingMore = document.getElementById('loadingMore');
    const itemsGrid = document.getElementById('itemsGrid');
    
    if (show) {
      loadingMore?.classList.remove('hidden');
      if (itemsGrid) itemsGrid.style.opacity = '0.5';
    } else {
      loadingMore?.classList.add('hidden');
      if (itemsGrid) itemsGrid.style.opacity = '1';
    }
  }

  showMessage(message, type = 'info') {
    // Create or update message display
    let messageEl = document.getElementById('marketplaceMessage');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'marketplaceMessage';
      messageEl.className = 'marketplace-message';
      document.body.appendChild(messageEl);
    }
    
    messageEl.className = `marketplace-message ${type}`;
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }

  resetForm() {
    document.getElementById('postForm').reset();
    this.uploadedImages = [];
    document.getElementById('uploadedImages').innerHTML = '';
    document.getElementById('clothingChecklist').classList.add('hidden');
  }

  switchToMarketplace() {
    // Switch to marketplace tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    
    document.querySelector('[data-section="marketplace"]').classList.add('active');
    document.getElementById('marketplace').classList.add('active');
  }

  // Category-specific functionality
  handleCategoryChange(event) {
    const category = event.target.value;
    const clothingChecklist = document.getElementById('clothingChecklist');
    
    if (category === 'Clothes') {
      clothingChecklist.classList.remove('hidden');
    } else {
      clothingChecklist.classList.add('hidden');
    }
  }

  calculateSavings() {
    const currentPrice = parseFloat(document.getElementById('itemPrice').value) || 0;
    const originalPrice = parseFloat(document.getElementById('itemOriginalPrice').value) || 0;
    
    if (originalPrice > currentPrice && currentPrice > 0) {
      const savings = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      const savingsAmount = originalPrice - currentPrice;
      
      // You could display this somewhere in the form
      console.log(`💰 Savings: ${savings}% (₹${savingsAmount})`);
    }
  }

  // Image handling functions
  handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
  }

  handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const files = Array.from(event.dataTransfer.files);
    this.processFiles(files);
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    this.processFiles(files);
  }

  processFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      this.showMessage('Please select valid image files', 'error');
      return;
    }
    
    if (this.uploadedImages.length + imageFiles.length > 5) {
      this.showMessage('Maximum 5 images allowed', 'error');
      return;
    }
    
    imageFiles.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        this.showMessage(`Image ${file.name} is too large. Maximum 5MB allowed.`, 'error');
        return;
      }
      
      this.uploadedImages.push(file);
      this.displayUploadedImage(file);
    });
  }

  displayUploadedImage(file) {
    const uploadedImages = document.getElementById('uploadedImages');
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imageContainer = document.createElement('div');
      imageContainer.className = 'uploaded-image-container';
      imageContainer.innerHTML = `
        <img src="${e.target.result}" alt="Uploaded image" class="uploaded-image" />
        <button type="button" class="remove-image-btn" data-file-name="${file.name}">×</button>
      `;
      
      uploadedImages.appendChild(imageContainer);
      
      // Add remove functionality
      imageContainer.querySelector('.remove-image-btn').addEventListener('click', () => {
        this.removeUploadedImage(file.name, imageContainer);
      });
    };
    
    reader.readAsDataURL(file);
  }

  removeUploadedImage(fileName, container) {
    this.uploadedImages = this.uploadedImages.filter(file => file.name !== fileName);
    container.remove();
  }

  // Modal functions (to be implemented)
  openContactModal(item) {
    // Implementation for contact modal
    console.log('Opening contact modal for item:', item.id);
    // TODO: Implement contact modal
  }

  openItemDetailModal(item) {
    // Implementation for item detail modal
    console.log('Opening detail modal for item:', item.id);
    // TODO: Implement detail modal
  }

  async incrementItemViews(itemId) {
    try {
      const itemRef = this.modules.doc(this.db, 'items', itemId);
      const item = this.allItems.find(i => i.id === itemId);
      if (item) {
        await this.modules.updateDoc(itemRef, {
          views: (item.views || 0) + 1
        });
        item.views = (item.views || 0) + 1;
      }
    } catch (error) {
      console.warn('Failed to increment views:', error);
    }
  }
}

// Initialize marketplace manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.marketplaceManager = new MarketplaceManager();
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarketplaceManager;
}