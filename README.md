# StockPulse: B2B Inventory & Order Fulfillment Platform

A full-stack transactional inventory and order management platform built with **Node.js, NestJS, Prisma ORM, PostgreSQL 16, React, TypeScript, TanStack Query, and Tailwind CSS**.

StockPulse is engineered around production workplace standards: **atomic multi-item stock deductions (`prisma.$transaction`)**, **historical unit-price snapshotting**, **strict DTO payload validation**, **isolated development vs. in-memory test database containers**, and **declarative server-state cache invalidation**.

---

## Tech Stack & Architecture Overview

| Layer | Technology | Engineering Role |
| :--- | :--- | :--- |
| **Backend Framework** | **NestJS (Node.js + TypeScript)** | Modular Dependency Injection (DI) architecture (`ProductsModule`, `OrdersModule`, `CustomersModule`, `PrismaModule`) with global `ValidationPipe`. |
| **Database & ORM** | **PostgreSQL 16 + Prisma 7 (`@prisma/adapter-pg`)** | Declarative relational schema, versioned SQL migrations, interactive ACID transactions, and idempotent `.upsert()` seeding. |
| **Frontend UI & State** | **React 19 + TypeScript + Vite + Tailwind CSS** | Responsive fulfillment console with **TanStack Query (React Query)** managing server caches and automatic mutation invalidation. |
| **Testing & CI/CD** | **Jest + Supertest + Docker Compose + GitHub Actions** | Isolated E2E test suite running against a dedicated RAM-backed `tmpfs` PostgreSQL container (`port 5433`) and automated in CI. |

---

## Repository Structure

```text
stockpulse-fulfillment/
├── .github/
│   └── workflows/
│       └── ci.yml                           # Automated Prisma migrate, NestJS E2E & Vite build CI pipeline
├── docker-compose.yml                       # Dual PostgreSQL 16 containers (db-dev:5432, db-test:5433)
├── docs/                                    # Architectural guides & verification playbooks (Phases 1–4)
├── backend/                                 # NestJS + Prisma API Server (Port 3000)
│   ├── prisma/
│   │   ├── schema.prisma                    # Relational data model, enums, foreign keys & indexes
│   │   ├── migrations/                      # Versioned SQL migration history
│   │   └── seed.ts                          # Idempotent TypeScript database seed using .upsert()
│   ├── src/
│   │   ├── prisma/                          # @Global() PrismaModule & lifecycle-managed PrismaService
│   │   ├── modules/
│   │   │   ├── customers/                   # B2B customer account directory (/api/customers)
│   │   │   ├── products/                    # Warehouse SKU catalog, low-stock flags & restock API
│   │   │   └── orders/                      # Atomic $transaction fulfillment engine & KPI summary
│   │   ├── app.module.ts
│   │   └── main.ts                          # CORS & strict global ValidationPipe bootstrap
│   └── test/
│       ├── helpers/
│       │   └── seed-factory.ts              # Centralized test factory (decoupled from dev seed)
│       └── orders.e2e-spec.ts               # Supertest E2E suite verifying atomic rollbacks & KPIs
└── frontend/                                # React + TypeScript + TanStack Query Console (Port 5173)
    └── src/
        ├── api/
        │   └── fulfillmentClient.ts         # Typed HTTP client & NestJS error normalizer
        ├── components/
        │   ├── KpiHeader.tsx                # Real-time revenue, order count & low-stock alert cards
        │   ├── OrderFormModal.tsx           # Multi-line order dispatcher with rollback diagnostics
        │   └── InventoryTable.tsx           # Live warehouse SKU table with quick restock actions
        ├── pages/
        │   └── DashboardPage.tsx            # TanStack Query orchestration & cache invalidation
        └── main.tsx
```

---

## Relational Database Schema

