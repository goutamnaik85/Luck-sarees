/**
 * wishlist.js
 * Same pattern as cart.js: localStorage for guests, Firestore sync once
 * signed in (users/{uid}/meta/wishlist).
 */
import { db, auth } from "./firebase.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const WISH_KEY = "lc_wishlist";

function readLocal() {
  try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; }
  catch { return []; }
}
function writeLocal(items) {
  localStorage.setItem(WISH_KEY, JSON.stringify(items));
  updateWishlistBadge();
}
async function syncToFirestore(items) {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, COLLECTIONS.users, user.uid, "meta", "wishlist"), { items }, { merge: true });
}

export async function hydrateWishlistFromCloud() {
  const user = auth.currentUser;
  if (!user) return;
  const snap = await getDoc(doc(db, COLLECTIONS.users, user.uid, "meta", "wishlist"));
  if (snap.exists() && Array.isArray(snap.data().items) && snap.data().items.length) {
    writeLocal(snap.data().items);
  } else {
    await syncToFirestore(readLocal());
  }
}

export function getWishlist() {
  return readLocal();
}

export function isInWishlist(productId) {
  return readLocal().some((i) => i.id === productId);
}

/** Adds/removes a product from the wishlist. Returns true if now active. */
export async function toggleWishlist(product) {
  let items = readLocal();
  const exists = items.some((i) => i.id === product.id);
  if (exists) {
    items = items.filter((i) => i.id !== product.id);
  } else {
    items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      image: product.images?.[0] || "/images/placeholder-saree.jpg"
    });
  }
  writeLocal(items);
  await syncToFirestore(items);
  return !exists;
}

export function removeFromWishlist(productId) {
  const items = readLocal().filter((i) => i.id !== productId);
  writeLocal(items);
  syncToFirestore(items);
  return items;
}

export function updateWishlistBadge() {
  const count = readLocal().length;
  document.querySelectorAll("[data-wishlist-count]").forEach((el) => {
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });
}

document.addEventListener("DOMContentLoaded", updateWishlistBadge);
