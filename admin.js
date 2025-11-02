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
  deleteDoc, // <-- ADDED DELETE FUNCTION
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

const itemsList = document.getElementById("itemsList");
const marketplaceList = document.getElementById("marketplaceList"); 
const usersList = document.getElementById("usersList");
const notAdmin = document.getElementById("notAdmin");
const content = document.getElementById("content");
const signOutBtn = document.getElementById("signOutBtn");

signOutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = 'auth.html';
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }

  const idTokenRes = await getIdTokenResult(user, true).catch(() => ({}));
  const claims = idTokenRes?.claims || {};
  if (!claims.admin) {
    notAdmin.style.display = 'block';
    content.style.display = 'none';
    return;
  }

  // Admin: subscribe to pending/flagged items
  notAdmin.style.display = 'none';
  content.style.display = 'block';

  const itemsRef = collection(db, 'items');
  // This query is for the "Pending" (newly submitted) items
  const q = query(itemsRef, where('isActive', '==', false), where('flagged', '==', false));
  onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    renderItems(rows, 'itemsList'); // Render pending items
  });
});

function renderItems(items, listElementId) {
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

// --- GLOBAL FUNCTIONS (attached to window) ---

window.approveItem = async function(itemId) {
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
  if (!uid) return alert('No uid');
  if (!confirm('Are you sure you want to BAN this user?')) return;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { banned: true, bannedAt: serverTimestamp() });
    alert('User banned');
  } catch (e) { console.error(e); alert('Error banning user'); }
}

window.unbanUser = async function(uid) {
  if (!uid) return alert('No uid');
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { banned: false, strikes: 0, bannedAt: deleteField() });
    alert('User unbanned');
  } catch (e) { console.error(e); alert('Error unbanning user'); }
}

// Tab switching
const tabs = document.querySelectorAll('.admin-tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    // Update active tab
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Show corresponding content
    tabContents.forEach(content => content.classList.remove('active'));
    
    if (targetTab === 'pending') {
      document.getElementById('pendingSection').classList.add('active');
      // Already handled by live onSnapshot
    } else if (targetTab === 'flagged') { // <-- NEW TAB LOGIC
      document.getElementById('flaggedSection').classList.add('active');
      loadFlaggedItems();
    } else if (targetTab === 'marketplace') {
      document.getElementById('marketplaceSection').classList.add('active');
      loadMarketplacePosts();
    } else if (targetTab === 'users') {
      document.getElementById('usersSection').classList.add('active');
      loadAllUsers();
    }
  });
});

// --- NEW FUNCTION TO LOAD FLAGGED ITEMS ---
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

// Load all marketplace posts (active items)
async function loadMarketplacePosts() {
  // ... (This function remains unchanged)

  marketplaceList.innerHTML = '<div class="empty-state">Loading...</div>';
  
  try {
    const itemsRef = collection(db, 'items');
    const q = query(itemsRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      marketplaceList.innerHTML = '<div class="empty-state">No active marketplace posts</div>';
      return;
    }
    
    marketplaceList.innerHTML = '';
    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      const itemDiv = document.createElement('div');
      itemDiv.className = 'marketplace-item';
      
      itemDiv.innerHTML = `
        <img class="marketplace-item-image" src="${(item.images && item.images[0]) || ''}" alt="${escapeHtml(item.title || '')}" />
        <div class="marketplace-item-info">
          <div class="marketplace-item-title">${escapeHtml(item.title || '')}</div>
          <div class="marketplace-item-price">₹${item.price || 0}</div>
          <div class="marketplace-item-seller">Seller: ${item.sellerId || 'unknown'}</div>
          <div style="color:#8892b0;font-size:12px;margin-top:4px;">
            Category: ${escapeHtml(item.category || 'N/A')} | Condition: ${escapeHtml(item.condition || 'N/A')}
          </div>
        </div>
        <div class="admin-actions">
          <button class="btn btn--danger" onclick="deactivateItem('${docSnap.id}')">Deactivate</button>
        </div>
      `;
      
      marketplaceList.appendChild(itemDiv);
    });
  } catch (e) {
    console.error('Error loading marketplace posts:', e);
    marketplaceList.innerHTML = '<div class="empty-state">Error loading posts</div>';
  }
}

// Load all users
async function loadAllUsers() {
  // ... (This function remains unchanged)

  usersList.innerHTML = '<div class="empty-state">Loading...</div>';
  
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
    const users = [];
    
    snapshot.forEach(docSnap => {
      const userData = docSnap.data();
      users.push({ uid: docSnap.id, ...userData });
      totalUsers++;
      if (userData.banned) bannedCount++;
      if (userData.isAdmin) adminCount++;
    });
    
    // Update stats
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('bannedUsers').textContent = bannedCount;
    document.getElementById('adminUsers').textContent = adminCount;
    
    // Render users
    usersList.innerHTML = '';
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
            <div class="user-name">${escapeHtml(user.displayName || user.email || 'Unknown User')}</div>
            <div class="user-email">${escapeHtml(user.email || user.uid)}</div>
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
  } catch (e) {
    console.error('Error loading users:', e);
    usersList.innerHTML = '<div class="empty-state">Error loading users</div>';
  }
}

// Deactivate marketplace item
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

// Make user admin
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

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, (c)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }