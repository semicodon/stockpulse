import React from 'react';
import type {Product} from "../api/fulfillmentClient.ts";

interface InventoryTableProps {
  products: Product[];
  onRestock: (productId: number, newStockQuantity: number) => void;
  isRestocking: boolean;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
                                                                products,
                                                                onRestock,
                                                                isRestocking,
                                                              }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Warehouse SKU Inventory</h2>
          <p className="text-xs text-slate-500">
            Live stock levels and automated reorder threshold monitoring
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
            <th className="py-3 px-4">ID</th>
            <th className="py-3 px-4">SKU</th>
            <th className="py-3 px-4">Product Name</th>
            <th className="py-3 px-4 text-right">Unit Price</th>
            <th className="py-3 px-4 text-right">In Stock</th>
            <th className="py-3 px-4 text-right">Reorder Level</th>
            <th className="py-3 px-4 text-center">Status</th>
            <th className="py-3 px-4 text-right">Quick Action</th>
          </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-slate-50/80">
              <td className="py-3 px-4 font-mono text-xs text-slate-500">
                #{product.id}
              </td>
              <td className="py-3 px-4 font-mono font-medium text-slate-900">
                {product.sku}
              </td>
              <td className="py-3 px-4 text-slate-800">{product.name}</td>
              <td className="py-3 px-4 text-right font-medium text-slate-700">
                ${product.price.toFixed(2)}
              </td>
              <td className="py-3 px-4 text-right font-bold text-slate-900">
                {product.stockQuantity}
              </td>
              <td className="py-3 px-4 text-right text-slate-500">
                {product.reorderLevel}
              </td>
              <td className="py-3 px-4 text-center">
                {product.isLowStock ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Low Stock
                    </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Healthy
                    </span>
                )}
              </td>
              <td className="py-3 px-4 text-right">
                <button
                  type="button"
                  disabled={isRestocking}
                  onClick={() =>
                    onRestock(product.id, product.stockQuantity + 10)
                  }
                  className="text-xs font-medium px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                >
                  +10 Stock
                </button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};