// API Configuration
const API_BASE_URL = 'https://backend-k4dg.onrender.com/api';
const SOCKET_URL = 'https://backend-k4dg.onrender.com';

// Global State
let currentUser = null;
let authToken = null;
let socket = null;
let currentPage = 1;
let hasMore = true;
let currentFilters = {};
let currentChatId = null;
let items = [];
let isOfflineMode = false;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

async function initializeApp() {
    console.log('Starting app initialization...');
    showLoading();
    
    try {
        // Set a shorter timeout for initialization
        const initPromise = performInitialization();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Initialization timeout')), 5000);
        });
        
        await Promise.race([initPromise, timeoutPromise]);
        
    } catch (error) {
        console.error('App initialization failed:', error);
        // Always proceed to show the app, even if backend is down
        handleInitializationFailure();
    }
    
    // Setup event listeners regardless of backend status
    setupEventListeners();
    console.log('App initialization complete');
}

async function performInitialization() {
    // Check for existing auth token
    authToken = localStorage.getItem('auth_token');
    
    if (authToken) {
        console.log('Found existing token, validating...');
        try {
            await loadCurrentUser();
            console.log('Token valid, initializing authenticated app...');
            await initializeAuthenticatedApp();
        } catch (error) {
            console.error('Token validation failed:', error);
            localStorage.removeItem('auth_token');
            authToken = null;
            currentUser = null;
            showAuthenticatedFailure();
        }
    } else {
        console.log('No token found, showing auth...');
        showAuthContainer();
    }
    
    hideLoading();
}

function handleInitializationFailure() {
    console.log('Handling initialization failure - entering offline mode');
    isOfflineMode = true;
    hideLoading();
    
    // If we had a token, try to show the app anyway
    if (authToken) {
        // Try to get user data from localStorage backup
        const backupUser = localStorage.getItem('backup_user');
        if (backupUser) {
            try {
                currentUser = JSON.parse(backupUser);
                console.log('Using backup user data:', currentUser);
                showAppContainer();
                hideAuthContainer();
                loadDemoItems();
                showView('home');
                showToast('Working offline - some features may not be available', 'info');
                return;
            } catch (e) {
                console.error('Failed to parse backup user:', e);
            }
        }
    }
    
    // Default to showing auth
    showAuthContainer();
    showToast('Unable to connect to server. You can still browse demo items.', 'error');
}

function showAuthenticatedFailure() {
    hideLoading();
    showAuthContainer();
    showToast('Session expired. Please log in again.', 'info');
}

async function loadCurrentUser() {
    try {
        const response = await apiCall('/auth/me', 'GET');
        currentUser = response.user;
        // Backup user data to localStorage
        localStorage.setItem('backup_user', JSON.stringify(currentUser));
        console.log('Current user loaded:', currentUser);
    } catch (error) {
        console.error('Failed to load current user:', error);
        throw error;
    }
}

async function initializeAuthenticatedApp() {
    hideLoading();
    hideAuthContainer();
    showAppContainer();
    
    // Initialize Socket.io (with error handling)
    try {
        initializeSocket();
    } catch (error) {
        console.error('Socket initialization failed:', error);
    }
    
    // Load initial data with fallbacks
    try {
        await loadItems();
    } catch (error) {
        console.error('Failed to load items from API, using demo data:', error);
        loadDemoItems();
    }
    
    try {
        await loadUserProfile();
    } catch (error) {
        console.error('Failed to load user profile:', error);
        // Set default profile values
        setDefaultProfile();
    }
    
    showView('home');
    showToast(`Welcome ${currentUser?.name || 'back'}!`, 'success');
}

function setDefaultProfile() {
    window.userListings = [];
    window.heartedItems = [];
    window.userChats = [];
    
    const userPointsEl = document.getElementById('user-points');
    const itemsSoldEl = document.getElementById('items-sold');
    const moneySavedEl = document.getElementById('money-saved');
    
    if (userPointsEl) userPointsEl.textContent = '0';
    if (itemsSoldEl) itemsSoldEl.textContent = '0';
    if (moneySavedEl) moneySavedEl.textContent = '₹0';
}

