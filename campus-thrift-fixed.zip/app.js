// API Configuration
const API_BASE_URL = 'https://backend-k4dg.onrender.com/api';
const SOCKET_URL = 'https://backend-k4dg.onrender.com';
const CONNECTION_TIMEOUT = 3000;

// Global State
let currentUser = null;
let authToken = null;
let socket = null;
let items = [];
let connectionStatus = 'demo';
let currentFilters = {};

// GUARANTEED APP LOADING - This will ALWAYS fire within 3 seconds
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded - starting guaranteed initialization');
    
    // ABSOLUTE guarantee - app MUST load
    setTimeout(() => {
        console.log('GUARANTEED LOAD: Force loading app after 3 seconds');
        forceLoadApp();
    }, 3000);
    
    // Try quick initialization but don't block
    quickInit();
});

function quickInit() {
    console.log('Attempting quick initialization...');
    
    // Show loading immediately
    showLoading();
    
    // Update progress
    updateLoadingProgress(20);
    
    // Try quick backend check (but don't wait for it)
    checkBackendQuickly();
    
    // After 2.5 seconds, start loading regardless
    setTimeout(() => {
        console.log('Time limit reached, proceeding with app load');
        forceLoadApp();
    }, 2500);
}

async function checkBackendQuickly() {
    try {
        updateLoadingProgress(40);
        
        // Very quick health check with 1.5 second timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-cache'
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
            console.log('Backend available - will try online mode');
            connectionStatus = 'online';
            updateLoadingProgress(60);
            
            // Try to get user if token exists
            const token = localStorage.getItem('auth_token');
            if (token) {
                try {
                    authToken = token;
                    const userResponse = await quickApiCall('/auth/me');
                    currentUser = userResponse.user;
                    localStorage.setItem('backup_user', JSON.stringify(currentUser));
                    console.log('User session restored');
                } catch (e) {
                    console.log('Token invalid, cleared');
                    localStorage.removeItem('auth_token');
                    authToken = null;
                }
            }
        } else {
            throw new Error('Backend not healthy');
        }
    } catch (error) {
        console.log('Backend check failed:', error.message);
        connectionStatus = 'demo';
    }
    
    updateLoadingProgress(80);
}

async function quickApiCall(endpoint) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) throw new Error('API call failed');
        return await response.json();
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

