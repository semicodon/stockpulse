const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export enum OrderStatus {
  PENDING = 'PENDING',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED'
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  order: Order;
  product: Product;
}

export interface Order {
  id: number;
  customerId: number;
  status: OrderStatus;
  createdAt: string;
  customer: Customer;
  items: OrderItem[];
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  country: string;
  createdAt?: string;
  orders: Order[];
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  stockQuantity: number;
  reorderLevel: number;
  isLowStock: boolean;
}

export interface OrderItemSummary {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: string | number;
  product: {
    sku: string;
    name: string;
  };
}

export interface RecentOrder {
  id: number;
  customerId: number;
  status: OrderStatus;
  createdAt: string;
  customer: {
    id: number;
    name: string;
    country: string;
  };
  items: OrderItemSummary[];
}

export interface OperationalSummary {
  fulfilledOrdersCount: number;
  totalRevenue: number;
  lowStockAlertsCount: number;
  lowStockProducts: Product[];
  recentOrders: RecentOrder[];
}

export interface CreateOrderPayload {
  customerId: number;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  price: number;
  stockQuantity: number;
  reorderLevel?: number;
}


async function handleResponse<T>(res: Response): Promise<T>
/*
* Handles HTTP responses by:
* 1. Extracting JSON data -> Output array of strings
* 2. Throwing errors with human-readable messages -> Output Error as string
* */
{
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const fulfillmentClient = {

  /* Returns operational summary data */
  getOperationalSummary(): Promise<OperationalSummary> {
    return fetch(`${API_BASE}/orders/summary`).then((res) =>
      handleResponse<OperationalSummary>(res),
    );
  },

  /* Returns list of products */
  getProducts(): Promise<Product[]> {
    return fetch(`${API_BASE}/products`).then((res) =>
      handleResponse<Product[]>(res),
    );
  },

  createProduct(payload: CreateProductPayload): Promise<Product> {
    return fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse<Product>(res));
  },

  /* Returns list of customers */
  getCustomers(): Promise<Customer[]> {
    return fetch(`${API_BASE}/customers`).then((res) =>
      handleResponse<Customer[]>(res),
    );
  },

  /* Creates a new order */
  createOrder(payload: CreateOrderPayload): Promise<RecentOrder> {
    return fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((res) =>
      handleResponse<RecentOrder>(res));
  },

  /* Updates stock quantity for a product */
  updateProductStock(productId: number, stockQuantity: number): Promise<Product> {
    return fetch(`${API_BASE}/products/${productId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockQuantity }),
    }).then((res) =>
      handleResponse<Product>(res));
  },
}