function initializeSocket() {
    if (isOfflineMode) {
        console.log('Offline mode - skipping socket initialization');
        return;
    }
    
    try {
        socket = io(SOCKET_URL, {
            auth: {
                token: authToken
            },
            timeout: 3000,
            forceNew: true
        });
        
        socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
        
        socket.on('new_message', handleNewMessage);
        socket.on('new_item', handleNewItem);
        socket.on('item_hearted', handleItemHearted);
        socket.on('item_boosted', handleItemBoosted);
    } catch (error) {
        console.error('Socket initialization error:', error);
    }
}

// API Helper Function with better error handling
async function apiCall(endpoint, method = 'GET', data = null, isFormData = false) {
    if (isOfflineMode) {
        throw new Error('Offline mode - API calls unavailable');
    }
    
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {};
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (!isFormData && data) {
        headers['Content-Type'] = 'application/json';
    }
    
    const config = {
        method,
        headers
    };
    
    if (data) {
        config.body = isFormData ? data : JSON.stringify(data);
    }
    
    try {
        console.log(`Making API call: ${method} ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        config.signal = controller.signal;
        
        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        
        console.log(`API response status: ${response.status}`);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: `HTTP error! status: ${response.status}` };
            }
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API call successful');
        return result;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Connection timeout. Please check your internet connection.');
        } else if (error.message.includes('Failed to fetch')) {
            throw new Error('Unable to connect to server. Please try again later.');
        }
        
        console.error('API call failed:', error);
        throw error;
    }
}

// Event Listeners Setup
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Auth forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');
    
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });
    if (showLoginBtn) showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    
    // Navigation
    const postItemBtn = document.getElementById('post-item-btn');
    const profileBtn = document.getElementById('profile-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (postItemBtn) postItemBtn.addEventListener('click', showPostModal);
    if (profileBtn) profileBtn.addEventListener('click', () => showView('profile'));
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Modals
    const closePostModal = document.getElementById('close-post-modal');
    const cancelPost = document.getElementById('cancel-post');
    const closeItemModal = document.getElementById('close-item-modal');
    const closeChatModal = document.getElementById('close-chat-modal');
    const postItemForm = document.getElementById('post-item-form');
    
    if (closePostModal) closePostModal.addEventListener('click', hidePostModal);
    if (cancelPost) cancelPost.addEventListener('click', hidePostModal);
    if (closeItemModal) closeItemModal.addEventListener('click', hideItemModal);
    if (closeChatModal) closeChatModal.addEventListener('click', hideChatModal);
    if (postItemForm) postItemForm.addEventListener('submit', handlePostItem);
    
    // Search and filters
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const conditionFilter = document.getElementById('condition-filter');
    const hostelFilter = document.getElementById('hostel-filter');
    
    if (searchInput) searchInput.addEventListener('input', debounce(handleSearch, 300));
    if (categoryFilter) categoryFilter.addEventListener('change', handleFilterChange);
    if (conditionFilter) conditionFilter.addEventListener('change', handleFilterChange);
    if (hostelFilter) hostelFilter.addEventListener('change', handleFilterChange);
    
    // Load more
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreItems);
    
    // Profile tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
    
    // Chat
    const sendMessageBtn = document.getElementById('send-message');
    const messageInput = document.getElementById('message-input');
    
    if (sendMessageBtn) sendMessageBtn.addEventListener('click', sendMessage);
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Modal backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
    
    console.log('Event listeners setup complete');
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    console.log('Handling login...');
    
    const formData = new FormData(e.target);
    const credentials = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    // Validate input
    if (!credentials.email || !credentials.password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
        const response = await apiCall('/auth/login', 'POST', credentials);
        authToken = response.token;
        currentUser = response.user;
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('backup_user', JSON.stringify(currentUser));
        
        await initializeAuthenticatedApp();
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message || 'Login failed. Please try again.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    console.log('Handling registration...');
    
    const formData = new FormData(e.target);
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        hostel: formData.get('hostel'),
        password: formData.get('password')
    };
    
    // Validate input
    if (!userData.name || !userData.email || !userData.hostel || !userData.password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;
    
    try {
        const response = await apiCall('/auth/register', 'POST', userData);
        authToken = response.token;
        currentUser = response.user;
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('backup_user', JSON.stringify(currentUser));
        
        await initializeAuthenticatedApp();
    } catch (error) {
        console.error('Registration error:', error);
        showToast(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function handleLogout() {
    console.log('Handling logout...');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('backup_user');
    authToken = null;
    currentUser = null;
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    hideAppContainer();
    showAuthContainer();
    showToast('Logged out successfully', 'info');
}

// Item Management Functions
async function loadItems(reset = false) {
    console.log('Loading items...');
    
    if (reset) {
        currentPage = 1;
        hasMore = true;
        items = [];
    }
    
    try {
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: 12,
            ...currentFilters
        });
        
        const response = await apiCall(`/items?${queryParams}`);
        
        if (reset) {
            items = response.items || [];
        } else {
            items = [...items, ...(response.items || [])];
        }
        
        hasMore = response.hasMore || false;
        currentPage++;
        
        renderItems();
        updateLoadMoreButton();
        console.log(`Loaded ${items.length} items`);
    } catch (error) {
        console.error('Failed to load items:', error);
        if (reset || items.length === 0) {
            loadDemoItems();
        }
        showToast('Using demo data - some features may not work', 'info');
    }
}

function loadDemoItems() {
    console.log('Loading demo items...');
    items = createDemoItems();
    hasMore = false;
    renderItems();
    updateLoadMoreButton();
}

function createDemoItems() {
    return [
        {
            id: 'demo-1',
            title: 'Vintage Denim Jacket',
            description: 'Classic vintage denim jacket in excellent condition. Perfect for any casual outfit!',
            category: 'Clothes',
            condition: 'Used',
            price: 800,
            originalPrice: 2000,
            seller: { name: 'Demo User', hostel: 'Boys' },
            sellerId: 'demo-seller-1',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            hearts: [],
            images: []
        },
        {
            id: 'demo-2',
            title: 'Engineering Textbook Set',
            description: 'Complete set of engineering textbooks for Computer Science. All books in good condition.',
            category: 'Books',
            condition: 'Used',
            price: 1500,
            originalPrice: 5000,
            seller: { name: 'Study Helper', hostel: 'Girls' },
            sellerId: 'demo-seller-2',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            hearts: [],
            images: []
        },
        {
            id: 'demo-3',
            title: 'Wireless Headphones',
            description: 'Brand new wireless headphones with noise cancellation. Never used!',
            category: 'Electronics',
            condition: 'New',
            price: 3000,
            originalPrice: 8000,
            seller: { name: 'Tech Seller', hostel: 'Boys' },
            sellerId: 'demo-seller-3',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            hearts: [],
            images: []
        },
        {
            id: 'demo-4',
            title: 'Designer Handbag',
            description: 'Elegant designer handbag, barely used. Perfect for special occasions.',
            category: 'Clothes',
            condition: 'Unused',
            price: 2500,
            originalPrice: 6000,
            seller: { name: 'Fashion Lover', hostel: 'Girls' },
            sellerId: 'demo-seller-4',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            hearts: [],
            images: []
        },
        {
            id: 'demo-5',
            title: 'Gaming Keyboard',
            description: 'Mechanical gaming keyboard with RGB lighting. Great for gaming and coding.',
            category: 'Electronics',
            condition: 'Used',
            price: 2000,
            originalPrice: 5500,
            seller: { name: 'Gamer Pro', hostel: 'Boys' },
            sellerId: 'demo-seller-5',
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            hearts: [],
            images: []
        },
        {
            id: 'demo-6',
            title: 'Premium Skincare Set',
            description: 'Complete skincare routine set from premium brands. All products are unopened.',
            category: 'Cosmetics',
            condition: 'New',
            price: 1200,
            originalPrice: 3000,
            seller: { name: 'Beauty Enthusiast', hostel: 'Girls' },
            sellerId: 'demo-seller-6',
            createdAt: new Date(Date.now() - 432000000).toISOString(),
            hearts: [],
            images: []
        }
    ];
}

async function loadMoreItems() {
    if (hasMore && !isOfflineMode) {
        await loadItems();
    }
}

function renderItems() {
    const grid = document.getElementById('items-grid');
    if (!grid) return;
    
    // Apply current filters to demo items if in offline mode
    let filteredItems = items;
    if (currentFilters && Object.keys(currentFilters).length > 0) {
        filteredItems = items.filter(item => {
            let matches = true;
            
            if (currentFilters.search) {
                const searchTerm = currentFilters.search.toLowerCase();
                matches = matches && (
                    item.title.toLowerCase().includes(searchTerm) ||
                    item.description.toLowerCase().includes(searchTerm)
                );
            }
            
            if (currentFilters.category) {
                matches = matches && item.category === currentFilters.category;
            }
            
            if (currentFilters.condition) {
                matches = matches && item.condition === currentFilters.condition;
            }
            
            if (currentFilters.hostel) {
                matches = matches && item.seller.hostel === currentFilters.hostel;
            }
            
            return matches;
        });
    }
    
    if (filteredItems.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📦</div>
                <h3 class="empty-state-title">No items found</h3>
                <p class="empty-state-description">Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredItems.map(item => createItemCard(item)).join('');
    
    // Add event listeners to item cards
    grid.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.heart-btn') && !e.target.closest('.boost-btn')) {
                showItemDetail(card.dataset.itemId);
            }
        });
    });
    
    // Add event listeners to heart and boost buttons
    grid.querySelectorAll('.heart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleHeart(btn.dataset.itemId);
        });
    });
    
    grid.querySelectorAll('.boost-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            boostItem(btn.dataset.itemId);
        });
    });
}

function createItemCard(item) {
    const timeAgo = getTimeAgo(new Date(item.createdAt));
    const isHearted = currentUser && item.hearts?.includes(currentUser.id);
    const isBoosted = item.boostedAt && new Date(item.boostedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return `
        <div class="item-card" data-item-id="${item.id}">
            <div class="item-image">
                ${item.images && item.images.length > 0 ? 
                    `<img src="${item.images[0]}" alt="${item.title}" onerror="this.parentElement.innerHTML='<div class=&quot;item-placeholder&quot;>📷</div>'">` :
                    `<div class="item-placeholder">📷</div>`
                }
                <div class="item-badges">
                    ${isBoosted ? '<span class="item-badge badge-boosted">Boosted</span>' : ''}
                    ${item.condition === 'New' ? '<span class="item-badge badge-new">New</span>' : ''}
                </div>
                <div class="item-actions">
                    <button class="heart-btn ${isHearted ? 'hearted' : ''}" data-item-id="${item.id}">
                        ${isHearted ? '❤️' : '🤍'}
                    </button>
                    ${currentUser && item.sellerId !== currentUser.id ? `
                        <button class="boost-btn" data-item-id="${item.id}">⚡</button>
                    ` : ''}
                </div>
            </div>
            <div class="item-content">
                <h3 class="item-title">${item.title}</h3>
                <p class="item-description">${item.description}</p>
                <div class="item-meta">
                    <div class="item-pricing">
                        <span class="item-price">₹${item.price}</span>
                        ${item.originalPrice ? `<span class="item-original-price">₹${item.originalPrice}</span>` : ''}
                    </div>
                    <span class="item-category">${item.category}</span>
                </div>
                <div class="item-footer">
                    <span class="item-seller">${item.seller.name}</span>
                    <span class="item-time">${timeAgo}</span>
                </div>
            </div>
        </div>
    `;
}

async function showItemDetail(itemId) {
    try {
        let item;
        
        // Try to get from API first, fallback to local items
        if (!isOfflineMode) {
            try {
                const response = await apiCall(`/items/${itemId}`);
                item = response.item;
            } catch (error) {
                console.log('API call failed, using local item');
                item = items.find(i => i.id === itemId);
            }
        } else {
            item = items.find(i => i.id === itemId);
        }
        
        if (!item) {
            throw new Error('Item not found');
        }
        
        const modal = document.getElementById('item-modal');
        const content = document.getElementById('item-detail-content');
        
        content.innerHTML = `
            <div class="item-detail">
                <div class="item-detail-header">
                    <div class="item-detail-image">
                        ${item.images && item.images.length > 0 ? 
                            `<img src="${item.images[0]}" alt="${item.title}" onerror="this.parentElement.innerHTML='<div class=&quot;item-placeholder&quot;>📷</div>'">` :
                            `<div class="item-placeholder">📷</div>`
                        }
                    </div>
                    <div class="item-detail-info">
                        <h2 class="item-detail-title">${item.title}</h2>
                        <div class="item-detail-price">
                            ₹${item.price}
                            ${item.originalPrice ? `<span class="item-original-price">₹${item.originalPrice}</span>` : ''}
                        </div>
                        <div class="item-detail-meta">
                            <div class="meta-item">
                                <span class="meta-label">Category</span>
                                <span class="meta-value">${item.category}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Condition</span>
                                <span class="meta-value">${item.condition}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Seller</span>
                                <span class="meta-value">${item.seller.name}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Hostel</span>
                                <span class="meta-value">${item.seller.hostel}</span>
                            </div>
                        </div>
                        <div class="item-detail-actions">
                            ${currentUser && item.sellerId !== currentUser.id ? `
                                <button class="btn btn--primary" onclick="startChat('${item.sellerId}', '${item.id}')">
                                    💬 Message Seller
                                </button>
                                <button class="btn btn--outline" onclick="toggleHeart('${item.id}')">
                                    ${item.hearts?.includes(currentUser.id) ? '❤️ Hearted' : '🤍 Heart'}
                                </button>
                            ` : currentUser ? `
                                <button class="btn btn--outline" onclick="editItem('${item.id}')">Edit Item</button>
                                <button class="btn btn--outline" onclick="deleteItem('${item.id}')">Delete Item</button>
                            ` : `
                                <button class="btn btn--outline" onclick="showToast('Please log in to interact with items', 'info')">
                                    💬 Message Seller
                                </button>
                            `}
                        </div>
                    </div>
                </div>
                <div class="item-detail-description">
                    <h4>Description</h4>
                    <p>${item.description}</p>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    } catch (error) {
        showToast('Failed to load item details', 'error');
    }
}

async function toggleHeart(itemId) {
    if (!currentUser) {
        showToast('Please log in to heart items', 'info');
        return;
    }
    
    try {
        if (!isOfflineMode) {
            await apiCall(`/items/${itemId}/heart`, 'POST');
        }
        
        // Update local state
        const itemIndex = items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            const item = items[itemIndex];
            if (item.hearts?.includes(currentUser.id)) {
                item.hearts = item.hearts.filter(id => id !== currentUser.id);
                showToast('Item removed from hearts', 'info');
            } else {
                item.hearts = [...(item.hearts || []), currentUser.id];
                showToast('Item added to hearts', 'success');
            }
            
            // Re-render items
            renderItems();
        }
        
    } catch (error) {
        showToast(isOfflineMode ? 'Hearts not available in offline mode' : 'Failed to update heart', 'error');
    }
}