function forceLoadApp() {
    console.log('Force loading app - guaranteed to work');
    
    // Clear any hanging operations
    updateLoadingProgress(90);
    
    // Load demo data always
    loadDemoData();
    
    // Check for existing user session
    const demoUser = localStorage.getItem('demo_user');
    const backupUser = localStorage.getItem('backup_user');
    
    if (currentUser) {
        // Already have user from online check
        console.log('Loading with authenticated user');
        showAuthenticatedApp();
    } else if (demoUser) {
        // Load demo user
        try {
            currentUser = JSON.parse(demoUser);
            console.log('Loading with demo user');
            showAuthenticatedApp();
        } catch (e) {
            console.log('Demo user parse failed');
            showAuthScreen();
        }
    } else if (backupUser && authToken) {
        // Load backup user if we have token
        try {
            currentUser = JSON.parse(backupUser);
            console.log('Loading with backup user');
            showAuthenticatedApp();
        } catch (e) {
            console.log('Backup user parse failed');
            showAuthScreen();
        }
    } else {
        // Show auth screen
        console.log('Loading auth screen');
        showAuthScreen();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Update connection status
    updateConnectionStatus();
    
    // Finalize loading
    updateLoadingProgress(100);
    setTimeout(() => {
        hideLoading();
        console.log('App successfully loaded in', connectionStatus, 'mode');
        showToast('Campus Thrift loaded successfully!', 'success');
    }, 200);
}

function loadDemoData() {
    console.log('Loading demo data...');
    items = [
        {
            id: 'demo-1',
            title: 'Vintage Denim Jacket',
            description: 'Classic vintage denim jacket in excellent condition. Perfect for any casual outfit! Size M, barely used.',
            category: 'Clothes',
            condition: 'Used',
            price: 1200,
            originalPrice: 2500,
            seller: { name: 'Fashion Lover', hostel: 'Boys' },
            sellerId: 'demo-seller-1',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            hearts: [],
            images: ['https://images.unsplash.com/photo-1544966503-7cc5ac882d5e?w=400']
        },
        {
            id: 'demo-2',
            title: 'MacBook Pro 13" 2019',
            description: '2019 MacBook Pro in excellent condition. 8GB RAM, 256GB SSD. Great for programming and design work.',
            category: 'Electronics',
            condition: 'Used',
            price: 85000,
            originalPrice: 120000,
            seller: { name: 'Tech Guru', hostel: 'Boys' },
            sellerId: 'demo-seller-2',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            hearts: [],
            images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400'],
            isBoosted: true
        },
        {
            id: 'demo-3',
            title: 'Engineering Textbook Set',
            description: 'Complete set of engineering textbooks including Higher Engineering Mathematics by B.S. Grewal and other essential books.',
            category: 'Books',
            condition: 'Used',
            price: 800,
            originalPrice: 1500,
            seller: { name: 'Study Helper', hostel: 'Girls' },
            sellerId: 'demo-seller-3',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            hearts: [],
            images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400']
        },
        {
            id: 'demo-4',
            title: 'Wireless Gaming Headset',
            description: 'Brand new wireless gaming headset with noise cancellation and RGB lighting. Never used, still in original packaging.',
            category: 'Electronics',
            condition: 'New',
            price: 3000,
            originalPrice: 8000,
            seller: { name: 'Gamer Pro', hostel: 'Boys' },
            sellerId: 'demo-seller-4',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            hearts: [],
            images: ['https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400']
        },
        {
            id: 'demo-5',
            title: 'Designer Handbag',
            description: 'Elegant designer handbag in pristine condition. Perfect for special occasions and daily use.',
            category: 'Clothes',
            condition: 'Unused',
            price: 2500,
            originalPrice: 6000,
            seller: { name: 'Style Queen', hostel: 'Girls' },
            sellerId: 'demo-seller-5',
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            hearts: [],
            images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400']
        },
        {
            id: 'demo-6',
            title: 'Premium Skincare Set',
            description: 'Complete skincare routine set from premium brands. All products are unopened and within expiry date.',
            category: 'Cosmetics',
            condition: 'New',
            price: 1200,
            originalPrice: 3000,
            seller: { name: 'Beauty Expert', hostel: 'Girls' },
            sellerId: 'demo-seller-6',
            createdAt: new Date(Date.now() - 432000000).toISOString(),
            hearts: [],
            images: ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400']
        }
    ];
    
    console.log('Demo data loaded:', items.length, 'items');
}

function showAuthenticatedApp() {
    hideAuthContainer();
    showAppContainer();
    showView('home');
    renderItems();
    
    // Load profile data
    setDefaultProfile();
    
    // Initialize socket if online
    if (connectionStatus === 'online' && authToken) {
        try {
            initializeSocket();
        } catch (e) {
            console.log('Socket init failed:', e);
        }
    }
}

function showAuthScreen() {
    showAuthContainer();
    hideAppContainer();
    
    // Show demo notice if in demo mode
    if (connectionStatus === 'demo') {
        showDemoNotice();
    }
}

function setDefaultProfile() {
    window.userListings = [];
    window.heartedItems = [];
    window.userChats = [];
    
    const userPointsEl = document.getElementById('user-points');
    const itemsSoldEl = document.getElementById('items-sold');
    const moneySavedEl = document.getElementById('money-saved');
    
    if (userPointsEl) userPointsEl.textContent = '25';
    if (itemsSoldEl) itemsSoldEl.textContent = '3';
    if (moneySavedEl) moneySavedEl.textContent = '₹2500';
}

// Connection Status Management
function updateConnectionStatus() {
    const statusEl = document.getElementById('connection-status');
    const iconEl = document.getElementById('connection-icon');
    const textEl = document.getElementById('connection-text');
    const retryBtn = document.getElementById('retry-connection');
    const navbar = document.querySelector('.navbar');
    const modeIndicator = document.getElementById('mode-indicator');
    
    if (!statusEl || !iconEl || !textEl) return;
    
    statusEl.className = 'connection-status';
    
    switch (connectionStatus) {
        case 'online':
            statusEl.classList.add('online');
            iconEl.textContent = '✅';
            textEl.textContent = 'Connected to server';
            if (retryBtn) retryBtn.classList.add('hidden');
            if (modeIndicator) modeIndicator.classList.add('hidden');
            statusEl.classList.remove('hidden');
            if (navbar) navbar.classList.add('with-status');
            
            setTimeout(() => {
                if (statusEl) statusEl.classList.add('hidden');
                if (navbar) navbar.classList.remove('with-status');
            }, 3000);
            break;
            
        case 'demo':
            statusEl.classList.add('demo');
            iconEl.textContent = '🌐';
            textEl.textContent = 'Demo mode - Browse sample items';
            if (retryBtn) retryBtn.classList.remove('hidden');
            if (modeIndicator) modeIndicator.classList.remove('hidden');
            statusEl.classList.remove('hidden');
            if (navbar) navbar.classList.add('with-status');
            break;
            
        default:
            statusEl.classList.add('offline');
            iconEl.textContent = '❌';
            textEl.textContent = 'Server unavailable';
            if (retryBtn) retryBtn.classList.remove('hidden');
            if (modeIndicator) modeIndicator.classList.add('hidden');
            statusEl.classList.remove('hidden');
            if (navbar) navbar.classList.add('with-status');
    }
}

async function retryConnection() {
    const originalStatus = connectionStatus;
    connectionStatus = 'checking';
    updateConnectionStatus();
    
    showToast('Attempting to reconnect...', 'info');
    
    try {
        await checkBackendQuickly();
        
        if (connectionStatus === 'online') {
            showToast('Connection restored!', 'success');
            
            // If we have current user, reinitialize
            if (currentUser && authToken) {
                try {
                    initializeSocket();
                    await loadItemsFromAPI();
                } catch (e) {
                    console.log('Reinitialization failed');
                }
            }
        } else {
            connectionStatus = 'demo';
            showToast('Still offline - using demo mode', 'info');
        }
    } catch (error) {
        connectionStatus = originalStatus;
        showToast('Connection attempt failed', 'error');
    }
    
    updateConnectionStatus();
}

// Item rendering and management
function renderItems() {
    const grid = document.getElementById('items-grid');
    if (!grid) return;
    
    let filteredItems = items;
    
    // Apply filters
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
    
    // Add event listeners
    grid.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.heart-btn') && !e.target.closest('.boost-btn')) {
                showItemDetail(card.dataset.itemId);
            }
        });
    });
    
    grid.querySelectorAll('.heart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleHeart(btn.dataset.itemId);
        });
    });
}

