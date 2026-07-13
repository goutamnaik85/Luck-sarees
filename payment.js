/**
 * payment.js
 * Wraps the Razorpay Checkout widget. No Cash on Delivery — Lucky
 * Collection accepts UPI, cards, net banking, and wallets only, all
 * routed through Razorpay Checkout.
 *
 * IMPORTANT: order creation + signature verification must happen on a
 * trusted server (Firebase Cloud Function or your own backend) in
 * production. The client only ever handles the public Razorpay
 * key — never the key secret. See README.md "Payment Gateway" section
 * for the two Cloud Functions you need to deploy:
 *   1. createRazorpayOrder  (creates an order_id server-side)
 *   2. verifyRazorpaySignature (verifies payment authenticity)
 */

/** Dynamically loads the Razorpay checkout.js script once. */
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Razorpay SDK failed to load. Check your connection."));
    document.body.appendChild(script);
  });
}

/**
 * Opens the Razorpay Checkout modal.
 * @param {Object} opts
 * @param {number} opts.amount - Amount in rupees (converted to paise here).
 * @param {string} opts.orderId - Your internal order id (used as receipt).
 * @param {string} [opts.razorpayOrderId] - Server-generated Razorpay order_id (recommended).
 * @param {Object} opts.customer - { name, email, phone }
 * @param {Function} opts.onSuccess - Called with the Razorpay response on success.
 * @param {Function} opts.onFailure - Called with an error/reason on failure or dismissal.
 */
export async function openRazorpayCheckout(opts) {
  await loadRazorpayScript();

  const options = {
    key: RAZORPAY_CONFIG.key,
    amount: Math.round(opts.amount * 100), // paise
    currency: RAZORPAY_CONFIG.currency,
    name: RAZORPAY_CONFIG.companyName,
    image: RAZORPAY_CONFIG.companyLogo,
    description: `Order #${opts.orderId}`,
    order_id: opts.razorpayOrderId || undefined,
    prefill: {
      name: opts.customer?.name || "",
      email: opts.customer?.email || "",
      contact: opts.customer?.phone || ""
    },
    notes: { internalOrderId: opts.orderId },
    theme: { color: RAZORPAY_CONFIG.themeColor },
    // Only these methods are enabled — Cash on Delivery is not a Razorpay
    // method at all, so it's excluded by construction.
    method: { upi: true, card: true, netbanking: true, wallet: true, paylater: true },
    handler: function (response) {
      opts.onSuccess?.(response);
    },
    modal: {
      ondismiss: function () {
        opts.onFailure?.(new Error("Payment cancelled by user."));
      }
    }
  };

  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", function (response) {
    opts.onFailure?.(new Error(response.error?.description || "Payment failed."));
  });
  rzp.open();
}
