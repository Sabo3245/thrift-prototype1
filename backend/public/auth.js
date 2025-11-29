// auth.js - Complete Firebase Authentication Logic
// This file handles all authentication functionality for the CampusKart thrift store

class AuthenticationManager {
  constructor() {
    console.log("🚀 AuthenticationManager constructor called");

    // Check if DOM is ready
    if (document.readyState === "loading") {
      console.log("⏳ Waiting for DOM to be ready...");
      document.addEventListener("DOMContentLoaded", () => {
        console.log("✅ DOM is ready, continuing initialization");
        this.initializeAuth();
      });
    } else {
      console.log("✅ DOM already ready");
      this.initializeAuth();
    }
  }

  initializeAuth() {
    // Check if Firebase is already ready
    if (window.firebaseReady) {
      console.log("✅ Firebase already ready, initializing immediately");
      this.init();
    } else if (window.firebaseError) {
      console.error("❌ Firebase failed to initialize:", window.firebaseError);
      this.showMessage(
        "Firebase connection failed. Please refresh the page.",
        "error"
      );
    } else {
      // Wait for Firebase to be ready
      console.log("⏳ Waiting for Firebase to initialize...");
      window.addEventListener("firebaseReady", () => {
        console.log("✅ Firebase ready event received");
        this.init();
      });

      // Fallback: also try the old method
      this.waitForFirebase()
        .then(() => {
          console.log("✅ Firebase ready via fallback method");
          this.init();
        })
        .catch((error) => {
          console.error("❌ Firebase initialization timeout:", error);
          this.showMessage(
            "Firebase connection timeout. Please check your internet and refresh.",
            "error"
          );
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
          console.log("✅ Firebase modules found!");
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error("Firebase initialization timeout"));
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
    });
  }

  async handleProfileCompletion() {
    const submitBtn = document.getElementById("saveProfileCompletion");
    const phone = document.getElementById("modalPhoneNumber").value.trim();
    const hostel = document.getElementById("modalHostelName").value;
    const uid = this.pendingCompletionUid;

    // Validation
    if (!phone) {
      this.showMessage("Please enter your phone number", "error");
      return;
    }
    if (!hostel) {
      this.showMessage("Please select your hostel", "error");
      return;
    }
    if (!uid) {
      this.showMessage(
        "Error: No user session found. Please try again.",
        "error"
      );
      return;
    }

    try {
      this.setLoadingState(submitBtn, true);
      this.clearMessages();

      console.log(`💾 Updating profile for UID: ${uid}`);
      const userRef = this.modules.doc(this.db, "users", uid);

      // Use setDoc with { merge: true } to update the existing document
      await this.modules.setDoc(
        userRef,
        {
          phone: phone,
          hostel: hostel,
          profileComplete: true, // <-- Mark the profile as complete
        },
        { merge: true }
      );

      console.log("✅ Profile complete!");
      this.showMessage(
        "Profile updated! Welcome to CampusKart! 🎉",
        "success"
      );

      // Now we redirect to the main app
      setTimeout(() => {
        console.log("➡️ Redirecting to marketplace...");
        window.location.href = "index.html";
      }, 2000);
    } catch (error) {
      console.error("❌ Profile completion error:", error);
      this.showMessage(
        "Failed to save your details. Please try again.",
        "error"
      );
    } finally {
      this.setLoadingState(submitBtn, false);
    }
  }

  init() {
    console.log("🚀 Initializing AuthenticationManager...");

    this.auth = window.firebaseAuth;
    this.db = window.firebaseDb;
    this.googleProvider = window.googleProvider;
    this.modules = window.firebaseModules;
    this.pendingCompletionUid = null;

    console.log("Firebase Auth:", this.auth);
    console.log("Firebase DB:", this.db);
    console.log("Google Provider:", this.googleProvider);
    console.log("Firebase Modules:", this.modules);

    // Verify all required modules are available
    const requiredModules = ["signInWithPopup", "signOut"];
    const missingModules = requiredModules.filter(
      (module) => !this.modules[module]
    );

    if (missingModules.length > 0) {
      console.error("❌ Missing Firebase modules:", missingModules);
      this.showMessage(
        "Authentication system incomplete. Please refresh the page.",
        "error"
      );
      return;
    }

    if (!this.auth || !this.db || !this.googleProvider) {
      console.error("❌ Firebase services not properly initialized");
      this.showMessage(
        "Firebase connection failed. Please refresh the page.",
        "error"
      );
      return;
    }

    console.log("✅ All Firebase services initialized successfully");

    this.setupEventListeners();
    // initializeTabSystem() REMOVED

    console.log("✅ AuthenticationManager initialization complete");
  }