function createItemCard(item) {
    const timeAgo = getTimeAgo(new Date(item.createdAt));
    const isHearted = currentUser && item.hearts?.includes(currentUser.id);
    const isBoosted = item.isBoosted;
    
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

function showItemDetail(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
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
                            <button class="btn btn--primary" onclick="handleMessageSeller()">
                                💬 Message Seller
                            </button>
                            <button class="btn btn--outline" onclick="toggleHeart('${item.id}')">
                                ${item.hearts?.includes(currentUser.id) ? '❤️ Hearted' : '🤍 Heart'}
                            </button>
                        ` : currentUser ? `
                            <button class="btn btn--outline" disabled>Your Item</button>
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
}

function handleMessageSeller() {
    if (connectionStatus === 'online') {
        showToast('Chat feature would work in online mode', 'info');
    } else {
        showToast('Chat not available in demo mode', 'error');
    }
}

function toggleHeart(itemId) {
    if (!currentUser) {
        showToast('Please log in to heart items', 'info');
        return;
    }
    
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    const item = items[itemIndex];
    const wasHearted = item.hearts?.includes(currentUser.id);
    
    if (wasHearted) {
        item.hearts = item.hearts.filter(id => id !== currentUser.id);
        showToast('Item removed from hearts', 'info');
    } else {
        item.hearts = [...(item.hearts || []), currentUser.id];
        showToast('Item added to hearts', 'success');
    }
    
    renderItems();
}

// Search and filters
function handleSearch(e) {
    currentFilters.search = e.target.value;
    renderItems();
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
    
    renderItems();
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const credentials = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    if (!credentials.email || !credentials.password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
        if (connectionStatus === 'online') {
            const response = await quickApiCall('/auth/login', 'POST', credentials);
            authToken = response.token;
            currentUser = response.user;
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('backup_user', JSON.stringify(currentUser));
        } else {
            // Demo login
            await new Promise(resolve => setTimeout(resolve, 1000));
            currentUser = {
                id: 'demo-user',
                name: credentials.email.split('@')[0] || 'Demo User',
                email: credentials.email,
                hostel: 'Boys'
            };
            localStorage.setItem('demo_user', JSON.stringify(currentUser));
        }
        
        showAuthenticatedApp();
        showToast(`Welcome ${currentUser.name}!`, 'success');
        
    } catch (error) {
        showToast(error.message || 'Login failed. Please try again.', 'error');
    } finally {
        submitBtn.textContent = 'Log In';
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        hostel: formData.get('hostel'),
        password: formData.get('password')
    };
    
    if (!userData.name || !userData.email || !userData.hostel || !userData.password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;
    
    try {
        if (connectionStatus === 'online') {
            const response = await quickApiCall('/auth/register', 'POST', userData);
            authToken = response.token;
            currentUser = response.user;
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('backup_user', JSON.stringify(currentUser));
        } else {
            // Demo registration
            await new Promise(resolve => setTimeout(resolve, 1500));
            currentUser = {
                id: 'demo-user',
                name: userData.name,
                email: userData.email,
                hostel: userData.hostel
            };
            localStorage.setItem('demo_user', JSON.stringify(currentUser));
        }
        
        showAuthenticatedApp();
        showToast(`Welcome ${currentUser.name}!`, 'success');
        
    } catch (error) {
        showToast(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
        submitBtn.textContent = 'Sign Up';
        submitBtn.disabled = false;
    }
}

function handleLogout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('backup_user');
    localStorage.removeItem('demo_user');
    authToken = null;
    currentUser = null;
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    hideAppContainer();
    showAuthScreen();
    showToast('Logged out successfully', 'info');
}

// Socket and API functions (simplified)
function initializeSocket() {
    if (!authToken) return;
    
    try {
        socket = io(SOCKET_URL, {
            auth: { token: authToken },
            timeout: 5000
        });
        
        socket.on('connect', () => {
            console.log('Socket connected');
        });
        
        socket.on('connect_error', () => {
            console.log('Socket connection failed');
        });
    } catch (error) {
        console.log('Socket initialization failed:', error);
    }
}

async function loadItemsFromAPI() {
    if (connectionStatus !== 'online') return;
    
    try {
        const response = await quickApiCall('/items?limit=12');
        items = response.items || items;
        renderItems();
    } catch (error) {
        console.log('Failed to load items from API');
    }
}

// Profile functions
function showView(viewName) {
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) targetView.classList.remove('hidden');
    
    if (viewName === 'profile') {
        renderProfile();
    }
}

function renderProfile() {
    const activeTab = document.querySelector('.tab-btn.active')?.dataset?.tab || 'listings';
    switchTab(activeTab);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tabBtn = document.querySelector(`[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    const tabContent = document.getElementById(`${tab}-tab`);
    if (tabContent) tabContent.classList.remove('hidden');
    
    renderTabContent(tab);
}

function renderTabContent(tab) {
    const containers = {
        'listings': document.getElementById('user-listings'),
        'hearted': document.getElementById('hearted-items'),
        'chats': document.getElementById('chat-list')
    };
    
    const container = containers[tab];
    if (!container) return;
    
    if (tab === 'listings') {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3 class="empty-state-title">No listings yet</h3>
                <p class="empty-state-description">Start selling by posting your first item</p>
                <button class="btn btn--primary" onclick="showPostModal()">Post Item</button>
            </div>
        `;
    } else if (tab === 'hearted') {
        const heartedItems = items.filter(item => item.hearts?.includes(currentUser?.id));
        
        if (heartedItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💔</div>
                    <h3 class="empty-state-title">No hearted items</h3>
                    <p class="empty-state-description">Heart items you're interested in to save them here</p>
                </div>
            `;
        } else {
            container.innerHTML = heartedItems.map(item => createItemCard(item)).join('');
        }
    } else if (tab === 'chats') {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <h3 class="empty-state-title">No messages yet</h3>
                <p class="empty-state-description">Start a conversation by messaging a seller</p>
            </div>
        `;
    }
}

// Event listeners setup
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Auth forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    
    // Auth switches
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
    
    // Retry connection
    const retryConnectionBtn = document.getElementById('retry-connection');
    const tryConnectionBtn = document.getElementById('try-connection');
    
    if (retryConnectionBtn) retryConnectionBtn.addEventListener('click', retryConnection);
    if (tryConnectionBtn) tryConnectionBtn.addEventListener('click', retryConnection);
    
    // Modals
    const closeItemModal = document.getElementById('close-item-modal');
    const closePostModal = document.getElementById('close-post-modal');
    
    if (closeItemModal) closeItemModal.addEventListener('click', () => {
        document.getElementById('item-modal').classList.add('hidden');
    });
    if (closePostModal) closePostModal.addEventListener('click', () => {
        document.getElementById('post-modal').classList.add('hidden');
    });
    
    // Search and filters
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const conditionFilter = document.getElementById('condition-filter');
    const hostelFilter = document.getElementById('hostel-filter');
    
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    if (categoryFilter) categoryFilter.addEventListener('change', handleFilterChange);
    if (conditionFilter) conditionFilter.addEventListener('change', handleFilterChange);
    if (hostelFilter) hostelFilter.addEventListener('change', handleFilterChange);
    
    // Profile tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
    
    // Modal backdrop clicks
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
    
    console.log('Event listeners setup complete');
}

// UI Helper Functions
function updateLoadingProgress(percent) {
    const progressBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');
    
    if (progressBar) progressBar.style.width = `${percent}%`;
    
    if (loadingText) {
        if (percent < 30) loadingText.textContent = 'Connecting to server...';
        else if (percent < 60) loadingText.textContent = 'Loading data...';
        else if (percent < 90) loadingText.textContent = 'Finalizing setup...';
        else loadingText.textContent = 'Almost ready...';
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

function showDemoNotice() {
    const demoNotice = document.getElementById('demo-notice');
    if (demoNotice) demoNotice.classList.remove('hidden');
}

function showRegisterForm() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

function showLoginForm() {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}

function showPostModal() {
    if (!currentUser) {
        showToast('Please log in to post items', 'info');
        return;
    }
    if (connectionStatus !== 'online') {
        showToast('Posting items not available in demo mode', 'error');
        return;
    }
    document.getElementById('post-modal').classList.remove('hidden');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
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

// Global functions
window.toggleHeart = toggleHeart;
window.showPostModal = showPostModal;
window.showToast = showToast;
window.handleMessageSeller = handleMessageSeller;