async function boostItem(itemId) {
    if (!currentUser) {
        showToast('Please log in to boost items', 'info');
        return;
    }
    
    if (isOfflineMode) {
        showToast('Boost not available in offline mode', 'error');
        return;
    }
    
    try {
        await apiCall(`/items/${itemId}/boost`, 'POST');
        showToast('Item boosted successfully!', 'success');
        await loadItems(true);
        await loadUserProfile();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handlePostItem(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('Please log in to post items', 'info');
        return;
    }
    
    if (isOfflineMode) {
        showToast('Posting items not available in offline mode', 'error');
        return;
    }
    
    const formData = new FormData(e.target);
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Posting...';
    submitBtn.disabled = true;
    
    try {
        const response = await apiCall('/items', 'POST', formData, true);
        showToast('Item posted successfully!', 'success');
        hidePostModal();
        await loadItems(true);
        e.target.reset();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Search and Filter Functions
function handleSearch(e) {
    currentFilters.search = e.target.value;
    if (isOfflineMode) {
        renderItems(); // Just re-render with filters for demo items
    } else {
        loadItems(true);
    }
}

function handleFilterChange() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const conditionFilter = document.getElementById('condition-filter');
    const hostelFilter = document.getElementById('hostel-filter');
    
    currentFilters = {
        category: categoryFilter?.value || '',
        condition: conditionFilter?.value || '',
        hostel: hostelFilter?.value || '',
        search: searchInput?.value || ''
    };
    
    // Remove empty filters
    Object.keys(currentFilters).forEach(key => {
        if (!currentFilters[key]) {
            delete currentFilters[key];
        }
    });
    
    if (isOfflineMode) {
        renderItems(); // Just re-render with filters for demo items
    } else {
        loadItems(true);
    }
}

// Profile Functions
async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        if (!isOfflineMode) {
            const [profile, listings, hearted] = await Promise.all([
                apiCall('/users/profile').catch(() => ({ points: 0, moneySaved: 0 })),
                apiCall('/users/listings').catch(() => ({ items: [] })),
                apiCall('/users/hearted').catch(() => ({ items: [] }))
            ]);
            
            // Update profile stats
            const userPointsEl = document.getElementById('user-points');
            const itemsSoldEl = document.getElementById('items-sold');
            const moneySavedEl = document.getElementById('money-saved');
            
            if (userPointsEl) userPointsEl.textContent = profile.points || 0;
            if (itemsSoldEl) itemsSoldEl.textContent = listings.items?.length || 0;
            if (moneySavedEl) moneySavedEl.textContent = `₹${profile.moneySaved || 0}`;
            
            // Store data for tab switching
            window.userListings = listings.items || [];
            window.heartedItems = hearted.items || [];
            window.userChats = [];
            
            // Load chats
            await loadChats();
        } else {
            setDefaultProfile();
        }
        
        // Render current tab
        const activeTab = document.querySelector('.tab-btn.active')?.dataset?.tab || 'listings';
        renderTabContent(activeTab);
        
    } catch (error) {
        console.error('Failed to load profile:', error);
        setDefaultProfile();
    }
}

