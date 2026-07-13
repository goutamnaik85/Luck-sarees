/**
 * config.js
 * Central configuration for Lucky Collection.
 * Replace the placeholder values below with your real Firebase project
 * and Razorpay credentials before going live.
 */

// ---------- Firebase Configuration ----------
// Get these values from Firebase Console > Project Settings > General > Your apps
const FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ---------- Razorpay Configuration ----------
// Use your test key while developing (starts with rzp_test_), swap to
// rzp_live_ when you go to production. NEVER put your key SECRET here —
// the secret stays server-side only.
const RAZORPAY_CONFIG = {
  key: "rzp_test_YOUR_KEY_ID",
  currency: "INR",
  companyName: "Lucky Collection",
  companyLogo: "/images/logo.png",
  themeColor: "#6B1E3C"
};

// ---------- Business Constants ----------
const BUSINESS_CONFIG = {
  brandName: "Lucky Collection",
  gstPercent: 5, // GST applicable on sarees (5%)
  freeShippingThreshold: 1999, // Orders above this amount ship free
  standardShippingCharge: 79,
  currencySymbol: "₹",
  supportEmail: "support@luckycollection.in",
  supportPhone: "+91 98765 43210",
  whatsappNumber: "919876543210",
  codEnabled: false, // Cash on Delivery is intentionally disabled
  address: {
    line1: "Lucky Collection, Chickpet Main Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560053",
    country: "India"
  }
};

// ---------- Firestore Collection Names ----------
// Centralised so a rename only ever happens in one place.
const COLLECTIONS = {
  users: "users",
  products: "products",
  categories: "categories",
  orders: "orders",
  reviews: "reviews",
  wishlist: "wishlist",
  cart: "cart",
  coupons: "coupons",
  banners: "banners",
  settings: "settings",
  notifications: "notifications"
};

// Freeze so nothing accidentally mutates shared config at runtime
Object.freeze(FIREBASE_CONFIG);
Object.freeze(RAZORPAY_CONFIG);
Object.freeze(BUSINESS_CONFIG);
Object.freeze(COLLECTIONS);
