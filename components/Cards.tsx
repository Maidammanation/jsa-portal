import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: "brand" | "accent" | "active" | "suspended" | "disabled";
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  brand: "bg-brand/10 text-brand",
  accent: "bg-accent/10 text-accent",
  active: "bg-status-active/10 text-status-active",
  suspended: "bg-status-suspended/10 text-status-suspended",
  disabled: "bg-status-disabled/10 text-status-disabled",
};

export function StatCard({ label, value, icon, accent = "brand" }: StatCardProps) {
  return (
    <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4 flex items-center gap-4">
      {icon && (
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl ${accentClasses[accent]}`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-2xl font-semibold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

interface ActionCardProps {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
}

export function ActionCard({ label, icon, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-card border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2 hover:border-brand hover:shadow-md transition-all"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
}

export function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
      <p className="font-semibold text-gray-800 mb-2">{title}</p>
      <div className="text-sm text-gray-600 space-y-1">{children}</div>
    </div>
  );
}
