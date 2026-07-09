export default function ParentDashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Parent Dashboard</h1>
      <p className="text-sm text-gray-500">
        Track your children's results, attendance, and fee payments.
      </p>
      {/* TODO: child selector, per-child results/attendance/fees cards */}
    </div>
  );
}
