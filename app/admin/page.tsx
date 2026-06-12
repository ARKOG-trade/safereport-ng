import AdminDashboardClient from "@/app/admin/AdminDashboardClient";
import AdminAuthGuard from "@/app/admin/AdminAuthGuard";

export default function AdminPage() {
  return (
    <AdminAuthGuard>
      <AdminDashboardClient />
    </AdminAuthGuard>
  );
}