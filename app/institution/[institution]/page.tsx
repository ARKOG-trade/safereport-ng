import { notFound } from "next/navigation";
import InstitutionDashboardClient from "@/app/institution/InstitutionDashboardClient";

const institutionMap: Record<string, string> = {
  police: "Police",
  hospital: "Hospital",
  fire: "Fire Service",
  cybercrime: "Cybercrime Unit",
};

export default function InstitutionSpecificPage({ params }: { params: { institution: string } }) {
  const institutionKey = params.institution.toLowerCase();
  const institutionName = institutionMap[institutionKey];

  if (!institutionName) {
    notFound();
  }

  return <InstitutionDashboardClient institutionFilter={institutionName} />;
}
