"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "./ui";

export function AdminCampaignControls({ campaignId, status }: { campaignId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change(next: string) {
    setBusy(true);
    setError("");
    const client = supabase();
    const { error } = await client.rpc("admin_set_campaign_status", {
      p_campaign: campaignId,
      p_status: next,
    });
    if (error) setError(error.message);
    else router.refresh();
    setBusy(false);
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-2">
        {status !== "active" ? (
          <Button type="button" disabled={busy} onClick={() => void change("active")}>
            <Play className="mr-2 inline" size={15} /> Activate
          </Button>
        ) : (
          <Button type="button" disabled={busy} className="bg-white text-ink shadow-sm" onClick={() => void change("paused")}>
            <Pause className="mr-2 inline" size={15} /> Pause
          </Button>
        )}
        {status !== "completed" ? (
          <Button type="button" disabled={busy} className="bg-mint text-ink" onClick={() => void change("completed")}>
            <CheckCircle2 className="mr-2 inline" size={15} /> Complete
          </Button>
        ) : (
          <Button type="button" disabled className="bg-mint text-ink">Completed</Button>
        )}
      </div>
      {status !== "cancelled" && status !== "completed" && (
        <button type="button" disabled={busy} onClick={() => void change("cancelled")} className="mt-3 flex w-full items-center justify-center gap-1 text-xs font-bold text-coral">
          <XCircle size={14} /> Cancel campaign
        </button>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-coral">{error}</p>}
    </div>
  );
}