  // Tab System Management (REMOVED)

  // Event Listeners Setup
  setupEventListeners() {
    console.log("🔍 Setting up event listeners...");

    // Sign Up Form (REMOVED)
    // Sign In Form (REMOVED)

    // Google Thapar Login Button (NEW)
    const googleThaparLoginBtn = document.getElementById(
      "googleThaparLoginBtn"
    );
    if (googleThaparLoginBtn) {
      googleThaparLoginBtn.addEventListener("click", () => {
        console.log("🔍 Google Thapar login button clicked");
        this.handleThaparGoogleAuth(); // Call the new/renamed function
      });
      console.log("✅ Google Thapar login button listener added");
    } else {
      console.error("❌ Google Thapar login button not found");
    }

    // Google Sign In Button (REMOVED)

    const saveProfileBtn = document.getElementById("saveProfileCompletion");
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleProfileCompletion();
      });
      console.log("✅ Save profile completion listener added");
    } else {
      console.error("❌ Save profile completion button not found");
    }

    // Forgot Password Link (REMOVED)
    // Password Reset Modal (REMOVED)
    // Password Toggle Buttons (REMOVED)

    document.getElementById("openTermsLink").addEventListener("click", (e) => {
      e.preventDefault();
      this.showModal("termsModal");
    });

    document
      .getElementById("openPrivacyLink")
      .addEventListener("click", (e) => {
        e.preventDefault();
        this.showModal("privacyModal");
      });

    document
      .getElementById("closeTermsModal")
      .addEventListener("click", () => {
        this.hideModal("termsModal");
      });

    document
      .getElementById("closePrivacyModal")
      .addEventListener("click", () => {
        this.hideModal("privacyModal");
      });

    // Modal overlay click to close
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", () => {
        const modal = overlay.closest(".modal");
        if (modal) {
          this.hideModal(modal.id);
        }
      });
    });
  }

  // Authentication Methods
  // handleSignUp() REMOVED
  
  // handleSignIn() was here, but you don't have that button anymore.
  // We'll leave the Google Auth as the only login.

