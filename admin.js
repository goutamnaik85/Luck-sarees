/**
 * admin.js
 * Powers the /admin dashboard: product CRUD, order management, basic
 * sales analytics, and CSV export. Every function here assumes the
 * caller has already verified (via requireAdmin) that the signed-in
 * user has role === "admin" in Firestore — actual enforcement of who
 * can write happens in firebase/firestore.rules.
 */
import { auth, db, storage } from "./firebase.js";
import { onAuthStateChanged, getUserProfile } from "./auth.js";
import {
  collection, addDoc, doc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { fetchAllOrders, updateOrderStatus, ORDER_STATUSES } from "./orders.js";
import { showToast } from "./script.js";

/** Gates any /admin page: redirects non-admins to /login.html. */
export function requireAdmin(onReady) {
  onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = "/login.html?redirect=" + encodeURIComponent(location.pathname); return; }
    const profile = await getUserProfile(user.uid);
    if (!profile || profile.role !== "admin") {
      showToast("Admin access required.", "error");
      window.location.href = "/index.html";
      return;
    }
    onReady(user, profile);
  });
}

/* ---------------------------- Products CRUD ---------------------------- */

export async function adminFetchProducts() {
  const snap = await getDocs(query(collection(db, COLLECTIONS.products), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function adminUploadProductImage(file, sku) {
  const path = `products/${sku}-${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function adminCreateProduct(data) {
  const ref = await addDoc(collection(db, COLLECTIONS.products), {
    ...data,
    active: data.active ?? true,
    createdAt: serverTimestamp(),
    avgRating: 0,
    reviewCount: 0
  });
  return ref.id;
}

export async function adminUpdateProduct(id, data) {
  await updateDoc(doc(db, COLLECTIONS.products, id), data);
}

export async function adminDeleteProduct(id) {
  await deleteDoc(doc(db, COLLECTIONS.products, id));
}

/* ---------------------------- Categories -------------------------------- */

export async function adminFetchCategories() {
  const snap = await getDocs(collection(db, COLLECTIONS.categories));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function adminCreateCategory(data) {
  return (await addDoc(collection(db, COLLECTIONS.categories), data)).id;
}
export async function adminDeleteCategory(id) {
  await deleteDoc(doc(db, COLLECTIONS.categories, id));
}

/* ---------------------------- Orders ------------------------------------- */

export { fetchAllOrders as adminFetchOrders, updateOrderStatus as adminUpdateOrderStatus, ORDER_STATUSES };

/* ---------------------------- Coupons ------------------------------------ */

export async function adminFetchCoupons() {
  const snap = await getDocs(collection(db, COLLECTIONS.coupons));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function adminCreateCoupon(data) {
  return (await addDoc(collection(db, COLLECTIONS.coupons), { ...data, active: true })).id;
}
export async function adminDeleteCoupon(id) {
  await deleteDoc(doc(db, COLLECTIONS.coupons, id));
}

/* ---------------------------- Customers ----------------------------------- */

export async function adminFetchCustomers() {
  const snap = await getDocs(query(collection(db, COLLECTIONS.users), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => u.role !== "admin");
}

/* ---------------------------- Analytics ----------------------------------- */

/** Aggregates simple dashboard stats from the orders collection. */
export async function computeDashboardAnalytics() {
  const orders = await fetchAllOrders();
  const revenue = orders.filter((o) => o.payment?.status === "paid").reduce((s, o) => s + (o.totals?.total || 0), 0);
  const totalOrders = orders.length;
  const pending = orders.filter((o) => o.status === "Pending" || o.status === "Confirmed").length;

  // Revenue grouped by day for the last 14 days
  const byDay = {};
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    byDay[d.toISOString().slice(0, 10)] = 0;
  }
  orders.forEach((o) => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : null;
    if (!d) return;
    const key = d.toISOString().slice(0, 10);
    if (key in byDay) byDay[key] += o.totals?.total || 0;
  });

  return {
    revenue, totalOrders, pending,
    avgOrderValue: totalOrders ? Math.round(revenue / totalOrders) : 0,
    revenueByDay: byDay,
    recentOrders: orders.slice(0, 8)
  };
}

/* ---------------------------- CSV export ----------------------------------- */

/** Exports an array of order objects as a downloadable CSV file. */
export function exportOrdersCSV(orders) {
  const headers = ["Order ID", "Customer", "Phone", "Items", "Total", "Status", "Date"];
  const rows = orders.map((o) => [
    o.id,
    o.address?.fullName || "",
    o.address?.phone || "",
    o.items?.length || 0,
    o.totals?.total || 0,
    o.status,
    o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString("en-IN") : ""
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `lucky-collection-orders-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
