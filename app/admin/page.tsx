import AdminDashboardClient from "@/app/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";
import AdminAuthGuard from "@/app/admin/AdminAuthGuard";

export default function AdminPage() {
  return (
    <AdminAuthGuard>
      <AdminDashboardClient />
    </AdminAuthGuard>
  );
}