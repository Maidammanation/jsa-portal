import type { AccountStatus } from "@/settings/config";

export interface Column<T> {
  header: string;
  accessor: keyof T;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wide">
            {columns.map((col) => (
              <th key={String(col.accessor)} className="px-4 py-3 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={String(col.accessor)} className="px-4 py-3 text-gray-700">
                    {col.render ? col.render(row) : String(row[col.accessor] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const statusStyles: Record<AccountStatus, string> = {
  active: "bg-status-active/10 text-status-active",
  suspended: "bg-status-suspended/10 text-status-suspended",
  disabled: "bg-status-disabled/10 text-status-disabled",
};

const statusLabel: Record<AccountStatus, string> = {
  active: "🟢 Active",
  suspended: "🟡 Suspended",
  disabled: "🔴 Disabled",
};

export function StatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {statusLabel[status]}
    </span>
  );
}
