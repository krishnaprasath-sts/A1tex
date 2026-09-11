# A1 Tex - E-Commerce Platform

A comprehensive e-commerce platform for silk sarees and textile collections, featuring a modern Next.js storefront, a robust Node.js/Express backend with MySQL/Sequelize, and a dedicated React/Vite admin dashboard.

---

## 🏗 Project Architecture

```
├── frontend/          # Next.js Storefront (React, Tailwind CSS, TypeScript)
├── backend/
│   ├── node/          # Node.js API Service (Express, Sequelize, TypeScript, MySQL)
│   └── panel/         # Admin Management Panel (Vite, React, Tailwind CSS, TypeScript)
└── .gitignore         # Repository ignore rules
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v20 recommended)
- [MySQL](https://www.mysql.com/) database server
- `npm` or `yarn` / `pnpm`

---

### 1. Backend API (`backend/node`)

```bash
cd backend/node
npm install
cp .env.example .env
# Configure your MySQL and Razorpay credentials in .env
npm run dev
```

The API service runs on `http://localhost:5000`.

### 2. Admin Panel (`backend/panel`)

```bash
cd backend/panel
npm install
cp .env.example .env
# Configure VITE_API_BASE_URL (defaults to http://localhost:5000/api)
npm run dev
```

The Admin Panel runs on `http://localhost:5173`.

### 3. Storefront (`frontend`)

```bash
cd frontend
npm install
cp .env.example .env
# Configure NEXT_PUBLIC_API_BASE_URL and Razorpay key
npm run dev
```

The Storefront runs on `http://localhost:3000`.

---

## 🛡 Security & Environment

All sensitive keys, passwords, and tokens are stored in `.env` files which are excluded from version control. Always copy the respective `.env.example` templates to `.env` when deploying or configuring new environments.

---

## 📄 License

Proprietary / All rights reserved.
