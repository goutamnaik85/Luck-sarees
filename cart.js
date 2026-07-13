/**
 * cart.js
 * Cart state lives in localStorage for guests, and syncs to Firestore
 * (users/{uid}/cart) once a user is signed in, so it survives across
 * devices. All pages read/write through the functions exported here.
 */
import { db, auth } from "./firebase.js";
import {
  doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CART_KEY = "lc_cart";

function readLocal() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function writeLocal(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartBadge();
}

async function syncToFirestore(items) {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, COLLECTIONS.users, user.uid, "meta", "cart"), { items }, { merge: true });
}

/** Pulls the Firestore cart (if any) into localStorage on login. */
export async function hydrateCartFromCloud() {
  const user = auth.currentUser;
  if (!user) return;
  const snap = await getDoc(doc(db, COLLECTIONS.users, user.uid, "meta", "cart"));
  if (snap.exists() && Array.isArray(snap.data().items) && snap.data().items.length) {
    writeLocal(snap.data().items);
  } else {
    await syncToFirestore(readLocal());
  }
}

/** Returns the full cart array: [{id, name, price, image, qty, ...}] */
export function getCart() {
  return readLocal();
}

/** Adds a product to the cart, or increments qty if already present. */
export function addToCart(product, qty = 1, options = {}) {
  const items = readLocal();
  const key = product.id + (options.color || "") + (options.size || "");
  const existing = items.find((i) => i.key === key);
  if (existing) {
    existing.qty += qty;
  } else {
    items.push({
      key,
      id: product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      image: product.images?.[0] || "/images/placeholder-saree.jpg",
      color: options.color || product.color || "",
      size: options.size || "",
      qty
    });
  }
  writeLocal(items);
  syncToFirestore(items);
  return items;
}

/** Updates the quantity of a specific cart line (by its composite key). */
export function updateQty(key, qty) {
  let items = readLocal();
  if (qty <= 0) {
    items = items.filter((i) => i.key !== key);
  } else {
    const line = items.find((i) => i.key === key);
    if (line) line.qty = qty;
  }
  writeLocal(items);
  syncToFirestore(items);
  return items;
}

/** Removes a line entirely. */
export function removeFromCart(key) {
  const items = readLocal().filter((i) => i.key !== key);
  writeLocal(items);
  syncToFirestore(items);
  return items;
}

/** Empties the cart (used after a successful order). */
export function clearCart() {
  writeLocal([]);
  syncToFirestore([]);
}

/** Subtotal of all line items (qty * price). */
export function getSubtotal() {
  return readLocal().reduce((sum, i) => sum + i.price * i.qty, 0);
}

/** Full pricing breakdown used on cart + checkout pages. */
export function getCartTotals(couponDiscount = 0) {
  const subtotal = getSubtotal();
  const discounted = Math.max(subtotal - couponDiscount, 0);
  const gst = Math.round(discounted * (BUSINESS_CONFIG.gstPercent / 100));
  const shipping = discounted === 0 || discounted >= BUSINESS_CONFIG.freeShippingThreshold
    ? 0
    : BUSINESS_CONFIG.standardShippingCharge;
  const total = discounted + gst + shipping;
  return { subtotal, couponDiscount, gst, shipping, total };
}

/** Keeps the little cart-count badge in the navbar current on every page. */
export function updateCartBadge() {
  const count = readLocal().reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
