/**
 * products.js
 * Fetches products from Firestore and renders product cards across the
 * site (homepage rails, listing grid, related products, search results).
 */
import { db } from "./firebase.js";
import {
  collection, getDocs, doc, getDoc, query, where, orderBy, limit as fbLimit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toggleWishlist, isInWishlist } from "./wishlist.js";
import { addToCart } from "./cart.js";
import { showToast } from "./script.js";

/** Formats a number as Indian Rupees, e.g. 2499 -> "₹2,499". */
export function formatPrice(amount) {
  return BUSINESS_CONFIG.currencySymbol + Number(amount).toLocaleString("en-IN");
}

/** Computes a whole-number discount percentage from MRP and selling price. */
export function discountPercent(mrp, price) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/**
 * Fetches products with optional filters. Falls back to demo data (below)
 * if Firestore has not yet been seeded, so the site is always browsable.
 */
export async function fetchProducts({
  categoryId, fabric, tag, sortBy, minPrice, maxPrice, limit: max = 60
} = {}) {
  try {
    const col = collection(db, COLLECTIONS.products);
    const clauses = [where("active", "==", true)];
    if (categoryId) clauses.push(where("category", "==", categoryId));
    if (fabric) clauses.push(where("fabric", "==", fabric));
    if (tag) clauses.push(where(tag, "==", true)); // e.g. "featured", "trending", "bestSeller"

    let sortClause = orderBy("createdAt", "desc");
    if (sortBy === "priceLow") sortClause = orderBy("price", "asc");
    if (sortBy === "priceHigh") sortClause = orderBy("price", "desc");
    if (sortBy === "rating") sortClause = orderBy("avgRating", "desc");

    const q = query(col, ...clauses, sortClause, fbLimit(max));
    const snap = await getDocs(q);
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (minPrice != null) items = items.filter((p) => p.price >= minPrice);
    if (maxPrice != null) items = items.filter((p) => p.price <= maxPrice);
    return items.length ? items : DEMO_PRODUCTS;
  } catch (err) {
    console.warn("Falling back to demo products:", err.message);
    return DEMO_PRODUCTS;
  }
}

/** Fetches a single product by its Firestore document id. */
export async function fetchProductById(id) {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.products, id));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.warn(err.message);
  }
  return DEMO_PRODUCTS.find((p) => p.id === id) || DEMO_PRODUCTS[0];
}

/** Builds the DOM for one product card. */
export function renderProductCard(p) {
  const disc = discountPercent(p.mrp, p.price);
  const wrap = document.createElement("div");
  wrap.className = "product-card reveal";
  wrap.innerHTML = `
    <a href="/product.html?id=${p.id}" class="thumb-wrap">
      <img src="${p.images?.[0] || '/images/placeholder-saree.jpg'}" alt="${p.name}" loading="lazy">
      <div class="badge-row">
        ${p.trending ? '<span class="tag tag-new">Trending</span>' : ""}
        ${disc > 0 ? `<span class="tag tag-sale">${disc}% OFF</span>` : ""}
        ${p.stock === 0 ? '<span class="tag tag-out">Out of Stock</span>' : ""}
      </div>
    </a>
    <div class="quick-actions">
      <button class="wishlist-btn ${isInWishlist(p.id) ? "active" : ""}" data-id="${p.id}" title="Add to wishlist" aria-label="Add to wishlist">♥</button>
    </div>
    <div class="info">
      <span class="cat">${p.fabric || p.category || ""}</span>
      <a href="/product.html?id=${p.id}"><h4>${p.name}</h4></a>
      <div class="rating-row"><span class="stars">${"★".repeat(Math.round(p.avgRating || 4))}${"☆".repeat(5 - Math.round(p.avgRating || 4))}</span><span>(${p.reviewCount || 0})</span></div>
      <div class="price-row">
        <span class="price">${formatPrice(p.price)}</span>
        ${p.mrp && p.mrp > p.price ? `<span class="mrp">${formatPrice(p.mrp)}</span><span class="discount">${disc}% off</span>` : ""}
      </div>
      <button class="btn btn-primary add-cart-btn" data-id="${p.id}" ${p.stock === 0 ? "disabled" : ""}>
        ${p.stock === 0 ? "Out of Stock" : "Add to Cart"}
      </button>
    </div>`;

  wrap.querySelector(".wishlist-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    const active = await toggleWishlist(p);
    btn.classList.toggle("active", active);
    btn.classList.add("heart-pop");
    setTimeout(() => btn.classList.remove("heart-pop"), 350);
  });

  const addBtn = wrap.querySelector(".add-cart-btn");
  if (addBtn && p.stock !== 0) {
    addBtn.addEventListener("click", (e) => {
      e.preventDefault();
      addToCart(p, 1);
      addBtn.classList.add("pulse-once");
      showToast(`${p.name} added to cart`, "success");
      setTimeout(() => addBtn.classList.remove("pulse-once"), 600);
    });
  }
  return wrap;
}

