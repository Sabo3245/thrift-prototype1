// Admin review page script
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  getIdTokenResult,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  serverTimestamp,
  deleteField,
  deleteDoc,
  addDoc, // <-- IMPORT ADD_DOC
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Use same firebaseConfig as main app
const firebaseConfig = {
  apiKey: "AIzaSyBrVVik7_oVaPXpyI20jcyq9nqXUKcwcOM",
  authDomain: "thrift-6bd6d.firebaseapp.com",
  projectId: "thrift-6bd6d",
  storageBucket: "thrift-6bd6d.firebasestorage.app",
  messagingSenderId: "595724600327",
  appId: "1:595724600327:web:e1a9d65d6e6ee68e0456a2",
  measurementId: "G-7PGCTDYP38",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentAdminUser = null; // <-- Store the admin user
let allFetchedUsers = [];
let allMarketplaceItems = []; // <-- Add this to store fetched posts

const itemsList = document.getElementById("itemsList");
const marketplaceList = document.getElementById("marketplaceList");
const usersList = document.getElementById("usersList");
const notAdmin = document.getElementById("notAdmin");
const content = document.getElementById("content");
const signOutBtn = document.getElementById("signOutBtn");
const postNotificationBtn = document.getElementById("postNotificationBtn"); // <-- Get new button

signOutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "auth.html";
});

// --- NEW: Add event listener for posting notifications ---
postNotificationBtn.addEventListener("click", async () => {
  const messageEl = document.getElementById("notificationMessage");
  const message = messageEl.value.trim();

  if (!message) {
    alert("Please enter a notification message.");
    return;
  }

  if (!currentAdminUser) {
    alert("Error: Admin user not identified. Please refresh.");
    return;
  }

  if (
    !confirm(
      "Are you sure you want to post this notification to all users?"
    )
  ) {
    return;
  }

  try {
    postNotificationBtn.disabled = true;
    postNotificationBtn.textContent = "Posting...";

    const announcementsRef = collection(db, "announcements");
    await addDoc(announcementsRef, {
      message: message,
      createdAt: serverTimestamp(),
      postedBy: currentAdminUser.email || "Admin",
    });

    alert("Notification posted successfully!");
    messageEl.value = ""; // Clear the text area
  } catch (error) {
    console.error("Error posting notification:", error);
    alert("Failed to post notification. Check console for errors.");
  } finally {
    postNotificationBtn.disabled = false;
    postNotificationBtn.textContent = "Post Notification";
  }
});
// --- END NEW LISTENER ---

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // MODIFIED: Redirect to auth.html but tell it we're from the admin page
    window.location.href = "auth.html?from=admin"; 
    return;
  }

  currentAdminUser = user; // <-- Store the admin user

  const idTokenRes = await getIdTokenResult(user, true).catch(() => ({}));
  const claims = idTokenRes?.claims || {};
  if (!claims.admin) {
    notAdmin.style.display = "block";
    content.style.display = "none";
    return;
  }

  // Admin: subscribe to pending/flagged items
  notAdmin.style.display = "none";
  content.style.display = "block";

  const itemsRef = collection(db, "items");
  // This query is for the "Pending" (newly submitted) items
  const q = query(
    itemsRef,
    where("isActive", "==", false),
    where("flagged", "==", false)
  );
  onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    renderItems(rows, "itemsList"); // Render pending items
  });
});

