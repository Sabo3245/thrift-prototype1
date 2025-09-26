# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project summary
- Firebase-backed web app (CampusKart prototype) hosted via Firebase Hosting.
- App code lives in backend/, served as static assets; Firebase SDK handles auth, Firestore, Storage, and real-time chat.
- GitHub Actions deploys Hosting previews on PRs and to live on merge to master.

Prereqs
- Node.js and npm
- Firebase CLI (firebase-tools)
- Set firebase-config.js with your project's keys before running locally

Common commands (run from repo root)
- Install dependencies
  ```bash path=null start=null
  npm --prefix backend install
  ```
- Start local dev server (Hosting only)
  ```bash path=null start=null
  npm --prefix backend run dev
  ```
- Start full Emulator Suite (Auth, Firestore, Storage, Hosting; ports set in backend/firebase.json)
  ```bash path=null start=null
  (cd backend && firebase emulators:start)
  ```
  Ports: auth 9099, firestore 8080, storage 9199, Emulator UI enabled
- Deploy security rules only
  ```bash path=null start=null
  (cd backend && firebase deploy --only firestore:rules,storage:rules)
  ```
- Deploy Hosting (manual)
  ```bash path=null start=null
  npm --prefix backend run deploy
  ```

Notes on tests and linting
- No test framework or linter is configured in this repo. If you add one (e.g., Jest/ESLint), update this file with commands (including how to run a single test).

Architecture overview
- Static Hosting entrypoint: backend/public/index.html
  - Uses Firebase Hosting auto-injected SDK scripts for compat builds during dev. For app code, use ES modules under backend/.
- Firebase initialization: backend/firebase-config.js
  - Initializes Firebase app and exports auth, db (Firestore), storage, analytics instances used by other modules.
- Authentication: backend/auth.js
  - Email/password and Google sign-in, sign-out, password reset, profile updates.
  - On first sign-up, creates a corresponding users/{uid} document with profile and settings.
- Firestore domain logic: backend/firestore.js
  - Items (CRUD, soft-delete, heart/boost mechanics), item search filter on client, user transactions/points, and real-time listeners for items and user profiles.
  - Collections used: users, items, transactions (also referenced by chat.js for conversations/messages).
- Storage: backend/storage.js
  - Image uploads (single/multiple), progress-tracked uploads, deletions, and listing per-user; basic client-side image validation/compression utilities.
- Chat: backend/chat.js
  - Conversation lifecycle (create or reuse), message send/fetch, unread counts, and real-time listeners for conversations/messages.
  - Collections used: conversations, messages.
- UI orchestration: backend/updated-app.js
  - Central AppState, subscribes to auth changes, binds real-time listeners (items, conversations), coordinates UI updates, and routes user actions to auth/firestore/storage/chat modules.
- Firebase project config: backend/firebase.json
  - Hosting rewrites to /index.html, Emulator Suite ports, Firestore/Storage rules and indexes.
- Security and indexes: backend/firestore.rules, backend/storage.rules, backend/firestore.indexes.json

CI/CD
- GitHub Actions
  - .github/workflows/firebase-hosting-pull-request.yml: deploys preview channels on PRs from this repo using FirebaseExtended/action-hosting-deploy.
  - .github/workflows/firebase-hosting-merge.yml: deploys to live on pushes to master.
  - These workflows require GitHub repo secrets for Firebase service account credentials; ensure they are configured in repository settings.

Key project docs
- backend/FIREBASE_SETUP_GUIDE.md: step-by-step Firebase setup (project creation, enabling services, configuring SDK, deploying rules) and CSS/UI suggestions for auth modal.

Conventions and tips specific to this repo
- Prefer running commands from repo root using npm --prefix backend … to avoid changing directories in scripts.
- During local development, the emulator settings in backend/firebase.json are authoritative; start the Emulator Suite when you want Auth/Firestore/Storage locally.
- updated-app.js assumes DOM elements with specific IDs/classes for UI binding; when modifying UI structure, update the associated selectors and event bindings accordingly.
