// auth.js - Complete Firebase Authentication Logic
// This file handles all authentication functionality for the CampusKart thrift store

class AuthenticationManager {
  constructor() {
    console.log('🚀 AuthenticationManager constructor called');
    
    // Check if DOM is ready
    if (document.readyState === 'loading') {
      console.log('⏳ Waiting for DOM to be ready...');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM is ready, continuing initialization');
        this.initializeAuth();
      });
    } else {
      console.log('✅ DOM already ready');
      this.initializeAuth();
    }
  }
  
  initializeAuth() {
    // Check if Firebase is already ready
    if (window.firebaseReady) {
      console.log('✅ Firebase already ready, initializing immediately');
      this.init();
    } else if (window.firebaseError) {
      console.error('❌ Firebase failed to initialize:', window.firebaseError);
      this.showMessage('Firebase connection failed. Please refresh the page.', 'error');
    } else {
      // Wait for Firebase to be ready
      console.log('⏳ Waiting for Firebase to initialize...');
      window.addEventListener('firebaseReady', () => {
        console.log('✅ Firebase ready event received');
        this.init();
      });
      
      // Fallback: also try the old method
      this.waitForFirebase().then(() => {
        console.log('✅ Firebase ready via fallback method');
        this.init();
      }).catch(error => {
        console.error('❌ Firebase initialization timeout:', error);
        this.showMessage('Firebase connection timeout. Please check your internet and refresh.', 'error');
      });
    }
  }

  async waitForFirebase() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds total
      
      const checkFirebase = () => {
        attempts++;
        console.log(`🔍 Checking Firebase (attempt ${attempts}/${maxAttempts})`);
        
        if (window.firebaseAuth && window.firebaseDb && window.firebaseModules) {
          console.log('✅ Firebase modules found!');
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Firebase initialization timeout'));
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
    });
  }

  async handleProfileCompletion() {
    const submitBtn = document.getElementById('saveProfileCompletion');
    const phone = document.getElementById('modalPhoneNumber').value.trim();
    const hostel = document.getElementById('modalHostelName').value;
    const uid = this.pendingCompletionUid;

    // Validation
    if (!phone) {
      this.showMessage('Please enter your phone number', 'error');
      return;
    }
    if (!hostel) {
      this.showMessage('Please select your hostel', 'error');
      return;
    }
    if (!uid) {
      this.showMessage('Error: No user session found. Please try again.', 'error');
      return;
    }

    try {
      this.setLoadingState(submitBtn, true);
      this.clearMessages();

      console.log(`💾 Updating profile for UID: ${uid}`);
      const userRef = this.modules.doc(this.db, 'users', uid);
      
      // Use setDoc with { merge: true } to update the existing document
      await this.modules.setDoc(userRef, {
        phone: phone,
        hostel: hostel,
        profileComplete: true // <-- Mark the profile as complete
      }, { merge: true });

      console.log('✅ Profile complete!');
      this.showMessage('Profile updated! Welcome to CampusKart! 🎉', 'success');

      // Now we redirect to the main app
      setTimeout(() => {
        console.log('➡️ Redirecting to marketplace...');
        window.location.href = 'index.html';
      }, 2000);

    } catch (error) {
      console.error('❌ Profile completion error:', error);
      this.showMessage('Failed to save your details. Please try again.', 'error');
    } finally {
      this.setLoadingState(submitBtn, false);
    }
  }

  init() {
    console.log('🚀 Initializing AuthenticationManager...');
    
    this.auth = window.firebaseAuth;
    this.db = window.firebaseDb;
    this.googleProvider = window.googleProvider;
    this.modules = window.firebaseModules;
    this.pendingCompletionUid = null;

    console.log('Firebase Auth:', this.auth);
    console.log('Firebase DB:', this.db);
    console.log('Google Provider:', this.googleProvider);
    console.log('Firebase Modules:', this.modules);

    // Verify all required modules are available
    const requiredModules = ['createUserWithEmailAndPassword', 'signInWithEmailAndPassword', 'signInWithPopup'];
    const missingModules = requiredModules.filter(module => !this.modules[module]);
    
    if (missingModules.length > 0) {
      console.error('❌ Missing Firebase modules:', missingModules);
      this.showMessage('Authentication system incomplete. Please refresh the page.', 'error');
      return;
    }

    if (!this.auth || !this.db || !this.googleProvider) {
      console.error('❌ Firebase services not properly initialized');
      this.showMessage('Firebase connection failed. Please refresh the page.', 'error');
      return;
    }

    console.log('✅ All Firebase services initialized successfully');

    this.setupEventListeners();
    this.initializeTabSystem();

    
    console.log('✅ AuthenticationManager initialization complete');
  }

  // Tab System Management
  initializeTabSystem() {
    const tabs = document.querySelectorAll('.auth-tab');
    const tabIndicator = document.querySelector('.tab-indicator');
    
    // Set initial indicator position
    this.updateTabIndicator(document.querySelector('.auth-tab.active'), tabIndicator);

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = e.target.dataset.tab;
        this.switchTab(targetTab);
        this.updateTabIndicator(e.target, tabIndicator);
      });
    });
  }

  switchTab(targetTab) {
    // Remove active class from all tabs and forms
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.auth-form-container').forEach(form => form.classList.remove('active'));

    // Add active class to target tab and form
    document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
    document.getElementById(`${targetTab}-form`).classList.add('active');

    // Clear any previous messages
    this.clearMessages();
  }

  updateTabIndicator(activeTab, indicator) {
    const tabRect = activeTab.getBoundingClientRect();
    const tabsRect = activeTab.parentElement.getBoundingClientRect();
    const indicatorWidth = tabRect.width;
    const indicatorLeft = tabRect.left - tabsRect.left;

    indicator.style.width = `${indicatorWidth}px`;
    indicator.style.transform = `translateX(${indicatorLeft}px)`;
  }

  // Event Listeners Setup
  setupEventListeners() {
    console.log('🔍 Setting up event listeners...');
    
    // Sign Up Form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSignUp();
      });
      console.log('✅ Sign up form listener added');
    } else {
      console.error('❌ Sign up form not found');
    }

    // Sign In Form
    const signinForm = document.getElementById('signinForm');
    if (signinForm) {
      signinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSignIn();
      });
      console.log('✅ Sign in form listener added');
    } else {
      console.error('❌ Sign in form not found');
    }

    // Google Sign Up Button
    const googleSignupBtn = document.getElementById('googleSignupBtn');
    if (googleSignupBtn) {
      googleSignupBtn.addEventListener('click', () => {
        console.log('🔍 Google signup button clicked');
        this.handleGoogleAuth('signup');
      });
      console.log('✅ Google signup button listener added');
    } else {
      console.error('❌ Google signup button not found');
    }

    // Google Sign In Button
    const googleSigninBtn = document.getElementById('googleSigninBtn');
    if (googleSigninBtn) {
      googleSigninBtn.addEventListener('click', () => {
        console.log('🔍 Google signin button clicked');
        this.handleGoogleAuth('signin');
      });
      console.log('✅ Google signin button listener added');
    } else {
      console.error('❌ Google signin button not found');
    }

    const saveProfileBtn = document.getElementById('saveProfileCompletion');
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleProfileCompletion();
      });
      console.log('✅ Save profile completion listener added');
    } else {
      console.error('❌ Save profile completion button not found');
    }

    // Forgot Password Link
    document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showPasswordResetModal();
    });

    // Password Reset Modal
    document.getElementById('sendResetEmail').addEventListener('click', () => {
      this.handlePasswordReset();
    });

    document.getElementById('cancelReset').addEventListener('click', () => {
      this.hidePasswordResetModal();
    });

    // Password Toggle Buttons
    document.getElementById('toggleSignupPassword').addEventListener('click', () => {
      this.togglePasswordVisibility('signupPassword');
    });

    document.getElementById('toggleSigninPassword').addEventListener('click', () => {
      this.togglePasswordVisibility('signinPassword');
    });

    document.getElementById('openTermsLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showModal('termsModal');
    });

    document.getElementById('openPrivacyLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showModal('privacyModal');
    });

    document.getElementById('closeTermsModal').addEventListener('click', () => {
      this.hideModal('termsModal');
    });
    
    document.getElementById('closePrivacyModal').addEventListener('click', () => {
      this.hideModal('privacyModal');
    });

    // Modal overlay click to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', () => {
        const modal = overlay.closest('.modal');
        if (modal) {
          this.hideModal(modal.id);
        }
      });
    });
  }

  // Authentication Methods
  async handleSignUp() {
    const submitBtn = document.getElementById('signupBtn');
    const formData = this.getSignUpFormData();

    console.log('🔍 Starting email sign up process...');
    console.log('Form data:', { ...formData, password: '[REDACTED]' });

    // Validate form
    if (!this.validateSignUpForm(formData)) {
      console.log('❌ Form validation failed');
      return;
    }

    // Verify Firebase is ready
    if (!this.auth || !this.modules.createUserWithEmailAndPassword) {
      console.error('❌ Firebase not properly initialized');
      this.showMessage('Authentication system not ready. Please refresh the page.', 'error');
      return;
    }

    try {
      this.setLoadingState(submitBtn, true);
      this.clearMessages();

      console.log('🔥 Creating user with email and password...');
      // Create user with email and password
      const userCredential = await this.modules.createUserWithEmailAndPassword(
        this.auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;
      console.log('✅ User created:', { uid: user.uid, email: user.email });

      console.log('📝 Updating user profile...');
      // Update user profile with display name
      await this.modules.updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      console.log('💾 Creating user document in Firestore...');
      // Create user document in Firestore
      await this.createUserDocument(user.uid, formData);

      console.log('✅ Sign up completed successfully!');
      this.showMessage('Account created successfully! Welcome to CampusKart! 🎉', 'success');
      
      // Redirect after a short delay
      setTimeout(() => {
        console.log('➡️ Redirecting to marketplace...');
        window.location.href = 'index.html';
      }, 2000);

    } catch (error) {
      console.error('❌ Sign up error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message
      });
      this.showMessage(this.getErrorMessage(error.code), 'error');
    } finally {
      this.setLoadingState(submitBtn, false);
    }
  }

  async handleSignIn() {
    const submitBtn = document.getElementById('signinBtn');
    const email = document.getElementById('signinEmail').value.trim();
    const password = document.getElementById('signinPassword').value;

    console.log('🔍 Starting email sign in process...');
    console.log('Email:', email);

    // Basic validation
    if (!email || !password) {
      console.log('❌ Sign in validation failed: missing fields');
      this.showMessage('Please fill in all fields', 'error');
      return;
    }

    // Verify Firebase is ready
    if (!this.auth || !this.modules.signInWithEmailAndPassword) {
      console.error('❌ Firebase not properly initialized for sign in');
      this.showMessage('Authentication system not ready. Please refresh the page.', 'error');
      return;
    }

    try {
      this.setLoadingState(submitBtn, true);
      this.clearMessages();

      console.log('🔥 Signing in with email and password...');
      // Sign in with email and password
      const userCredential = await this.modules.signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      console.log('✅ Sign in successful:', { uid: userCredential.user.uid, email: userCredential.user.email });
      this.showMessage('Welcome back! Redirecting to marketplace... 🚀', 'success');

      // Redirect after a short delay
      setTimeout(() => {
        console.log('➡️ Redirecting to marketplace...');
        window.location.href = 'index.html';
      }, 1500);

    } catch (error) {
      console.error('❌ Sign in error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message
      });
      this.showMessage(this.getErrorMessage(error.code), 'error');
    } finally {
      this.setLoadingState(submitBtn, false);
    }
  }

  async handleGoogleAuth(type = 'signin') {
    const btnId = type === 'signup' ? 'googleSignupBtn' : 'googleSigninBtn';
    const submitBtn = document.getElementById(btnId);

    console.log(`🔍 Starting Google ${type} process...`);
    console.log('Firebase Auth:', this.auth);
    console.log('Google Provider:', this.googleProvider);
    console.log('SignInWithPopup function:', this.modules.signInWithPopup);

    try {
      this.setLoadingState(submitBtn, true);
      this.clearMessages();

      // Verify Firebase is properly initialized
      if (!this.auth || !this.googleProvider || !this.modules.signInWithPopup) {
        throw new Error('Firebase authentication not properly initialized');
      }

      console.log('🔥 Initiating Google popup...');
      
      // Sign in with Google popup
      const result = await this.modules.signInWithPopup(this.auth, this.googleProvider);
      console.log('✅ Google popup result:', result);
      
      const user = result.user;
      console.log('👤 User from Google:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });

      // Check if this is a new user (for signup flow)
      console.log('🔍 Checking if user exists in Firestore...');
      const userDoc = await this.modules.getDoc(this.modules.doc(this.db, 'users', user.uid));
      console.log('User doc exists:', userDoc.exists());
      
      if (!userDoc.exists() && type === 'signup') {
        console.log('🆕 Creating new user document for Google signup...');
        // This is a new user signing up with Google
        const names = user.displayName ? user.displayName.split(' ') : ['', ''];
        const userData = {
          firstName: names[0] || '',
          lastName: names.slice(1).join(' ') || '',
          email: user.email,
          phone: '', // User can update later
          hostel: '', // User can update later
          createdAt: new Date().toISOString(),
          authProvider: 'google',
          profileComplete: false // Flag to prompt for missing info
        };

        await this.createUserDocument(user.uid, userData);
        console.log('Google user needs to complete profile');
        this.pendingCompletionUid = user.uid; // Store the UID
        
        // Hide the main auth card and show the modal
        const authCard = document.querySelector('.auth-card');
        if (authCard) authCard.style.display = 'none';
        this.showModal('completeProfileModal');
      } else if (userDoc.exists()) {
        console.log('🔄 Existing user signing in...');

      console.log('➡️ Redirecting to marketplace...');  
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
        // Existing user signing in
        this.showMessage('Welcome back! Redirecting to marketplace... 🚀', 'success');
      } else {
        console.log('⚠️ User tried to sign in but no account exists');
        // User tried to sign in but doesn't have an account
        this.showMessage('No account found. Please sign up first or use the Sign Up tab.', 'error');
        await this.auth.signOut(); // Sign out the user
        return;
      }

      // Redirect after a short delay


    } catch (error) {
      console.error('❌ Google authentication error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      if (error.code === 'auth/popup-closed-by-user') {
        this.showMessage('Google sign-in was cancelled', 'warning');
      } else if (error.code === 'auth/popup-blocked') {
        this.showMessage('Google sign-in popup was blocked. Please allow popups and try again.', 'error');
      } else if (error.code === 'auth/unauthorized-domain') {
        this.showMessage('This domain is not authorized for Google sign-in. Please contact support.', 'error');
      } else if (error.message.includes('Firebase authentication not properly initialized')) {
        this.showMessage('Authentication system not ready. Please refresh the page and try again.', 'error');
      } else {
        this.showMessage(`Google authentication failed: ${error.message}`, 'error');
      }
    } finally {
      this.setLoadingState(submitBtn, false);
    }
  }

  async handlePasswordReset() {
    const submitBtn = document.getElementById('sendResetEmail');
    const email = document.getElementById('resetEmail').value.trim();

    if (!email) {
      this.showMessage('Please enter your email address', 'error');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showMessage('Please enter a valid email address', 'error');
      return;
    }

    try {
      this.setLoadingState(submitBtn, true);

      await this.modules.sendPasswordResetEmail(this.auth, email);
      
      this.showMessage('Password reset email sent! Check your inbox. 📧', 'success');
      this.hidePasswordResetModal();
      
      // Reset the form
      document.getElementById('resetEmail').value = '';

    } catch (error) {
      console.error('Password reset error:', error);
      this.showMessage(this.getErrorMessage(error.code), 'error');
    } finally {
      this.setLoadingState(submitBtn, false);
    }
  }

  // Firestore User Document Creation
  async createUserDocument(uid, userData) {
    console.log('💾 Creating Firestore user document...');
    console.log('UID:', uid);
    console.log('User data:', userData);
    
    if (!this.db || !this.modules.setDoc || !this.modules.doc) {
      throw new Error('Firestore not properly initialized');
    }

    const userDocData = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone || '',
      hostel: userData.hostel || '',
      createdAt: userData.createdAt || new Date().toISOString(),
      authProvider: userData.authProvider || 'email',
      profileComplete: userData.profileComplete !== undefined ? userData.profileComplete : true,
      // Additional fields for the marketplace
      totalTransactions: 0,
      points: 5, // Welcome bonus points
      moneySaved: 0,
      listings: [],
      heartedItems: []
    };

    console.log('📝 Document data:', userDocData);

    try {
      await this.modules.setDoc(
        this.modules.doc(this.db, 'users', uid),
        userDocData
      );
      console.log('✅ User document created successfully');
    } catch (error) {
      console.error('❌ Failed to create user document:', error);
      throw error;
    }
  }

  // Form Data and Validation
  getSignUpFormData() {
    return {
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      email: document.getElementById('signupEmail').value.trim(),
      password: document.getElementById('signupPassword').value,
      phone: document.getElementById('phoneNumber').value.trim(),
      hostel: document.getElementById('hostelName').value,
      agreeTerms: document.getElementById('agreeTerms').checked
    };
  }

  validateSignUpForm(data) {
    // Check required fields
    if (!data.firstName) {
      this.showMessage('First name is required', 'error');
      return false;
    }

    if (!data.lastName) {
      this.showMessage('Last name is required', 'error');
      return false;
    }

    if (!data.email) {
      this.showMessage('Email address is required', 'error');
      return false;
    }

    if (!this.isValidEmail(data.email)) {
      this.showMessage('Please enter a valid email address', 'error');
      return false;
    }

    if (!data.password) {
      this.showMessage('Password is required', 'error');
      return false;
    }

    if (data.password.length < 6) {
      this.showMessage('Password must be at least 6 characters long', 'error');
      return false;
    }

    if (!data.phone) {
      this.showMessage('Phone number is required', 'error');
      return false;
    }

    if (!data.hostel) {
      this.showMessage('Please select your hostel', 'error');
      return false;
    }

    if (!data.agreeTerms) {
      this.showMessage('Please agree to the Terms of Service and Privacy Policy', 'error');
      return false;
    }

    return true;
  }

  // Utility Methods
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleBtn = passwordInput.parentElement.querySelector('.password-toggle');
    
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      toggleBtn.textContent = '🙈';
    } else {
      passwordInput.type = 'password';
      toggleBtn.textContent = '👁️';
    }
  }

  setLoadingState(button, isLoading) {
    console.log('🔄 Setting loading state:', { isLoading, button: button?.id });
    
    if (!button) {
      console.error('❌ setLoadingState: button is null');
      return;
    }
    
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    console.log('DOM elements found:', { 
      btnText: !!btnText, 
      btnLoader: !!btnLoader,
      buttonId: button.id,
      buttonClasses: button.className
    });

    if (isLoading) {
      // Hide button text if it exists
      if (btnText) {
        btnText.style.display = 'none';
      } else {
        // If no .btn-text, modify button content directly
        if (!button.dataset.originalText) {
          button.dataset.originalText = button.textContent;
        }
        button.textContent = '🔄 Loading...';
      }
      
      // Show loader if it exists
      if (btnLoader) {
        btnLoader.classList.remove('hidden');
      }
      
      button.disabled = true;
      button.classList.add('loading');
    } else {
      // Restore button text
      if (btnText) {
        btnText.style.display = 'inline';
      } else if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }
      
      // Hide loader if it exists
      if (btnLoader) {
        btnLoader.classList.add('hidden');
      }
      
      button.disabled = false;
      button.classList.remove('loading');
    }
  }

  showMessage(message, type = 'info') {
    console.log('📨 Showing message:', { message, type });
    
    const container = document.getElementById('messageContainer');
    
    if (!container) {
      console.error('❌ Message container not found, falling back to console');
      console.log(`${type.toUpperCase()}: ${message}`);
      // Fallback: show alert if container doesn't exist
      if (type === 'error') {
        alert('Error: ' + message);
      }
      return;
    }
    
    // Clear existing messages
    container.innerHTML = '';

    const messageElement = document.createElement('div');
    messageElement.className = `message message--${type}`;
    messageElement.innerHTML = `
      <div class="message-content">
        <span class="message-icon">${this.getMessageIcon(type)}</span>
        <span class="message-text">${message}</span>
        <button class="message-close">×</button>
      </div>
    `;

    container.appendChild(messageElement);

    // Add click to close functionality
    messageElement.querySelector('.message-close').addEventListener('click', () => {
      messageElement.remove();
    });

    // Auto-remove success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        if (messageElement.parentElement) {
          messageElement.remove();
        }
      }, 5000);
    }

    // Animate in
    requestAnimationFrame(() => {
      messageElement.classList.add('show');
    });
  }

  clearMessages() {
    const container = document.getElementById('messageContainer');
    container.innerHTML = '';
  }

  getMessageIcon(type) {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': 
      default: return 'ℹ️';
    }
  }

  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/email-already-in-use': 'An account with this email already exists',
      'auth/invalid-email': 'Please enter a valid email address',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/user-not-found': 'No account found with this email address',
      'auth/wrong-password': 'Incorrect password. Please try again',
      'auth/invalid-credential': 'Invalid email or password. Please check and try again',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/network-request-failed': 'Network error. Please check your connection and try again',
      'auth/popup-blocked': 'Google sign-in popup was blocked. Please allow popups and try again',
      'auth/cancelled-popup-request': 'Google sign-in was cancelled',
      'auth/popup-closed-by-user': 'Google sign-in popup was closed before completing the process'
    };

    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again';
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      document.body.classList.add('modal-open');
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    }
  }

  // Modal Management
