import InstitutionAuthGuard from "@/app/institution/InstitutionAuthGuard";
import InstitutionDashboardClient from "@/app/institution/InstitutionDashboardClient";

export default function InstitutionDashboardPage() {
  return (
    <InstitutionAuthGuard>
      <InstitutionDashboardClient />
    </InstitutionAuthGuard>
  );
}