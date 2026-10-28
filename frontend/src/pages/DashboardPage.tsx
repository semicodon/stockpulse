import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CreateOrderPayload,
  fulfillmentClient,
} from '../api/fulfillmentClient';
import { KpiHeader } from '../components/KpiHeader';
import { InventoryTable } from '../components/InventoryTable';
import { OrderFormModal } from '../components/OrderFormModal';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['operational-summary'],
    queryFn: () => fulfillmentClient.getOperationalSummary(),
  });

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => fulfillmentClient.getProducts(),
  });

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: () => fulfillmentClient.getCustomers(),
  });

  const refreshAllData = () => {
    queryClient.invalidateQueries({ queryKey: ['operational-summary'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const createOrderMutation = useMutation({
    mutationFn: (payload: CreateOrderPayload) =>
      fulfillmentClient.createOrder(payload),
    onSuccess: () => {
      setErrorMsg(null);
      refreshAllData();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    },
  });

  const restockMutation = useMutation({
    mutationFn: ({
                   productId,
                   stockQuantity,
                 }: {
      productId: number;
      stockQuantity: number;
    }) => fulfillmentClient.updateProductStock(productId, stockQuantity),
    onSuccess: () => {
      refreshAllData();
    },
  });

  if (
    summaryQuery.isLoading ||
    productsQuery.isLoading ||
    customersQuery.isLoading
  ) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        Loading StockPulse Fulfillment Console...
      </div>
    );
  }

  if (
    summaryQuery.isError ||
    productsQuery.isError ||
    customersQuery.isError
  ) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-xl mx-auto p-5 bg-red-50 border border-red-200 rounded-xl text-red-800">
          <h2 className="font-bold">Cannot reach StockPulse API (Port 3000)</h2>
          <p className="text-sm mt-1">
            Ensure your NestJS server is running via <code>npm run start:dev</code> in the <code>backend/</code> folder.
          </p>
        </div>
      </div>
    );
  }

  const summary = summaryQuery.data!;
  const products = productsQuery.data!;
  const customers = customersQuery.data!;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto p-6 space-y-6 font-sans">
        <header className="border-b border-slate-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              StockPulse Fulfillment Console
            </h1>
            <p className="text-sm text-slate-500">
              NestJS + Prisma Transactional Order & Inventory Engine
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            API Connected
          </span>
        </header>

        {/* 1. Executive KPI Cards */}
        <KpiHeader summary={summary} />

        {/* 2. Transactional Order Dispatcher */}
        <OrderFormModal
          customers={customers}
          products={products}
          onSubmitOrder={(payload) => createOrderMutation.mutate(payload)}
          isSubmitting={createOrderMutation.isPending}
          errorMsg={errorMsg}
        />

        {/* 3. Live SKU Inventory & Restock Table */}
        <InventoryTable
          products={products}
          onRestock={(productId, stockQuantity) =>
            restockMutation.mutate({ productId, stockQuantity })
          }
          isRestocking={restockMutation.isPending}
        />

        {/* 4. Recent Fulfilled Orders Feed */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">
              Recent Fulfilled Orders
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {summary.recentOrders.map((order) => (
              <div
                key={order.id}
                className="px-5 py-3.5 flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-mono font-semibold text-slate-900">
                    Order #{order.id}
                  </span>{' '}
                  <span className="text-slate-600">
                    for {order.customer.name} ({order.customer.country})
                  </span>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {order.items
                      .map(
                        (i) =>
                          `${i.quantity}x ${i.product.sku} (@ $${Number(i.unitPrice).toFixed(2)})`,
                      )
                      .join(' + ')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800">
                    {order.status}
                  </span>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}