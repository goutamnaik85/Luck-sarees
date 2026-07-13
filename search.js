/**
 * search.js
 * Lightweight instant search. Firestore doesn't do full-text search
 * natively, so for a catalogue of this size we fetch active products
 * once, cache them, and filter client-side as the user types. (For a
 * much larger catalogue, swap this for Algolia or Typesense.)
 */
import { fetchProducts, renderProductCard, formatPrice } from "./products.js";

let cache = null;
let debounceTimer = null;

async function getCache() {
  if (!cache) cache = await fetchProducts({ limit: 200 });
  return cache;
}

function matches(product, term) {
  const haystack = `${product.name} ${product.category} ${product.fabric} ${product.color} ${product.occasion}`.toLowerCase();
  return haystack.includes(term);
}

/** Wires up a search input + results dropdown by element id. */
export function initInstantSearch(inputId, dropdownId) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const term = input.value.trim().toLowerCase();
    if (term.length < 2) { dropdown.classList.remove("open"); dropdown.innerHTML = ""; return; }
    debounceTimer = setTimeout(async () => {
      const products = await getCache();
      const results = products.filter((p) => matches(p, term)).slice(0, 6);
      renderDropdown(dropdown, results, term);
    }, 220);
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== input) dropdown.classList.remove("open");
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      window.location.href = `/products.html?q=${encodeURIComponent(input.value.trim())}`;
    }
  });
}

function renderDropdown(dropdown, results, term) {
  if (!results.length) {
    dropdown.innerHTML = `<div style="padding:16px;color:var(--ink-soft);font-size:0.88rem">No results for "${term}"</div>`;
  } else {
    dropdown.innerHTML = results.map((p) => `
      <a href="/product.html?id=${p.id}" class="search-result-row" style="display:flex;gap:12px;padding:10px 14px;align-items:center">
        <img src="${p.images?.[0] || '/images/placeholder-saree.jpg'}" style="width:40px;height:52px;object-fit:cover;border-radius:4px">
        <div>
          <div style="font-size:0.9rem;font-weight:500">${p.name}</div>
          <div style="font-size:0.8rem;color:var(--maroon)">${formatPrice(p.price)}</div>
        </div>
      </a>`).join("") +
      `<a href="/products.html?q=${encodeURIComponent(term)}" style="display:block;padding:12px 14px;text-align:center;font-size:0.85rem;font-weight:600;color:var(--maroon);border-top:1px solid var(--line)">View all results</a>`;
  }
  dropdown.classList.add("open");
}

/** Applies a search term (from ?q=) against a full products.html grid. */
export function filterProductsBySearch(products, term) {
  if (!term) return products;
  return products.filter((p) => matches(p, term.toLowerCase()));
}
