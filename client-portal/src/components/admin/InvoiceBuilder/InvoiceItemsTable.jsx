import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { formatCurrency, toCents, fromCents } from '@/lib/currency';

export default function InvoiceItemsTable({
  items = [],
  onAddItem,
  onRemoveItem,
  onItemChange,
}) {
  return (
    <div className="pt-4 border-t border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm text-slate-900">Invoice Items</h4>
        <div className="flex items-center gap-3 text-[11px] font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Task
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Expense
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Retainer
          </span>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[550px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
            <tr>
              <th className="p-2.5">Particulars</th>
              <th className="p-2.5 w-28">Type</th>
              <th className="p-2.5 w-32">Amount (₹)</th>
              <th className="p-2.5 w-28">Discount (₹)</th>
              <th className="p-2.5 w-32 text-right">Total (₹)</th>
              <th className="p-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((item) => {
              const itemTotalCents = Math.max(0, toCents(item.amount) - toCents(item.discount));
              const itemTotalRupees = fromCents(itemTotalCents);

              return (
                <tr key={item.id}>
                  <td className="p-2">
                    <Input 
                      placeholder="Particulars / Service Description" 
                      value={item.particulars} 
                      onChange={(e) => onItemChange(item.id, 'particulars', e.target.value)} 
                      className="h-8 text-xs" 
                      required 
                    />
                  </td>
                  <td className="p-2">
                    <select 
                      value={item.type} 
                      onChange={(e) => onItemChange(item.id, 'type', e.target.value)} 
                      className="w-full h-8 rounded border border-slate-200 text-xs px-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="Task">Task</option>
                      <option value="Expense">Expense</option>
                      <option value="Retainer">Retainer</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      value={item.amount} 
                      onChange={(e) => onItemChange(item.id, 'amount', e.target.value)} 
                      className="h-8 text-xs font-mono" 
                    />
                  </td>
                  <td className="p-2">
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      value={item.discount} 
                      onChange={(e) => onItemChange(item.id, 'discount', e.target.value)} 
                      className="h-8 text-xs font-mono" 
                    />
                  </td>
                  <td className="p-2 text-right font-bold text-slate-800 font-mono">
                    {formatCurrency(itemTotalRupees)}
                  </td>
                  <td className="p-2 text-center">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onRemoveItem(item.id)} 
                      disabled={items.length <= 1}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 disabled:opacity-30"
                    >
                      ✕
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-center">
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={onAddItem} 
          className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add Line Item
        </Button>
      </div>
    </div>
  );
}