async handleThaparGoogleAuth() {
    // --- CONFIGURATION ---
    // Add the specific Google emails you want to allow as dummy accounts here
    const WHITELISTED_EMAILS = [
        "campuskartdemo@gmail.com", 
        "your.personal.email@gmail.com"
    ];
    // ---------------------

    const submitBtn = document.getElementById("googleThaparLoginBtn");
    let isRedirecting = false;

    const urlParams = new URLSearchParams(window.location.search);
    const fromAdmin = urlParams.get('from') === 'admin';
    
    if(fromAdmin) console.log("ADMIN LOGIN FLOW DETECTED");

    console.log(`🔍 Starting Google login process...`);

    try {
      this.setLoadingState(submitBtn, true);
      this.clearMessages();

      if (!this.auth || !this.googleProvider || !this.modules.signInWithPopup) {
        throw new Error("Firebase authentication not properly initialized");
      }

      // Sign in with Google popup
      const result = await this.modules.signInWithPopup(
        this.auth,
        this.googleProvider
      );
      
      const user = result.user;
      const email = user.email ? user.email.toLowerCase() : '';
      const isWhitelisted = WHITELISTED_EMAILS.includes(email);

      console.log("👤 User:", email);

      // --- EMAIL VERIFICATION LOGIC ---
      // We allow the login IF:
      // 1. It is an Admin login flow
      // 2. OR the email is in our Whitelist
      // 3. OR the email ends with @thapar.edu
      
      if (!fromAdmin && !isWhitelisted && !email.endsWith("@thapar.edu")) {
        console.error("❌ Access Denied: Invalid email domain.", email);
        this.showMessage(
          "Access Denied. Only @thapar.edu emails are allowed.",
          "error"
        );
        if (this.auth && this.modules.signOut) {
          await this.modules.signOut(this.auth);
        }
        return; 
      }
      // --- END VERIFICATION ---

      // --- ADMIN REDIRECT LOGIC ---
      if (fromAdmin) {
        let isAdmin = false;
        try {
          const idTokenRes = await user.getIdTokenResult(true); 
          isAdmin = !!idTokenRes?.claims?.admin;
        } catch (e) { console.warn("Could not get admin claims", e); }

        if (isAdmin) {
          this.showMessage("Admin login successful. Redirecting...", "success");
          isRedirecting = true;
          setTimeout(() => window.location.href = "admin.html", 1500);
        } else {
          this.showMessage("Access Denied. You do not have admin privileges.", "error");
          if (this.auth && this.modules.signOut) await this.modules.signOut(this.auth);
        }
        return;
      }
      
      // --- REGULAR / DUMMY USER FLOW ---
      // This runs for students AND whitelisted dummy accounts
      console.log("🔍 Checking user profile...");
      const userDoc = await this.modules.getDoc(
        this.modules.doc(this.db, "users", user.uid)
      );

      if (!userDoc.exists()) {
        console.log("🆕 Creating new user document...");
        const names = user.displayName ? user.displayName.split(" ") : ["", ""];
        
        // Default data for new users
        const userData = {
          firstName: names[0] || "User",
          lastName: names.slice(1).join(" ") || "",
          email: user.email,
          phone: "", 
          hostel: "", 
          createdAt: new Date().toISOString(),
          authProvider: "google",
          profileComplete: false, 
        };

        await this.createUserDocument(user.uid, userData);
        
        isRedirecting = true;
        this.pendingCompletionUid = user.uid;

        const authCard = document.querySelector(".auth-card");
        if (authCard) authCard.style.display = "none";
        this.showModal("completeProfileModal");
      } else {
        console.log("🔄 Existing user signing in...");
        this.showMessage("✨ Welcome back! Let's get thrifting... 🚀", "success");
        isRedirecting = true;
        setTimeout(() => window.location.href = "index.html", 1500);
      }

    } catch (error) {
      console.error("❌ Auth error:", error);
      this.showMessage(`Authentication failed: ${error.message}`, "error");
    } finally {
      if (!isRedirecting) this.setLoadingState(submitBtn, false);
    }
}

  // handlePasswordReset() REMOVED

  // Firestore User Document Creation
  async createUserDocument(uid, userData) {
    console.log("💾 Creating Firestore user document...");
    console.log("UID:", uid);
    console.log("User data:", userData);

    if (!this.db || !this.modules.setDoc || !this.modules.doc) {
      throw new Error("Firestore not properly initialized");
    }

    const userDocData = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone || "",
      hostel: userData.hostel || "",
      createdAt: userData.createdAt || new Date().toISOString(),
      authProvider: userData.authProvider || "google",
      profileComplete:
        userData.profileComplete !== undefined ? userData.profileComplete : true,
      // Additional fields for the marketplace
      totalTransactions: 0,
      points: 5, // Welcome bonus points
      moneySaved: 0,
      listings: [],
      heartedItems: [],
    };

    console.log("📝 Document data:", userDocData);

    try {
      await this.modules.setDoc(
        this.modules.doc(this.db, "users", uid),
        userDocData
      );
      console.log("✅ User document created successfully");
    } catch (error) {
      console.error("❌ Failed to create user document:", error);
      throw error;
    }
  }

  // Form Data and Validation (REMOVED)

  // Utility Methods
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // togglePasswordVisibility() REMOVED

  setLoadingState(button, isLoading) {
    console.log("🔄 Setting loading state:", {
      isLoading,
      button: button?.id,
    });

    if (!button) {
      console.error("❌ setLoadingState: button is null");
      return;
    }

    const btnText = button.querySelector(".btn-text");
    const btnLoader = button.querySelector(".btn-loader");

    console.log("DOM elements found:", {
      btnText: !!btnText,
      btnLoader: !!btnLoader,
      buttonId: button.id,
      buttonClasses: button.className,
    });

    if (isLoading) {
      // Hide button text if it exists
      if (btnText) {
        btnText.style.display = "none";
      } else {
        // If no .btn-text, modify button content directly
        if (!button.dataset.originalText) {
          button.dataset.originalText = button.textContent;
        }
        button.textContent = "🔄 Loading...";
      }

      // Show loader if it exists
      if (btnLoader) {
        btnLoader.classList.remove("hidden");
      }

      button.disabled = true;
      button.classList.add("loading");
    } else {
      // Restore button text
      if (btnText) {
        btnText.style.display = "inline";
      } else if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }

      // Hide loader if it exists
      if (btnLoader) {
        btnLoader.classList.add("hidden");
      }

      button.disabled = false;
      button.classList.remove("loading");
    }
  }

  showMessage(message, type = "info") {
    console.log("📨 Showing message:", { message, type });

    const container = document.getElementById("messageContainer");

    if (!container) {
      console.error("❌ Message container not found, falling back to console");
      console.log(`${type.toUpperCase()}: ${message}`);
      // Fallback: show alert if container doesn't exist
      if (type === "error") {
        alert("Error: " + message);
      }
      return;
    }

    // Clear existing messages
    container.innerHTML = "";

    const messageElement = document.createElement("div");
    messageElement.className = `message message--${type}`;
    messageElement.innerHTML = `
      <div class.message-content">
        <span class="message-icon">${this.getMessageIcon(type)}</span>
        <span class="message-text">${message}</span>
        <button class="message-close">×</button>
      </div>
    `;

    container.appendChild(messageElement);

    // Add click to close functionality
    messageElement.querySelector(".message-close").addEventListener("click", () => {
      messageElement.remove();
    });

    // Auto-remove success messages after 5 seconds
    if (type === "success") {
      setTimeout(() => {
        if (messageElement.parentElement) {
          messageElement.remove();
        }
      }, 5000);
    }

    // Animate in
    requestAnimationFrame(() => {
      messageElement.classList.add("show");
    });
  }

  clearMessages() {
    const container = document.getElementById("messageContainer");
    container.innerHTML = "";
  }

  getMessageIcon(type) {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
      default:
        return "ℹ️";
    }
  }

  getErrorMessage(errorCode) {
    const errorMessages = {
      "auth/too-many-requests":
        "Too many failed attempts. Please try again later",
      "auth/network-request-failed":
        "Network error. Please check your connection and try again",
      "auth/popup-blocked":
        "Google sign-in popup was blocked. Please allow popups and try again",
      "auth/cancelled-popup-request": "Google sign-in was cancelled",
      "auth/popup-closed-by-user":
        "Google sign-in popup was closed before completing the process",
    };

    return (
      errorMessages[errorCode] ||
      "An unexpected error occurred. Please try again"
    );
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("hidden");
      document.body.classList.add("modal-open");
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("hidden");
      document.body.classList.remove("modal-open");
    }
  }

  // Modal Management (REMOVED)
  // Check Authentication State (REMOVED)
  // Loading Screen Management
  showLoadingScreen() {
    document.getElementById("loadingScreen").classList.remove("hidden");
  }

  hideLoadingScreen() {
    document.getElementById("loadingScreen").classList.add("hidden");
  }
}

// Initialize the Authentication Manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new AuthenticationManager();
});

// Add some nice touch interactions for mobile
document.addEventListener("touchstart", function () {}, { passive: true });

// Prevent form submission on Enter (REMOVED)

// Add visual feedback for form interactions
document.querySelectorAll(".animated-input").forEach((input) => {
  input.addEventListener("focus", function () {
    this.parentElement.classList.add("focused");
  });

  input.addEventListener("blur", function () {
    this.parentElement.classList.remove("focused");
  });
});