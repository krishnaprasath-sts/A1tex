# A1 TEX – Next.js Website

## Quick Start (Setup Instructions)

```bash
# 1. Project folder
cd A1tex/frontend

# 2. Dependencies install
npm install

# 3. Development server start
npm run dev

# 4. Open in browser
# http://localhost:3000
```

## Production Build

```bash
npm run build
npm start
```

---

## Project Structure

```
A1tex/frontend/
├── app/
│   ├── layout.tsx          ← Root layout (fonts, metadata)
│   ├── page.tsx            ← Homepage (all sections)
│   └── globals.css         ← Global styles + CSS variables
│
├── components/
│   ├── layout/
│   │   ├── AnnouncementBar.tsx  ← Scrolling top banner
│   │   ├── Header.tsx           ← Logo + Search + Nav + Actions
│   │   └── Footer.tsx           ← Footer links
│   │
│   ├── home/
│   │   ├── HeroSection.tsx      ← Main hero banner
│   │   └── HomeComponents.tsx   ← FeaturesStrip, SubcatBar,
│   │                              CategoryGrid, ProductGrid,
│   │                              OffersStrip, LoyaltyBanner
│   │
│   └── ui/
│       ├── SearchBar.tsx         ← Item code / name search
│       ├── LoginDropdown.tsx     ← OTP + Email login (inline)
│       └── CouponPopup.tsx       ← First-visit 15% offer popup
│
└── lib/
    └── data.ts             ← All categories, products, nav data
```

---

## Features Implemented (from Requirements)

| # | Requirement | Status |
|---|---|---|
| 1 | Scrolling announcement banner | ✅ |
| 2 | OTP + Email login (inline, no new page) | ✅ |
| 3 | Guest checkout flow | ✅ |
| 4 | First customer coupon popup (SAS15OFF) | ✅ |
| 5 | Logo with brand identity | ✅ |
| 6 | Item code search with dropdown | ✅ |
| 7 | Login inline on homepage (no redirect) | ✅ |
| 8 | All categories visible in nav | ✅ |
| 9 | Subcategories for Organic Sarees | ✅ |
| 10 | Loyalty / rewards program section | ✅ |
| 11 | Track Order icon in header | ✅ |
| 12 | Wishlist functionality | ✅ |
| 13 | New Arrivals product grid | ✅ |
| 14 | Birthday month offer | ✅ |

## Next Steps (Backend / Phase 2)

- [ ] Connect to Shopify / WooCommerce / custom backend
- [ ] OTP via Twilio / Firebase Auth
- [ ] Product detail page with pincode shipping estimate
- [ ] Courier partner API integration (Shiprocket / Delhivery)
- [ ] Payment gateway (Razorpay)
- [ ] Product filter + sort page
- [ ] Admin panel for order management
- [ ] AR try-on (Phase 3 future scope)
