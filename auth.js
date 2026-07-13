/**
 * auth.js
 * Handles Firebase Authentication: register, login, Google sign-in,
 * password reset, logout, and auth-gated UI state (navbar icons etc).
 */
import { auth, db, googleProvider, onAuthStateChanged } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/** Creates the Firestore user profile doc if it doesn't already exist. */
async function ensureUserDoc(user, extra = {}) {
  const ref = doc(db, COLLECTIONS.users, user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      name: user.displayName || extra.name || "",
      email: user.email,
      phone: extra.phone || "",
      role: "customer",
      addresses: [],
      createdAt: serverTimestamp()
    });
  }
}

/** Registers a new customer with email/password. */
export async function registerUser({ name, email, password, phone }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await ensureUserDoc(cred.user, { name, phone });
  return cred.user;
}

/** Logs an existing customer in with email/password. */
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/** Google one-click sign-in / sign-up. */
export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserDoc(cred.user);
  return cred.user;
}

/** Sends a password reset email. */
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

/** Signs the current user out. */
export async function logoutUser() {
  await signOut(auth);
  window.location.href = "/login.html";
}

/** Fetches the Firestore profile document for the current user. */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
  return snap.exists() ? snap.data() : null;
}

/** Updates fields on the current user's profile document. */
export async function updateUserProfile(uid, data) {
  await setDoc(doc(db, COLLECTIONS.users, uid), data, { merge: true });
}

/**
 * Wires up the navbar auth-dependent icon: shows initials/avatar when
 * logged in, a login link when not, and redirects protected pages to
 * /login.html for logged-out visitors.
 */
export function initAuthUI() {
  onAuthStateChanged((user) => {
    const el = document.querySelector("[data-account-link]");
    if (!el) return;
    if (user) {
      el.href = "/account.html";
      el.setAttribute("title", user.displayName || user.email);
    } else {
      el.href = "/login.html";
      el.setAttribute("title", "Login");
    }

    const protectedPage = document.body.dataset.requiresAuth === "true";
    if (protectedPage && !user) {
      window.location.href = "/login.html?redirect=" + encodeURIComponent(window.location.pathname);
    }

    document.querySelectorAll("[data-logout]").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.preventDefault(); logoutUser(); });
    });
  });
}

function friendlyAuthError(code) {
  const map = {
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled."
  };
  return map[code] || "Something went wrong. Please try again.";
}
export { friendlyAuthError };