function switchTab(tab) {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tabBtn = document.querySelector(`[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.classList.add('active');
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    
    // Show selected tab content
    const tabContent = document.getElementById(`${tab}-tab`);
    if (tabContent) tabContent.classList.remove('hidden');
    
    renderTabContent(tab);
}

function renderTabContent(tab) {
    switch (tab) {
        case 'listings':
            renderUserListings();
            break;
        case 'hearted':
            renderHeartedItems();
            break;
        case 'chats':
            renderChats();
            break;
    }
}

function renderUserListings() {
    const container = document.getElementById('user-listings');
    if (!container) return;
    
    if (!window.userListings || window.userListings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3 class="empty-state-title">No listings yet</h3>
                <p class="empty-state-description">Start selling by posting your first item</p>
                <button class="btn btn--primary" onclick="showPostModal()">Post Item</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = window.userListings.map(item => createItemCard(item)).join('');
}

function renderHeartedItems() {
    const container = document.getElementById('hearted-items');
    if (!container) return;
    
    if (!window.heartedItems || window.heartedItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💔</div>
                <h3 class="empty-state-title">No hearted items</h3>
                <p class="empty-state-description">Heart items you're interested in to save them here</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = window.heartedItems.map(item => createItemCard(item)).join('');
}

// Chat Functions
async function loadChats() {
    if (isOfflineMode) {
        window.userChats = [];
        return;
    }
    
    try {
        const response = await apiCall('/chats');
        window.userChats = response.chats || [];
    } catch (error) {
        console.error('Failed to load chats:', error);
        window.userChats = [];
    }
}

function renderChats() {
    const container = document.getElementById('chat-list');
    if (!container) return;
    
    if (!window.userChats || window.userChats.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <h3 class="empty-state-title">No messages yet</h3>
                <p class="empty-state-description">Start a conversation by messaging a seller</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = window.userChats.map(chat => `
        <div class="chat-item" onclick="openChat('${chat.id}')">
            <div class="chat-header">
                <span class="chat-user">${chat.otherUser.name}</span>
                <span class="chat-time">${getTimeAgo(new Date(chat.lastMessage?.createdAt || chat.createdAt))}</span>
            </div>
            <p class="chat-preview">${chat.lastMessage?.content || 'No messages yet'}</p>
        </div>
    `).join('');
}

async function startChat(sellerId, itemId) {
    if (!currentUser) {
        showToast('Please log in to chat with sellers', 'info');
        return;
    }
    
    if (isOfflineMode) {
        showToast('Chat not available in offline mode', 'error');
        return;
    }
    
    try {
        const response = await apiCall('/chats', 'POST', { sellerId, itemId });
        await openChat(response.chat.id);
        hideItemModal();
    } catch (error) {
        showToast('Failed to start chat', 'error');
    }
}

async function openChat(chatId) {
    if (!currentUser) {
        showToast('Please log in to access chats', 'info');
        return;
    }
    
    if (isOfflineMode) {
        showToast('Chat not available in offline mode', 'error');
        return;
    }
    
    currentChatId = chatId;
    
    try {
        const response = await apiCall(`/chats/${chatId}`);
        const chat = response.chat;
        
        const chatTitle = document.getElementById('chat-title');
        if (chatTitle) chatTitle.textContent = `Chat with ${chat.otherUser.name}`;
        
        renderChatMessages(chat.messages || []);
        
        const chatModal = document.getElementById('chat-modal');
        if (chatModal) chatModal.classList.remove('hidden');
        
        // Join chat room for real-time updates
        if (socket) {
            socket.emit('join_chat', chatId);
        }
        
    } catch (error) {
        showToast('Failed to load chat', 'error');
    }
}

function renderChatMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    container.innerHTML = messages.map(message => `
        <div class="message ${message.senderId === currentUser.id ? 'sent' : 'received'}">
            <p>${message.content}</p>
            <div class="message-time">${getTimeAgo(new Date(message.createdAt))}</div>
        </div>
    `).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    if (!input) return;
    
    const content = input.value.trim();
    
    if (!content || !currentChatId) return;
    
    if (!currentUser) {
        showToast('Please log in to send messages', 'info');
        return;
    }
    
    if (isOfflineMode) {
        showToast('Chat not available in offline mode', 'error');
        return;
    }
    
    try {
        const response = await apiCall(`/chats/${currentChatId}/messages`, 'POST', { content });
        
        // Add message to UI
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML += `
                <div class="message sent">
                    <p>${content}</p>
                    <div class="message-time">Just now</div>
                </div>
            `;
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        input.value = '';
        
        // Emit via socket for real-time delivery
        if (socket) {
            socket.emit('send_message', {
                chatId: currentChatId,
                content: content
            });
        }
        
    } catch (error) {
        showToast('Failed to send message', 'error');
    }
}

// Socket Event Handlers
function handleNewMessage(data) {
    if (data.chatId === currentChatId) {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML += `
                <div class="message received">
                    <p>${data.content}</p>
                    <div class="message-time">Just now</div>
                </div>
            `;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    showToast('New message received', 'info');
}

function handleNewItem(data) {
    showToast('New item posted!', 'info');
    const currentView = document.querySelector('.view:not(.hidden)');
    if (currentView && currentView.id === 'home-view') {
        loadItems(true);
    }
}

function handleItemHearted(data) {
    // Update item in local state
    const itemIndex = items.findIndex(item => item.id === data.itemId);
    if (itemIndex !== -1) {
        items[itemIndex].hearts = data.hearts;
        renderItems();
    }
}

function handleItemBoosted(data) {
    showToast('Item was boosted!', 'info');
    loadItems(true);
}

// UI Helper Functions
function showView(viewName) {
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) targetView.classList.remove('hidden');
    
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        if (viewName === 'home') {
            profileBtn.classList.remove('btn--primary');
            profileBtn.classList.add('btn--outline');
        } else if (viewName === 'profile') {
            profileBtn.classList.remove('btn--outline');
            profileBtn.classList.add('btn--primary');
        }
    }
}

function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('hidden');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
}

function showAuthContainer() {
    const authContainer = document.getElementById('auth-container');
    if (authContainer) authContainer.classList.remove('hidden');
}

function hideAuthContainer() {
    const authContainer = document.getElementById('auth-container');
    if (authContainer) authContainer.classList.add('hidden');
}

function showAppContainer() {
    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.classList.remove('hidden');
}

function hideAppContainer() {
    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.classList.add('hidden');
}

function showRegisterForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
}

function showLoginForm() {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    if (registerForm) registerForm.classList.add('hidden');
    if (loginForm) loginForm.classList.remove('hidden');
}

function showPostModal() {
    if (!currentUser) {
        showToast('Please log in to post items', 'info');
        return;
    }
    const modal = document.getElementById('post-modal');
    if (modal) modal.classList.remove('hidden');
}

function hidePostModal() {
    const modal = document.getElementById('post-modal');
    if (modal) modal.classList.add('hidden');
}

function hideItemModal() {
    const modal = document.getElementById('item-modal');
    if (modal) modal.classList.add('hidden');
}

function hideChatModal() {
    const modal = document.getElementById('chat-modal');
    if (modal) modal.classList.add('hidden');
    currentChatId = null;
    if (socket) {
        socket.emit('leave_chat');
    }
}

function updateLoadMoreButton() {
    const btn = document.getElementById('load-more-btn');
    if (btn) {
        if (hasMore && !isOfflineMode) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Utility Functions
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function debounce(func, wait) {
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

// Global functions for onclick handlers
window.startChat = startChat;
window.openChat = openChat;
window.toggleHeart = toggleHeart;
window.boostItem = boostItem;
window.showPostModal = showPostModal;
window.showToast = showToast;