function renderItems(items, listElementId) {
  // ... (this function is unchanged)
  const listEl = document.getElementById(listElementId);
  if (!listEl) return;

  if (!items || items.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No items found</div>';
    return;
  }

  listEl.innerHTML = '';
  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    
    // Determine flag reason, default to 'pending_approval' if not specified
    let flagInfo = `Flagged: ${item.flagged ? 'yes' : 'no'}`;
    let reason = item.flagReason || (item.isActive === false ? 'pending_approval' : '');
    if (reason) {
      flagInfo += ` (${escapeHtml(reason)})`;
    }

    row.innerHTML = `
      <img class="item-thumb" src="${(item.images && item.images[0]) || ''}" alt="${escapeHtml(item.title || 'thumb')}" />
      <div class="item-meta">
        <strong>${escapeHtml(item.title || '')}</strong>
        <div>${escapeHtml(item.description || '').slice(0, 300)}</div>
        <div>Seller: <code>${item.sellerId || 'unknown'}</code></div>
        <div>${flagInfo}</div>
      </div>
      <div class="admin-actions">
        <button class="btn btn--primary" onclick="approveItem('${item.id}')">Approve / Unflag</button>
        <button class="btn btn--danger" onclick="rejectItem('${item.id}')">Reject (Deactivate)</button>
        <button class="btn btn--danger" onclick="deleteItem('${item.id}')" style="background:#c0392b;">Delete (Permanent)</button>
        <hr style="border-color:rgba(255,255,255,0.1); width:100%;" />
        <button class="btn" onclick="banUser('${item.sellerId}')">Ban Seller</button>
        <button class="btn" onclick="unbanUser('${item.sellerId}')">Unban Seller</button>
      </div>
    `;
    listEl.appendChild(row);
  });
}

// --- GLOBAL FUNCTIONS (unchanged) ---
window.approveItem = async function(itemId) {
  // ... (unchanged)
  try {
    const itemRef = doc(db, 'items', itemId);
    await updateDoc(itemRef, {
      isActive: true,
      approved: true,
      flagged: false,
      flagReason: deleteField(),
      moderatedBy: 'admin-ui',
      moderatedAt: serverTimestamp(),
    });
    alert('Approved / Unflagged');
    loadFlaggedItems();
  } catch (e) { console.error(e); alert('Error approving'); }
}

window.rejectItem = async function(itemId) {
  // ... (unchanged)
  try {
    const itemRef = doc(db, 'items', itemId);
    await updateDoc(itemRef, {
      isActive: false,
      approved: false,
      flagged: true,
      flagReason: 'rejected_by_admin',
      moderatedBy: 'admin-ui',
      moderatedAt: serverTimestamp(),
    });
    alert('Rejected (Deactivated)');
    loadFlaggedItems();
  } catch (e) { console.error(e); alert('Error rejecting'); }
}

window.deleteItem = async function(itemId) {
  // ... (unchanged)
  if (!confirm('Are you sure you want to PERMANENTLY DELETE this item? This cannot be undone.')) {
    return;
  }
  try {
    const itemRef = doc(db, 'items', itemId);
    await deleteDoc(itemRef);
    alert('Item permanently deleted');
    loadFlaggedItems();
  } catch (e) {
    console.error(e);
    alert('Error deleting item');
  }
}

window.banUser = async function(uid) {
  // ... (unchanged)
  if (!uid) return alert('No uid');
  if (!confirm('Are you sure you want to BAN this user?')) return;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { banned: true, bannedAt: serverTimestamp() });
    alert('User banned');
  } catch (e) { console.error(e); alert('Error banning user'); }
}

window.unbanUser = async function(uid) {
  // ... (unchanged)
  if (!uid) return alert('No uid');
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { banned: false, strikes: 0, bannedAt: deleteField() });
    alert('User unbanned');
  } catch (e) { console.error(e); alert('Error unbanning user'); }
}

// --- Tab switching (UPDATED) ---
const tabs = document.querySelectorAll(".admin-tab");
const tabContents = document.querySelectorAll(".tab-content");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetTab = tab.dataset.tab;

    // Update active tab
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    // Show corresponding content
    tabContents.forEach((content) => content.classList.remove("active"));

    if (targetTab === "pending") {
      document.getElementById("pendingSection").classList.add("active");
      // Already handled by live onSnapshot
    } else if (targetTab === "flagged") {
      document.getElementById("flaggedSection").classList.add("active");
      loadFlaggedItems();
    } else if (targetTab === "marketplace") {
      document.getElementById("marketplaceSection").classList.add("active");
      loadMarketplacePosts();
    } else if (targetTab === "users") {
      document.getElementById("usersSection").classList.add("active");
      loadAllUsers();
    } else if (targetTab === "notifications") {
      // <-- NEW LOGIC
      document.getElementById("notificationsSection").classList.add("active");
    }else if (targetTab === "analytics") {
      document.getElementById("analyticsSection").classList.add("active");
      loadAnalytics(); // Load default view (week)
    }
  });
});

