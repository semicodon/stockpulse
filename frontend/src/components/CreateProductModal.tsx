import React, {useState} from 'react';
import type {CreateProductPayload, Product} from '../api/fulfillmentClient';

const SKU_PREFIX_GENERAL = 'GN';
const SKU_PREFIX_DEFAULT = 'HW'

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[]; // <-- 1. Receive loaded products from DashboardPage
  onCreateProduct: (
    payload: CreateProductPayload,
    onSuccessReset: () => void,
  ) => void;
  isSubmitting: boolean;
  errorMsg: string | null;
}
function generateUniqueSku(existingProducts: Product[],
                           nameHint: string): string {
  const existingSkus = new Set(
    existingProducts.map((p) => p.sku.toUpperCase()),
  );

  // Use the first 2 letters of the product name if available (e.g., "Mouse" -> "MO"), otherwise "GN"
  const cleanPrefix = nameHint
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 2)
    .toUpperCase() || SKU_PREFIX_GENERAL;

  let candidateSku = '';
  do {
    // Generates a 4-character alphanumeric code, e.g., "HW-MO-8F4K"
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    candidateSku = `${SKU_PREFIX_DEFAULT}-${cleanPrefix}-${randomCode}`;
  } while (existingSkus.has(candidateSku));

  return candidateSku;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
                                                                        isOpen,
                                                                        onClose,
                                                                        existingProducts,
                                                                        onCreateProduct,
                                                                        isSubmitting,
                                                                        errorMsg,
                                                                      }) => {
  const [sku, setSku] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [price, setPrice] = useState<number>(49.99);
  const [stockQuantity, setStockQuantity] = useState<number>(20);
  const [reorderLevel, setReorderLevel] = useState<number>(10);

  // 2. DERIVED STATE: Check if the typed SKU already exists in our cached catalog
  const normalizedTypedSku = sku.trim().toUpperCase();
  const isDuplicateSku =
    normalizedTypedSku.length > 0 &&
    existingProducts.some((p) => p.sku.toUpperCase() === normalizedTypedSku);

  const resetForm = () => {
    setSku('');
    setName('');
    setPrice(49.99);
    setStockQuantity(20);
    setReorderLevel(10);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Block submission immediately on the client if a duplicate SKU was typed
    if (isDuplicateSku) return;

    // 3. Auto-generate a unique SKU if the user left the SKU input blank
    const finalSku =
      normalizedTypedSku.length > 0
        ? normalizedTypedSku
        : generateUniqueSku(existingProducts, name);

    onCreateProduct(
      {
        sku: finalSku,
        name: name.trim(),
        price: Number(price),
        stockQuantity: Number(stockQuantity),
        reorderLevel: Number(reorderLevel),
      },
      resetForm,
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
              Leave SKU blank to auto-generate a unique code
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
              <span className="font-semibold">Server Error: </span>
              {errorMsg}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase text-slate-500">
                SKU Code (Optional)
              </label>
              <button
                type="button"
                onClick={() =>
                  setSku(generateUniqueSku(existingProducts, name))
                }
                className="text-xs font-medium text-blue-700 hover:text-blue-900 cursor-pointer"
              >
                ✨ Generate Random SKU
              </button>
            </div>
            <input
              type="text"
              placeholder="Leave blank to auto-generate (e.g. HW-MO-8F4K)"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase ${
                isDuplicateSku
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-slate-300'
              }`}
            />
            {/* Instant client-side duplicate warning */}
            {isDuplicateSku && (
              <p className="mt-1 text-xs font-medium text-red-600">
                SKU "{normalizedTypedSku}" already exists in your inventory.
              </p>
            )}
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
              disabled={isSubmitting || isDuplicateSku}
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