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
  initializeFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  deleteField,
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
    notAdmin.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }

  // Admin: subscribe to pending/flagged items
  notAdmin.classList.add('hidden');
  content.classList.remove('hidden');

  const itemsRef = collection(db, 'items');
  const q = query(itemsRef, where('isActive', '==', false));
  onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    renderItems(rows);
  });
});

function renderItems(items) {
  if (!items || items.length === 0) {
    itemsList.innerHTML = '<div class="empty-state">No pending items</div>';
    return;
  }

  itemsList.innerHTML = '';
  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'item-row';

    const thumb = document.createElement('img');
    thumb.className = 'item-thumb';
    thumb.src = (item.images && item.images[0]) || '';
    thumb.alt = item.title || 'thumb';

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.innerHTML = `
      <strong>${escapeHtml(item.title || '')}</strong>
      <div>${escapeHtml(item.description || '').slice(0,300)}</div>
      <div>Seller: <code>${item.sellerId || 'unknown'}</code></div>
      <div>Flagged: ${item.flagged ? 'yes' : 'no'} ${item.flagReason ? '('+escapeHtml(item.flagReason)+')' : ''}</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'admin-actions';

    const approveBtn = document.createElement('button');
    approveBtn.className = 'btn btn--primary';
    approveBtn.textContent = 'Approve';
    approveBtn.addEventListener('click', () => approveItem(item.id));

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'btn btn--danger';
    rejectBtn.textContent = 'Reject';
    rejectBtn.addEventListener('click', () => rejectItem(item.id));

    const banBtn = document.createElement('button');
    banBtn.className = 'btn';
    banBtn.textContent = 'Ban Seller';
    banBtn.addEventListener('click', () => banUser(item.sellerId));

    const unbanBtn = document.createElement('button');
    unbanBtn.className = 'btn';
    unbanBtn.textContent = 'Unban Seller';
    unbanBtn.addEventListener('click', () => unbanUser(item.sellerId));

    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);
    actions.appendChild(banBtn);
    actions.appendChild(unbanBtn);

    row.appendChild(thumb);
    row.appendChild(meta);
    row.appendChild(actions);
    itemsList.appendChild(row);
  });
}

async function approveItem(itemId) {
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
    alert('Approved');
  } catch (e) { console.error(e); alert('Error approving'); }
}

async function rejectItem(itemId) {
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
    alert('Rejected');
  } catch (e) { console.error(e); alert('Error rejecting'); }
}

async function banUser(uid) {
  if (!uid) return alert('No uid');
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { banned: true, bannedAt: serverTimestamp() });
    alert('User banned');
  } catch (e) { console.error(e); alert('Error banning user'); }
}

async function unbanUser(uid) {
  if (!uid) return alert('No uid');
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { banned: false, strikes: 0, bannedAt: deleteField() });
    alert('User unbanned');
  } catch (e) { console.error(e); alert('Error unbanning user'); }
}

// Lookup user panel
document.getElementById('lookupBtn').addEventListener('click', async () => {
  const uid = document.getElementById('lookupUid').value.trim();
  if (!uid) return alert('Enter UID');
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const panel = document.getElementById('userPanel');
  if (!snap.exists()) { panel.innerHTML = '<div>User not found</div>'; return; }
  const data = snap.data();
  panel.innerHTML = `
    <div><strong>${escapeHtml(data.displayName || data.email || uid)}</strong></div>
    <div>UID: <code>${uid}</code></div>
    <div>Strikes: ${data.strikes || 0}</div>
    <div>Banned: ${data.banned ? 'yes' : 'no'}</div>
    <div style="margin-top:8px">
      <button id="banUserBtn" class="btn btn--danger">Ban</button>
      <button id="unbanUserBtn" class="btn">Unban</button>
    </div>
    <div style="margin-top:8px">
      <label>Display Name</label>
      <input id="editDisplayName" value="${escapeHtml(data.displayName || '')}" />
      <label style="margin-left:12px">Is Admin</label>
      <input type="checkbox" id="editIsAdmin" ${data.isAdmin ? 'checked' : ''} />
      <button id="saveProfileBtn" class="btn">Save</button>
    </div>
  `;

  document.getElementById('banUserBtn').addEventListener('click', () => banUser(uid));
  document.getElementById('unbanUserBtn').addEventListener('click', () => unbanUser(uid));
  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const newName = document.getElementById('editDisplayName').value.trim();
    const isAdminVal = document.getElementById('editIsAdmin').checked;
    try {
      await updateDoc(doc(db,'users',uid), { displayName: newName, isAdmin: isAdminVal, updatedAt: serverTimestamp() });
      alert('Saved');
    } catch (e) { console.error(e); alert('Error saving'); }
  });
});

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, (c)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }
