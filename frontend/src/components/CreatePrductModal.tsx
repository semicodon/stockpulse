import React, { useState } from 'react';
import type { CreateProductPayload } from '../api/fulfillmentClient';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProduct: (
    payload: CreateProductPayload,
    onSuccessReset: () => void,
  ) => void;
  isSubmitting: boolean;
  errorMsg: string | null;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
                                                                        isOpen,
                                                                        onClose,
                                                                        onCreateProduct,
                                                                        isSubmitting,
                                                                        errorMsg,
                                                                      }) => {
  // Controlled Client UI State for each form input
  const [sku, setSku] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [price, setPrice] = useState<number>(49.99);
  const [stockQuantity, setStockQuantity] = useState<number>(20);
  const [reorderLevel, setReorderLevel] = useState<number>(10);

  // Helper that resets all inputs back to their initial defaults
  const resetForm = () => {
    setSku('');
    setName('');
    setPrice(49.99);
    setStockQuantity(20);
    setReorderLevel(10);
  };

  // If the modal is closed, render nothing in the DOM
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onCreateProduct(
      {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        price: Number(price),
        stockQuantity: Number(stockQuantity),
        reorderLevel: Number(reorderLevel),
      },
      resetForm, // Passed to DashboardPage so it only runs on 201 Created!
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Register New Warehouse SKU
            </h2>
            <p className="text-xs text-slate-500">
              Validated by NestJS CreateProductDto & unique SKU index
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-medium cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg">
              <span className="font-semibold">Validation / Conflict Error: </span>
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              SKU Code (Unique)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HW-MS-01"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Product Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wireless Ergonomic Mouse"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Unit Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Reorder Level
              </label>
              <input
                type="number"
                min="0"
                required
                value={reorderLevel}
                onChange={(e) => setReorderLevel(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving SKU...' : 'Create SKU'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};