// ... (Rest of the functions: loadFlaggedItems, loadMarketplacePosts, loadAllUsers, deactivateItem, makeUserAdmin, escapeHtml are all unchanged) ...
async function loadFlaggedItems() {
  const flaggedItemsList = document.getElementById('flaggedItemsList');
  flaggedItemsList.innerHTML = '<div class="empty-state">Loading...</div>';
  
  try {
    const itemsRef = collection(db, 'items');
    // Query for all items that are flagged
    const q = query(itemsRef, where('flagged', '==', true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      flaggedItemsList.innerHTML = '<div class="empty-state">No flagged items found</div>';
      return;
    }
    
    const rows = [];
    snapshot.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    // Use the same render function but point it to the new list ID
    renderItems(rows, 'flaggedItemsList');

  } catch (e) {
    console.error('Error loading flagged posts:', e);
    flaggedItemsList.innerHTML = '<div class="empty-state">Error loading posts</div>';
  }
}

async function loadMarketplacePosts() {
  const listEl = document.getElementById('marketplaceList');
  listEl.innerHTML = '<div class="empty-state">Loading...</div>';
  document.getElementById('marketplaceSearchInput').value = ''; // Clear search
  
  try {
    const itemsRef = collection(db, 'items');
    const q = query(itemsRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      listEl.innerHTML = '<div class="empty-state">No active marketplace posts</div>';
      return;
    }
    
    // Store items in global variable
    allMarketplaceItems = [];
    snapshot.forEach(docSnap => {
      allMarketplaceItems.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Render them
    renderMarketplaceList(allMarketplaceItems);
    
  } catch (e) {
    console.error('Error loading marketplace posts:', e);
    listEl.innerHTML = '<div class="empty-state">Error loading posts</div>';
  }
}

function renderMarketplaceList(items) {
  const listEl = document.getElementById('marketplaceList');
  listEl.innerHTML = '';

  if (!items || items.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No posts match your search.</div>';
    return;
  }

  items.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'marketplace-item';
    
    // Check boost status
    const isBoosted = item.isBoosted || false;
    const boostBtnText = isBoosted ? "⚡ Unboost Post" : "🚀 Boost Post";
    const boostBtnStyle = isBoosted ? "background:#ffa502; color:white;" : "background:#00e5ff; color:#0a192f;";

    itemDiv.innerHTML = `
      <img class="marketplace-item-image" src="${(item.images && item.images[0]) || ''}" alt="${escapeHtml(item.title || '')}" />
      <div class="marketplace-item-info">
        <div class="marketplace-item-title">
          ${escapeHtml(item.title || '')} 
          ${isBoosted ? '<span style="font-size:12px; background:#ffa502; color:white; padding:2px 6px; border-radius:4px; margin-left:8px;">BOOSTED</span>' : ''}
        </div>
        <div class="marketplace-item-price">₹${item.price || 0}</div>
        <div class="marketplace-item-seller">Seller: ${item.sellerId || 'unknown'}</div>
        <div style="color:#8892b0;font-size:12px;margin-top:4px;">
          Category: ${escapeHtml(item.category || 'N/A')} | Condition: ${escapeHtml(item.condition || 'N/A')}
        </div>
      </div>
      <div class="admin-actions">
        <button class="btn" style="${boostBtnStyle}" onclick="toggleAdminBoost('${item.id}', ${isBoosted})">${boostBtnText}</button>
        <button class="btn btn--danger" onclick="deactivateItem('${item.id}')">Deactivate</button>
      </div>
    `;
    
    listEl.appendChild(itemDiv);
  });
}

// --- NEW: Function to render the user list ---
function renderUserList(users) {
  // Clear the list
  usersList.innerHTML = ''; 

  if (!users || users.length === 0) {
    usersList.innerHTML = '<div class="empty-state">No users match your search.</div>';
    return;
  }
  
  // Render the provided users
  users.forEach(user => {
    const userCard = document.createElement('div');
    userCard.className = 'user-card';
    
    const badges = [];
    if (user.isAdmin) badges.push('<span class="badge badge-admin">ADMIN</span>');
    if (user.banned) badges.push('<span class="badge badge-banned">BANNED</span>');
    if (user.strikes > 0) badges.push(`<span class="badge badge-strikes">${user.strikes} Strikes</span>`);
    
    userCard.innerHTML = `
      <div class="user-header">
    <div>
      <div class="user-name">${user.firstName }  ${user.lastName} <div>
      <div class="user-email">${escapeHtml(user.email || user.uid)}</div>
      <div class="user-hostel" style="color:#00e5ff; font-size:13px; margin-top: 2px;">
            Hostel: ${escapeHtml(user.hostel || 'N/A')}
          </div>
      <div class="user-phone" style="color:#cbd5e1; font-size:14px; margin-top: 4px;">
        Phone: ${escapeHtml(user.phone || 'Not Provided')}
      </div>

    </div>
  </div>
      <div class="user-badges">${badges.join('')}</div>
      <div style="color:#8892b0;font-size:13px;margin-top:8px;">UID: <code>${user.uid}</code></div>
      <div class="user-actions">
        ${!user.banned ? `<button class="btn btn--danger" onclick="banUser('${user.uid}')">Ban User</button>` : ''}
        ${user.banned ? `<button class="btn btn--primary" onclick="unbanUser('${user.uid}')">Unban User</button>` : ''}
        ${!user.isAdmin ? `<button class="btn" onclick="makeUserAdmin('${user.uid}')">Make Admin</button>` : ''}
      </div>
    `;
    
    usersList.appendChild(userCard);
  });
}
// --- END NEW FUNCTION ---

async function loadAllUsers() {
  usersList.innerHTML = '<div class="empty-state">Loading...</div>';
  document.getElementById('userSearchInput').value = ''; // Clear search bar
  
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    if (snapshot.empty) {
      usersList.innerHTML = '<div class="empty-state">No users found</div>';
      return;
    }
    
    let totalUsers = 0;
    let bannedCount = 0;
    let adminCount = 0;
    allFetchedUsers = []; // Clear the cache
    
    snapshot.forEach(docSnap => {
      const userData = docSnap.data();
      allFetchedUsers.push({ uid: docSnap.id, ...userData }); // Populate the cache
      totalUsers++;
      if (userData.banned) bannedCount++;
      if (userData.isAdmin) adminCount++;
    });
    
    // Update stats
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('bannedUsers').textContent = bannedCount;
    document.getElementById('adminUsers').textContent = adminCount;
    
    // Render the full list using the new function
    renderUserList(allFetchedUsers);

  } catch (e) {
    console.error('Error loading users:', e);
    usersList.innerHTML = '<div class="empty-state">Error loading users</div>';
  }
}

