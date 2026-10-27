import React from 'react';
import type {OperationalSummary} from "../api/fulfillmentClient.ts";


interface KpiHeaderProps {
  summary: OperationalSummary;
}

export const KpiHeader: React.FC<KpiHeaderProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Fulfilled Orders
        </div>
        <div className="mt-2 text-3xl font-bold text-slate-900">
          {summary.fulfilledOrdersCount}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          Verified atomic transactions
        </div>
      </div>

      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Total Fulfilled Revenue
        </div>
        <div className="mt-2 text-3xl font-bold text-emerald-700">
          ${summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          Locked historical unit pricing
        </div>
      </div>

      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Low-Stock SKU Alerts
        </div>
        <div
          className={`mt-2 text-3xl font-bold ${
            summary.lowStockAlertsCount > 0 ? 'text-amber-600' : 'text-slate-900'
          }`}
        >
          {summary.lowStockAlertsCount}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          SKUs at or below reorder threshold
        </div>
      </div>
    </div>
  );
};