| Table (`@@map`) | Primary Key | Key Columns & Constraints | Relational Behavior |
| :--- | :--- | :--- | :--- |
| **`customers`** | `customer_id` | `email` (`UNIQUE`), `name`, `country`, `created_at` | `1:N` with `orders` |
| **`products`** | `product_id` | `sku` (`UNIQUE`, indexed), `price` (`DECIMAL(10,2)`), `stock_quantity`, `reorder_level` | `1:N` with `order_items` (`onDelete: Restrict` protects historical records) |
| **`orders`** | `order_id` | `customer_id` (`FK`), `status` (`PENDING`, `FULFILLED`, `CANCELLED`), `created_at` | `N:1` with `customers` (`onDelete: Cascade`), `1:N` with `order_items` |
| **`order_items`** | `item_id` | `order_id` (`FK`), `product_id` (`FK`), `quantity`, `unit_price` (`DECIMAL(10,2)`) | Belongs to `orders` and `products` |

---

## REST API Reference

| Method | Endpoint | Request Body / Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | — | Returns all warehouse SKUs sorted by SKU code with computed `isLowStock` boolean (`stockQuantity <= reorderLevel`). |
| `GET` | `/api/products/:id` | `id` (`Int`) | Returns a single product SKU or `404 Not Found`. |
| `POST` | `/api/products` | `CreateProductDto` | Creates a new product SKU (`409 Conflict` if SKU already exists). |
| `PATCH` | `/api/products/:id/stock` | `UpdateStockDto` (`{ stockQuantity }`) | Updates a product's inventory count and recomputes `isLowStock`. |
| `GET` | `/api/customers` | — | Returns all registered B2B customer accounts. |
| `POST` | `/api/orders` | `CreateOrderDto` (`{ customerId, items: [{ productId, quantity }] }`) | Executes atomic multi-item order fulfillment; returns `400 Bad Request` and rolls back all stock changes if any SKU is short. |
| `GET` | `/api/orders/summary` | — | Returns `fulfilledOrdersCount`, `totalRevenue`, `lowStockAlertsCount`, `lowStockProducts`, and the 10 most recent fulfilled orders. |

---

## Local Quickstart Guide

### Prerequisites
* **Node.js** (v20+) & **npm**
* **Docker Desktop** (for running the `db-dev` and `db-test` PostgreSQL 16 containers)

### 1. Start the PostgreSQL Containers
From the root directory (`stockpulse-fulfillment/`):
```bash
docker compose up -d
docker compose ps
```
Confirm both `stockpulse_db_dev` (`5432`) and `stockpulse_db_test` (`5433`) show `Up (healthy)`.

### 2. Configure, Migrate & Seed the NestJS Backend
```bash
cd backend
npm install
cp .env.example .env

# Apply SQL migrations and run the idempotent seed script against db-dev (port 5432)
npx prisma migrate dev
npx prisma db seed

# Start the NestJS development server on http://localhost:3000
npm run start:dev
```

### 3. Start the React + Vite Frontend Console
Open a second terminal window:
```bash
cd frontend
npm install

# Launch the Vite dev server on http://localhost:5173
npm run dev
```
Open **`http://localhost:5173`** in your browser to interact with the StockPulse Fulfillment Console.

---

## Running Automated E2E Tests

The E2E integration suite (`backend/test/orders.e2e-spec.ts`) connects exclusively to `stockpulse_db_test` on `127.0.0.1:5433` and verifies:
1. Atomic order fulfillment and accurate stock deduction ($10 - 4 = 6$).
2. Full PostgreSQL transaction rollback when the second item in a multi-item order exceeds available stock.
3. Request rejection (`400 Bad Request`) via `ValidationPipe` when `quantity < 1`.
4. Executive KPI revenue aggregation and low-stock alert threshold detection.

### Execute the E2E Suite Locally
**Bash / Git Bash / macOS / Linux:**
```bash
cd backend
DATABASE_URL="postgresql://postgres:postgrespassword@127.0.0.1:5433/stockpulse_test?schema=public" npx prisma migrate deploy
npm run test:e2e -- test/orders.e2e-spec.ts
```

**Windows PowerShell:**
```powershell
cd backend
$env:DATABASE_URL="postgresql://postgres:postgrespassword@127.0.0.1:5433/stockpulse_test?schema=public"
npx prisma migrate deploy
npm run test:e2e -- test/orders.e2e-spec.ts
```

![alt text](docs/assets/preview.png)
