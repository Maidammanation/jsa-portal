import DashboardShell from "@/components/DashboardShell";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="parent">{children}</DashboardShell>;
}
