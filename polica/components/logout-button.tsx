"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "./ui";

export function LogoutButton({ locale }: { locale: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function logOut() {
    setLoading(true);
    setError("");

    const client = supabase();
    const { error: signOutError } = await client.auth.signOut();

    if (signOutError) {
      setError("Could not log out. Please try again.");
      setLoading(false);
      return;
    }

    router.replace(`/${locale}/auth/login`);
    router.refresh();
  }

  return (
    <div className="mt-8">
      <Button
        type="button"
        disabled={loading}
        onClick={() => void logOut()}
        className="w-full bg-white text-coral shadow-sm"
      >
        <LogOut className="mr-2 inline" size={18} />
        {loading ? "Logging out…" : "Log out"}
      </Button>

      {error && (
        <p className="mt-3 text-center text-xs font-semibold text-coral">
          {error}
        </p>
      )}
    </div>
  );
}
