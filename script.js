/**
 * script.js
 * Site-wide behaviours shared by every page: mobile drawer menu, toast
 * notifications, scroll-reveal animation, FAQ accordions, offline
 * detection, and the initial page loader. Import { showToast } from
 * this module wherever a page needs to surface a notification.
 */

/** Shows a small toast notification in the bottom-right corner. */
export function showToast(message, type = "info", duration = 3200) {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const icon = { success: "✓", error: "✕", info: "ℹ" }[type] || "ℹ";
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.3s ease";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/** IntersectionObserver-driven scroll reveal for elements with .reveal */
export function initScrollReveal() {
  const els = document.querySelectorAll(".reveal:not(.in-view)");
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("in-view"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach((el) => io.observe(el));
}
window.initScrollReveal = initScrollReveal;

function initMobileDrawer() {
  const btn = document.querySelector(".mobile-menu-btn");
  const drawer = document.querySelector(".mobile-drawer");
  const overlay = document.querySelector(".mobile-drawer-overlay");
  if (!btn || !drawer) return;
  const close = () => { drawer.classList.remove("open"); overlay?.classList.remove("open"); };
  btn.addEventListener("click", () => { drawer.classList.add("open"); overlay?.classList.add("open"); });
  overlay?.addEventListener("click", close);
  drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
}

function initFaqAccordion() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    item.querySelector(".faq-q")?.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      item.parentElement.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });
}

function initNewsletterForm() {
  document.querySelectorAll(".newsletter-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = form.querySelector("input[type=email]")?.value;
      if (email) {
        showToast("Thanks for subscribing! Watch your inbox for offers.", "success");
        form.reset();
      }
    });
  });
}

function initOfflineDetection() {
  const banner = () => {
    let el = document.getElementById("offline-banner");
    if (!navigator.onLine) {
      if (!el) {
        el = document.createElement("div");
        el.id = "offline-banner";
        el.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:var(--danger);color:#fff;text-align:center;padding:10px;font-size:0.85rem;z-index:600";
        el.textContent = "You're offline. Some features may not work until you reconnect.";
        document.body.appendChild(el);
      }
    } else if (el) {
      el.remove();
    }
  };
  window.addEventListener("online", banner);
  window.addEventListener("offline", banner);
  banner();
}

function hidePageLoader() {
  const loader = document.querySelector(".page-loader");
  if (loader) setTimeout(() => loader.classList.add("hide"), 200);
}

function initDarkModeToggle() {
  const toggle = document.querySelector("[data-dark-toggle]");
  if (!toggle) return;
  const applied = localStorage.getItem("lc_theme") === "dark";
  document.documentElement.classList.toggle("dark", applied);
  toggle.checked = applied;
  toggle.addEventListener("change", () => {
    document.documentElement.classList.toggle("dark", toggle.checked);
    localStorage.setItem("lc_theme", toggle.checked ? "dark" : "light");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMobileDrawer();
  initFaqAccordion();
  initNewsletterForm();
  initOfflineDetection();
  initScrollReveal();
  initDarkModeToggle();
  hidePageLoader();
});
