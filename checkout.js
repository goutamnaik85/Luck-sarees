/**
 * checkout.js
 * Drives checkout.html: collects the shipping address, applies coupons,
 * shows the live order summary, and hands off to payment.js + orders.js
 * once the customer clicks Pay.
 */
import { db, auth } from "./firebase.js";
import { collection, doc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getCart, getCartTotals, clearCart } from "./cart.js";
import { formatPrice } from "./products.js";
import { openRazorpayCheckout } from "./payment.js";
import { createOrder } from "./orders.js";
import { showToast } from "./script.js";

let appliedCoupon = null;

/** Validates a coupon code against Firestore and returns its discount. */
export async function applyCoupon(code) {
  const q = query(collection(db, COLLECTIONS.coupons), where("code", "==", code.toUpperCase().trim()), where("active", "==", true));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Invalid or expired coupon code.");
  const coupon = snap.docs[0].data();
  const subtotal = getCartTotals().subtotal;
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    throw new Error(`Minimum order of ${formatPrice(coupon.minOrderValue)} required for this coupon.`);
  }
  const discount = coupon.type === "percent"
    ? Math.round(subtotal * (coupon.value / 100))
    : coupon.value;
  appliedCoupon = { code: coupon.code, discount };
  return appliedCoupon;
}

export function clearCoupon() { appliedCoupon = null; }

/** Renders the live totals block on checkout.html. */
export function renderCheckoutSummary(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const totals = getCartTotals(appliedCoupon?.discount || 0);
  el.innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>${formatPrice(totals.subtotal)}</span></div>
    ${appliedCoupon ? `<div class="summary-row"><span>Coupon (${appliedCoupon.code})</span><span>-${formatPrice(appliedCoupon.discount)}</span></div>` : ""}
    <div class="summary-row"><span>GST (${BUSINESS_CONFIG.gstPercent}%)</span><span>${formatPrice(totals.gst)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${totals.shipping === 0 ? "FREE" : formatPrice(totals.shipping)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${formatPrice(totals.total)}</span></div>`;
}

/**
 * Runs the full checkout: validates the address form, opens Razorpay,
 * and on success creates the Firestore order + redirects to the
 * confirmation page. On failure, redirects to payment-failed.html.
 */
export async function submitCheckout(addressForm) {
  const cart = getCart();
  if (!cart.length) { showToast("Your cart is empty.", "error"); return; }

  const user = auth.currentUser;
  if (!user) {
    window.location.href = "/login.html?redirect=/checkout.html";
    return;
  }

  const address = {
    fullName: addressForm.fullName.value.trim(),
    phone: addressForm.phone.value.trim(),
    email: addressForm.email.value.trim(),
    line1: addressForm.line1.value.trim(),
    city: addressForm.city.value.trim(),
    state: addressForm.state.value,
    pincode: addressForm.pincode.value.trim()
  };

  for (const [key, val] of Object.entries(address)) {
    if (!val) { showToast("Please fill in all address fields.", "error"); return; }
  }
  if (!/^\d{6}$/.test(address.pincode)) { showToast("Enter a valid 6-digit PIN code.", "error"); return; }
  if (!/^\d{10}$/.test(address.phone)) { showToast("Enter a valid 10-digit phone number.", "error"); return; }

  const totals = getCartTotals(appliedCoupon?.discount || 0);

  try {
    await openRazorpayCheckout({
      amount: totals.total,
      orderId: "LC" + Date.now(),
      customer: { name: address.fullName, email: address.email, phone: address.phone },
      onSuccess: async (rzpResponse) => {
        try {
          const orderId = await createOrder({
            uid: user.uid,
            items: cart,
            address,
            totals,
            coupon: appliedCoupon,
            payment: {
              method: "razorpay",
              paymentId: rzpResponse.razorpay_payment_id,
              status: "paid"
            }
          });
          clearCart();
          window.location.href = `/payment-success.html?orderId=${orderId}`;
        } catch (err) {
          console.error(err);
          window.location.href = "/payment-failed.html?reason=" + encodeURIComponent("Order could not be saved. Contact support with your payment ID: " + rzpResponse.razorpay_payment_id);
        }
      },
      onFailure: (err) => {
        window.location.href = "/payment-failed.html?reason=" + encodeURIComponent(err.message);
      }
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}
