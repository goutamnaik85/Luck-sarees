# Lucky Collection — Saree E-commerce Website

A production-ready e-commerce website for **Lucky Collection**, an online saree store based in Bengaluru, Karnataka. Built as a single vanilla HTML/CSS/JS frontend backed by Firebase, with Razorpay for payments. No frameworks, no build step — deploy as-is.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Backend | Firebase (Authentication, Firestore, Storage) |
| Payments | Razorpay Checkout (UPI, Cards, Net Banking, Wallets — **no COD**) |
| Hosting | Vercel (or Firebase Hosting) |
| Version control | GitHub |

## Folder Structure

```
/
├── index.html               Homepage
├── products.html             Product listing with filters
├── product.html               Product detail page
├── cart.html                     Shopping cart
├── wishlist.html               Wishlist
├── checkout.html               Address + payment
├── payment-success.html
├── payment-failed.html
├── orders.html                  Order history + tracking
├── account.html                Customer profile
├── login.html / register.html / forgot-password.html
├── about.html / contact.html
├── privacy.html / terms.html / refund-policy.html / shipping-policy.html
├── 404.html
├── robots.txt / sitemap.xml
├── package.json / vercel.json / .gitignore
│
├── css/
│   ├── styles.css            Design tokens, layout, components
│   ├── responsive.css     Breakpoints (1180 / 1024 / 768 / 480)
│   └── animations.css     Motion, reveal-on-scroll, toasts
│
├── js/
│   ├── config.js               Firebase/Razorpay keys, business constants
│   ├── firebase.js             Firebase SDK initialization
│   ├── auth.js                    Login, register, Google sign-in, password reset
│   ├── products.js             Fetch/render products
│   ├── cart.js                    Cart state (localStorage + Firestore sync)
│   ├── wishlist.js             Wishlist state (localStorage + Firestore sync)
│   ├── checkout.js             Address validation, coupon, order summary
│   ├── payment.js              Razorpay Checkout wrapper
│   ├── orders.js                 Order creation, fetching, status
│   ├── search.js                Instant search
│   ├── admin.js                  Admin CRUD, analytics, CSV export
│   └── script.js                 Shared UI: nav drawer, toasts, FAQ, scroll reveal
│
├── admin/
│   ├── login.html
│   ├── dashboard.html      Analytics overview
│   ├── products.html        Product CRUD
│   ├── orders.html            Order status management
│   ├── customers.html      Customer list
│   └── coupons.html          Coupon management
│
├── firebase/
│   ├── firestore.rules
│   └── firestore.indexes.json
│
├── images/, icons/, assets/
```

## Design Language

Deep wine maroon (`#6B1E3C`) and zari gold (`#C9A227`), drawn from Kanjivaram silk borders, on an ivory ground with a peacock-teal accent. The signature element is a **zari border motif** (a repeating woven-gold SVG pattern) used as a section divider throughout the site — a nod to the woven gold border on the edge of every saree. Typography pairs Fraunces (display) with Work Sans (body).

## Getting Started

### 1. Create a Firebase project
1. Go to the [Firebase Console](https://console.firebase.google.com) → Create Project.
2. Enable **Authentication** → Email/Password + Google providers.
3. Enable **Firestore Database** (production mode).
4. Enable **Storage** for product images.
5. Copy your web app config into `js/config.js` (`FIREBASE_CONFIG`).

### 2. Deploy Firestore rules & indexes
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # point it at firebase/firestore.rules and firestore.indexes.json
firebase deploy --only firestore:rules,firestore:indexes
```

### 3. Create your first admin user
Firestore rules check `users/{uid}.role == "admin"`. After registering a normal account through `/register.html`, manually edit that user's document in the Firebase Console and set `role: "admin"`. Then log in at `/admin/login.html`.

### 4. Set up Razorpay
1. Create an account at [razorpay.com](https://razorpay.com).
2. Copy your **Key ID** (test mode: `rzp_test_...`) into `js/config.js` (`RAZORPAY_CONFIG.key`).
3. **Never** put your Key Secret in frontend code.

### Payment Gateway — production note
This client calls Razorpay Checkout directly with just the public Key ID, which works for testing. For production you should add **two small server-side functions** (Firebase Cloud Functions are a natural fit):

1. `createRazorpayOrder` — creates an `order_id` server-side using your Key Secret, so payments are tied to a verified amount.
2. `verifyRazorpaySignature` — verifies the `razorpay_signature` returned by Checkout before you trust a payment as genuine.

Wire the returned `razorpayOrderId` into `openRazorpayCheckout()` in `js/payment.js`.

### 5. Seed sample products (optional)
Until you add real products via `/admin/products.html`, the storefront automatically falls back to a small demo catalogue defined in `js/products.js` (`DEMO_PRODUCTS`) so every page is browsable out of the box.

### 6. Run locally
```bash
npm run dev
# serves the project at http://localhost:3000
```
Because this project uses native ES Modules (`type="module"`), it must be served over HTTP — opening `index.html` directly via `file://` will not work.

### 7. Deploy to Vercel
```bash
npm install -g vercel
vercel --prod
```
`vercel.json` is already configured with clean URLs and cache headers.

## Firestore Collections

| Collection | Purpose |
|---|---|
| `users` | Customer + admin profiles (`role: "customer" \| "admin"`) |
| `users/{uid}/meta/cart`, `users/{uid}/meta/wishlist` | Per-user cart/wishlist sync |
| `products` | Product catalogue |
| `categories` | Category metadata |
| `orders` | Orders with items, address, totals, payment, status history |
| `reviews` | Product reviews |
| `coupons` | Discount codes |
| `banners` | Homepage/promo banners |
| `settings` | Site-wide settings (SEO, store info) |
| `notifications` | User/admin notifications |

## Payment Policy

Lucky Collection **does not offer Cash on Delivery**. All orders are paid online via Razorpay (UPI, credit/debit card, net banking, wallets) before an order is confirmed. This is enforced both in the UI (`checkout.html`) and in `BUSINESS_CONFIG.codEnabled = false` in `js/config.js`.

## Security Notes

- `firebase/firestore.rules` enforces that only admins can write products, categories, coupons, and banners, and only admins can change order status.
- Customers can only read/write their own user document, cart, wishlist, and orders.
- All user input in forms is validated client-side (phone, PIN code, email) before submission; Firestore rules provide the server-side backstop.
- Razorpay Checkout handles all card/UPI data — no payment credentials ever touch Lucky Collection's own servers or database.

## Browser Support

Modern evergreen browsers (Chrome, Safari, Firefox, Edge) on desktop and mobile. Uses native ES Modules, `IntersectionObserver`, and CSS Grid.

---
Built for Lucky Collection, Bengaluru, Karnataka.
