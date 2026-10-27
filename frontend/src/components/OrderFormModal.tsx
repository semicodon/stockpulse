import React, { useState } from 'react';
import type {CreateOrderPayload, Product} from "../api/fulfillmentClient.ts";


interface OrderFormModalProps {
  products: Product[];
  onSubmitOrder: (payload: CreateOrderPayload) => void;
  isSubmitting: boolean;
  errorMsg: string | null;
}

const SEEDED_CUSTOMERS = [
  { id: 1, name: 'Alice Johnson (USA) — #1' },
  { id: 2, name: 'Bob Smith (Canada) — #2' },
  { id: 3, name: 'Diana Prince (UK) — #3' },
];

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
                                                                products,
                                                                onSubmitOrder,
                                                                isSubmitting,
                                                                errorMsg,
                                                              }) => {
  const [customerId, setCustomerId] = useState<number>(1);
  const [items, setItems] = useState<Array<{ productId: number; quantity: number }>>([
    { productId: products[0]?.id ?? 1, quantity: 1 },
  ]);

  const handleAddLineItem = () => {
    const defaultProductId = products[0]?.id ?? 1;
    setItems((prev) => [...prev, { productId: defaultProductId, quantity: 1 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (
    index: number,
    field: 'productId' | 'quantity',
    value: number,
  ) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitOrder({ customerId, items });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="font-semibold text-slate-900">
            Dispatch Multi-Item Fulfillment Order
          </h2>
          <p className="text-xs text-slate-500">
            Protected by Prisma interactive $transaction — rolls back all items if any SKU is short
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddLineItem}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 cursor-pointer"
        >
          + Add Line Item
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg">
          <span className="font-semibold">Transaction Rolled Back: </span>
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Customer Account
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {SEEDED_CUSTOMERS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 space-y-2">
          <div className="text-xs font-semibold uppercase text-slate-500 mb-1">
            Order Line Items
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select
                value={item.productId}
                onChange={(e) =>
                  handleItemChange(idx, 'productId', Number(e.target.value))
                }
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name} (${p.price.toFixed(2)} | {p.stockQuantity} in stock)
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(idx, 'quantity', Number(e.target.value))
                }
                className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Qty"
              />

              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveLineItem(idx)}
                  className="px-2.5 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? 'Processing Transaction...' : 'Fulfill Order'}
        </button>
      </div>
    </form>
  );
};