/** Renders an array of products into a container element by id. */
export async function renderProductGrid(containerId, filters = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array(4).fill('<div class="product-card"><div class="thumb-wrap skeleton"></div></div>').join("");
  const products = await fetchProducts(filters);
  el.innerHTML = "";
  if (!products.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><h3>No products found</h3><p>Try adjusting your filters.</p></div>`;
    return;
  }
  products.forEach((p) => el.appendChild(renderProductCard(p)));
  if (window.initScrollReveal) window.initScrollReveal();
}

/**
 * Demo catalogue used until Firestore is seeded — lets the storefront be
 * fully browsable, and useful as a reference for the products schema.
 */
export const DEMO_PRODUCTS = [
  { id: "demo-1", name: "Kanjivaram Silk Saree - Wine & Gold", category: "silk", fabric: "Kanjivaram Silk", price: 8999, mrp: 12999, stock: 6, images: ["/images/placeholder-saree.jpg"], avgRating: 4.6, reviewCount: 128, featured: true, trending: true, bestSeller: true, occasion: "Wedding", color: "Maroon", weight: "800g" },
  { id: "demo-2", name: "Banarasi Silk Saree - Emerald Zari", category: "silk", fabric: "Banarasi Silk", price: 6499, mrp: 8999, stock: 10, images: ["/images/placeholder-saree.jpg"], avgRating: 4.8, reviewCount: 94, featured: true, trending: false, bestSeller: true, occasion: "Festival", color: "Green", weight: "700g" },
  { id: "demo-3", name: "Handloom Cotton Saree - Indigo Ikat", category: "cotton", fabric: "Cotton", price: 1899, mrp: 2499, stock: 20, images: ["/images/placeholder-saree.jpg"], avgRating: 4.4, reviewCount: 61, featured: false, trending: true, bestSeller: false, occasion: "Casual", color: "Blue", weight: "400g" },
  { id: "demo-4", name: "Designer Georgette Saree - Blush Floral", category: "designer", fabric: "Georgette", price: 3299, mrp: 4599, stock: 14, images: ["/images/placeholder-saree.jpg"], avgRating: 4.5, reviewCount: 47, featured: true, trending: true, bestSeller: false, occasion: "Party", color: "Pink", weight: "500g" },
  { id: "demo-5", name: "Mysore Silk Saree - Peacock Teal", category: "silk", fabric: "Mysore Silk", price: 5499, mrp: 6999, stock: 8, images: ["/images/placeholder-saree.jpg"], avgRating: 4.7, reviewCount: 73, featured: false, trending: false, bestSeller: true, occasion: "Festival", color: "Teal", weight: "600g" },
  { id: "demo-6", name: "Chanderi Cotton Saree - Ivory Gold Border", category: "cotton", fabric: "Chanderi", price: 2199, mrp: 2999, stock: 0, images: ["/images/placeholder-saree.jpg"], avgRating: 4.3, reviewCount: 38, featured: false, trending: false, bestSeller: false, occasion: "Office", color: "Ivory", weight: "350g" },
  { id: "demo-7", name: "Bridal Kanjivaram - Deep Red Temple Border", category: "silk", fabric: "Kanjivaram Silk", price: 15999, mrp: 21999, stock: 3, images: ["/images/placeholder-saree.jpg"], avgRating: 4.9, reviewCount: 152, featured: true, trending: true, bestSeller: true, occasion: "Wedding", color: "Red", weight: "900g" },
  { id: "demo-8", name: "Designer Organza Saree - Lavender Sequins", category: "designer", fabric: "Organza", price: 4199, mrp: 5799, stock: 11, images: ["/images/placeholder-saree.jpg"], avgRating: 4.4, reviewCount: 29, featured: false, trending: true, bestSeller: false, occasion: "Party", color: "Purple", weight: "450g" }
];
