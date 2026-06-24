"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

export default function AdminAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
  router.replace("/login/admin");
  return;
}

if (user.email !== "admin@safereport.ng") {
  router.replace("/");
  return;
}

setLoading(false);

      const email = user.email?.toLowerCase();

      if (email !== "admin@safereport.ng") {
        router.replace("/login/admin");
        return;
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <div className="p-6">Checking authentication...</div>;
  }

  return <>{children}</>;
}