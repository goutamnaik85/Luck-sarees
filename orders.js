/**
 * orders.js
 * Creates and reads order documents in Firestore. Used by checkout.js
 * (create), orders.html (list), account.html (recent orders), and
 * admin/orders.html (all orders + status updates).
 */
import { db } from "./firebase.js";
import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const ORDER_STATUSES = ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"];

/** Creates a new order document. Returns the generated order id. */
export async function createOrder({ uid, items, address, totals, coupon, payment }) {
  const ref = await addDoc(collection(db, COLLECTIONS.orders), {
    uid,
    items,
    address,
    totals,
    coupon: coupon || null,
    payment,
    status: "Confirmed",
    statusHistory: [{ status: "Confirmed", at: new Date().toISOString() }],
    createdAt: serverTimestamp()
  });
  return ref.id;
}

/** Fetches a single order by id. */
export async function fetchOrder(orderId) {
  const snap = await getDoc(doc(db, COLLECTIONS.orders, orderId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Fetches all orders belonging to a given user, most recent first. */
export async function fetchUserOrders(uid) {
  const q = query(collection(db, COLLECTIONS.orders), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Admin: fetches every order in the system, most recent first. */
export async function fetchAllOrders() {
  const q = query(collection(db, COLLECTIONS.orders), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Admin: updates an order's status and appends to its history trail. */
export async function updateOrderStatus(orderId, status) {
  const ref = doc(db, COLLECTIONS.orders, orderId);
  const snap = await getDoc(ref);
  const history = snap.exists() ? (snap.data().statusHistory || []) : [];
  history.push({ status, at: new Date().toISOString() });
  await updateDoc(ref, { status, statusHistory: history });
}

/** Renders a compact order-card element (used on orders.html / account.html). */
export function renderOrderCard(order) {
  const el = document.createElement("div");
  el.className = "order-card";
  const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  el.innerHTML = `
    <div class="flex-between mb-1">
      <div>
        <strong>Order #${order.id.slice(0, 8).toUpperCase()}</strong>
        <div style="font-size:0.82rem;color:var(--ink-soft)">${date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
      </div>
      <span class="status-pill status-${order.status.toLowerCase()}">${order.status}</span>
    </div>
    <div class="flex" style="gap:12px;overflow-x:auto">
      ${order.items.map((i) => `<img src="${i.image}" alt="${i.name}" style="width:56px;height:72px;object-fit:cover;border-radius:6px">`).join("")}
    </div>
    <div class="flex-between mt-1">
      <span style="font-size:0.88rem;color:var(--ink-soft)">${order.items.length} item(s)</span>
      <strong>₹${order.totals.total.toLocaleString("en-IN")}</strong>
    </div>
    <div class="flex" style="gap:10px;margin-top:12px">
      <a href="/orders.html?track=${order.id}" class="btn btn-outline btn-sm">Track Order</a>
      <button class="btn btn-ghost btn-sm" data-invoice="${order.id}">Download Invoice</button>
    </div>`;
  return el;
}