// Modal Management (Refactored)
  showPasswordResetModal() {
    this.showModal('resetPasswordModal'); // Use generic helper
    // Prefill email if available from sign-in form
    const signinEmail = document.getElementById('signinEmail').value.trim();
    if (signinEmail) {
      document.getElementById('resetEmail').value = signinEmail;
    }
  }

  hidePasswordResetModal() {
    this.hideModal('resetPasswordModal'); // Use generic helper
    document.getElementById('resetEmail').value = '';
  }

  // Check Authentication State


  // Loading Screen Management
  showLoadingScreen() {
    document.getElementById('loadingScreen').classList.remove('hidden');
  }

  hideLoadingScreen() {
    document.getElementById('loadingScreen').classList.add('hidden');
  }
}

// Initialize the Authentication Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AuthenticationManager();
});

// Add some nice touch interactions for mobile
document.addEventListener('touchstart', function() {}, { passive: true });

// Prevent form submission on Enter in password fields (except when intended)
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.type === 'password') {
      const form = activeElement.closest('form');
      if (form) {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
        }
      }
    }
  }
});

// Add visual feedback for form interactions
document.querySelectorAll('.animated-input').forEach(input => {
  input.addEventListener('focus', function() {
    this.parentElement.classList.add('focused');
  });
  
  input.addEventListener('blur', function() {
    this.parentElement.classList.remove('focused');
  });
});