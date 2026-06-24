"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function InstitutionLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    try {
      await signInWithEmailAndPassword(auth, email, password);

      const userEmail = email.toLowerCase();

      if (userEmail === "police@safereport.ng") {
        router.push("/institution/police");
      } else if (userEmail === "hospital@safereport.ng") {
        router.push("/institution/hospital");
      } else if (userEmail === "fire@safereport.ng") {
        router.push("/institution/fire");
      } else if (userEmail === "cybercrime@safereport.ng") {
        router.push("/institution/cybercrime");
      } else {
        setError("Unauthorized institution account");
      }
    } catch (error) {
  console.error("LOGIN ERROR:", error);

  alert(
    JSON.stringify(error, null, 2)
  );

  setError("Invalid login credentials");
}
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Institution Login
      </h1>

      <form onSubmit={handleLogin}>
        <input
          className="border p-2 w-full mb-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="border px-4 py-2"
          type="submit"
        >
          Login
        </button>
      </form>

      {error && (
        <p className="mt-3 text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}