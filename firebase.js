/**
 * firebase.js
 * Initializes Firebase (App, Auth, Firestore, Storage) using the Firebase
 * v10 modular SDK loaded from the CDN as ES modules. Every other JS module
 * imports the instances exported here instead of re-initializing Firebase.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged as _onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const app = initializeApp(FIREBASE_CONFIG);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Offline persistence makes cart/wishlist/browsing resilient to flaky
// mobile connections, which matters a lot for our audience.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Persistence disabled: multiple tabs open.");
  } else if (err.code === "unimplemented") {
    console.warn("Persistence not supported in this browser.");
  }
});

/** Wrapper kept so callers don't need to import Firebase auth directly. */
export function onAuthStateChanged(callback) {
  return _onAuthStateChanged(auth, callback);
}

/** Returns the currently signed-in user, or null. */
export function getCurrentUser() {
  return auth.currentUser;
}
