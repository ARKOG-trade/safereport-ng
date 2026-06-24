"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

export default function InstitutionAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(
    auth,
    (user) => {
      console.log("AUTH USER:", user);
      console.log("CURRENT PATH:", pathname);

      if (!user) {
        router.replace("/login/institution");
        return;
      }

      const email =
        user.email?.toLowerCase().trim() || "";

      const allowedRoutes: Record<string, string> = {
        "police@safereport.ng":
          "/institution/police",
        "hospital@safereport.ng":
          "/institution/hospital",
        "fire@safereport.ng":
          "/institution/fire",
        "cybercrime@safereport.ng":
          "/institution/cybercrime",
      };

      const allowedRoute =
        allowedRoutes[email];

      if (!allowedRoute) {
        router.replace("/login/institution");
        return;
      }

      if (!pathname.startsWith(allowedRoute)) {
        router.replace(allowedRoute);
        return;
      }

      setLoading(false);
    }
  );

  return () => unsubscribe();
}, [pathname, router]);
  if (loading) {
    return (
      <div className="p-6">
        Checking authentication...
      </div>
    );
  }

  return <>{children}</>;
}