// --- UNIFIED FILTER FUNCTION ---
// --- UNIFIED FILTER FUNCTION ---
function filterUsers() {
  // We keep .trim() because it handles accidental spaces well.
  // The logic below handles the "First Last" search issue.
  const searchTerm = document.getElementById("userSearchInput").value.toLowerCase().trim();
  const hostelFilter = document.getElementById("userHostelFilter").value;

  const filteredUsers = allFetchedUsers.filter(user => {
    // 1. Data Preparation
    const email = (user.email || '').toLowerCase();
    const uid = (user.uid || '').toLowerCase();
    
    // Combine first and last name for proper searching
    const firstName = (user.firstName || '').toLowerCase();
    const lastName = (user.lastName || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`;
    
    // Legacy support: check displayName if it exists
    const displayName = (user.displayName || '').toLowerCase();

    // 2. Search Logic
    const matchesSearch = !searchTerm || 
                          email.includes(searchTerm) || 
                          uid.includes(searchTerm) || 
                          firstName.includes(searchTerm) || 
                          lastName.includes(searchTerm) ||
                          fullName.includes(searchTerm) ||  
                          displayName.includes(searchTerm);

    // 3. Hostel Filter Logic
    const matchesHostel = !hostelFilter || user.hostel === hostelFilter;

    return matchesSearch && matchesHostel;
  });

  // Render the filtered list
  renderUserList(filteredUsers);
  
  // Update the Total User Count
  const totalCountEl = document.getElementById('totalUsers');
  if (totalCountEl) {
    totalCountEl.textContent = filteredUsers.length;
  }
}

// Attach the same function to both inputs
document.getElementById("userSearchInput").addEventListener("input", filterUsers);
document.getElementById("userHostelFilter").addEventListener("change", filterUsers);

window.deactivateItem = async function(itemId) {
  if (!confirm('Deactivate this item? This will mark it as "flagged" and hide it.')) return;
  try {
    const itemRef = doc(db, 'items', itemId);
    await updateDoc(itemRef, {
      isActive: false,
      flagged: true,
      flagReason: 'deactivated_by_admin',
      moderatedBy: 'admin-ui',
      moderatedAt: serverTimestamp(),
    });
    alert('Item deactivated and moved to flagged queue');
    loadMarketplacePosts(); // Refresh the current list
  } catch (e) {
    console.error(e);
    alert('Error deactivating item');
  }
};

window.makeUserAdmin = async function(uid) {
  if (!confirm('Grant admin privileges to this user?')) return;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { isAdmin: true, updatedAt: serverTimestamp() });
    alert('User is now an admin');
    loadAllUsers();
  } catch (e) {
    console.error(e);
    alert('Error making user admin');
  }
};

// --- Search Listener ---
document.getElementById('marketplaceSearchInput').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase().trim();
  
  if (!term) {
    renderMarketplaceList(allMarketplaceItems);
    return;
  }

  const filtered = allMarketplaceItems.filter(item => {
    const title = (item.title || '').toLowerCase();
    const seller = (item.sellerId || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    return title.includes(term) || seller.includes(term) || desc.includes(term);
  });

  renderMarketplaceList(filtered);
});

// --- Toggle Boost Function ---
window.toggleAdminBoost = async function(itemId, currentStatus) {
  const action = currentStatus ? "unboost" : "boost";
  if (!confirm(`Are you sure you want to ${action} this post?`)) return;

  try {
    const itemRef = doc(db, 'items', itemId);
    
    // Toggle status and update timestamp
    await updateDoc(itemRef, { 
      isBoosted: !currentStatus,
      updatedAt: serverTimestamp() 
    });
    
    alert(`Post ${action}ed successfully!`);
    loadMarketplacePosts(); // Reload list to see changes
  } catch (e) {
    console.error(`Error ${action}ing post:`, e);
    alert(`Error: Could not ${action} post.`);
  }
};

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, (c)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }

// --- ANALYTICS DASHBOARD LOGIC ---

let mainChartInstance = null;
let categoryChartInstance = null;
let hostelChartInstance = null;
let cachedItemsData = null; // Store fetched items to avoid re-fetching on filter change

// 1. Main Entry Point
async function loadAnalytics(timeRange = 'week') {
  console.log("Loading analytics for:", timeRange);
  
  // Only fetch from Firestore once, then cache
  if (!cachedItemsData) {
    try {
      const itemsRef = collection(db, 'items');
      // For a real dashboard, we fetch ALL items to calculate history
      const snapshot = await getDocs(itemsRef);
      cachedItemsData = [];
      snapshot.forEach(doc => cachedItemsData.push({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error fetching analytics data:", e);
      return;
    }
  }

  processAndRenderAnalytics(cachedItemsData, timeRange);
}

// 2. Global Helper for Buttons
window.updateAnalytics = function(range) {
  // Update button visual state
  document.querySelectorAll('.time-filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  // Reload data
  loadAnalytics(range);
};

// 3. Process Data & Render
function processAndRenderAnalytics(items, timeRange) {
  const now = new Date();
  let startTime;
  let labels = [];
  let dateFormat;

  // Define Time Ranges
  if (timeRange === 'week') {
    startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    // Generate last 7 days labels
    for (let i=6; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }
  } else if (timeRange === 'month') {
    startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    // Simplify labels for month (every 5 days approx or just index)
    // For simplicity, we'll let Chart.js handle axis, just filter data
  } else {
    startTime = new Date(2023, 0, 1); // All time
  }

  // Filter items within range
  const validItems = items.filter(i => {
    const itemDate = i.createdAt?.toDate ? i.createdAt.toDate() : new Date(i.createdAt);
    return itemDate >= startTime;
  });

  // --- A. CALCULATE SUMMARY STATS ---
  let totalPosted = validItems.length;
  let totalSold = validItems.filter(i => i.status === 'sold').length;
  let totalDeleted = validItems.filter(i => i.status === 'removed' || i.flagged).length;
  let totalVolume = validItems
    .filter(i => i.status === 'sold')
    .reduce((sum, i) => sum + (Number(i.price) || 0), 0);

  document.getElementById('statPosted').textContent = totalPosted;
  document.getElementById('statSold').textContent = totalSold;
  document.getElementById('statDeleted').textContent = totalDeleted;
  document.getElementById('statVolume').textContent = '₹' + totalVolume.toLocaleString();

  // --- B. PREPARE CHART DATA (Main Line Chart) ---
  // We need to bucket items by date
  const postedCounts = new Array(labels.length).fill(0);
  const soldCounts = new Array(labels.length).fill(0);

  validItems.forEach(item => {
    const itemDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
    
    // Find which label index this date belongs to
    // (This is a simplified bucket logic for the 'week' view)
    if (timeRange === 'week') {
      const dayDiff = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));
      const index = 6 - dayDiff; // 6 is today, 0 is 7 days ago
      if (index >= 0 && index <= 6) {
        postedCounts[index]++;
        if (item.status === 'sold') soldCounts[index]++;
      }
    }
  });

  // --- C. RENDER MAIN CHART ---
  const ctx = document.getElementById('mainChart').getContext('2d');
  
  if (mainChartInstance) mainChartInstance.destroy(); // Destroy old chart to avoid overlap

  mainChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Items Posted',
          data: postedCounts,
          borderColor: '#00e5ff',
          backgroundColor: 'rgba(0, 229, 255, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Items Sold',
          data: soldCounts,
          borderColor: '#00ff88',
          backgroundColor: 'rgba(0, 255, 136, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#cbd5e1' } },
        title: { display: true, text: 'Marketplace Activity', color: '#ffffff' }
      },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#8892b0' } },
        x: { grid: { display: false }, ticks: { color: '#8892b0' } }
      }
    }
  });

  // --- D. RENDER CATEGORY PIE CHART ---
  const categories = {};
  validItems.forEach(i => {
    const cat = i.category || 'Other';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  const catCtx = document.getElementById('categoryChart').getContext('2d');
  if (categoryChartInstance) categoryChartInstance.destroy();

  categoryChartInstance = new Chart(catCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: ['#00e5ff', '#00ff88', '#ffa502', '#ff5459', '#a29bfe', '#fab1a0'],
        borderWidth: 0
      }]
    },
    options: {
      plugins: { legend: { position: 'right', labels: { color: '#cbd5e1' } } }
    }
  });
  
  // --- E. RENDER HOSTEL BAR CHART ---
  const hostels = {};
  validItems.forEach(i => {
    const h = i.hostel || 'Unknown';
    hostels[h] = (hostels[h] || 0) + 1;
  });
  
  const hCtx = document.getElementById('hostelChart').getContext('2d');
  if (hostelChartInstance) hostelChartInstance.destroy();
  
  hostelChartInstance = new Chart(hCtx, {
    type: 'bar',
    data: {
      labels: Object.keys(hostels),
      datasets: [{
        label: 'Items by Hostel',
        data: Object.values(hostels),
        backgroundColor: '#a29bfe',
        borderRadius: 4
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#8892b0' } },
        x: { grid: { display: false }, ticks: { color: '#8892b0' } }
      }
    }
  });
}