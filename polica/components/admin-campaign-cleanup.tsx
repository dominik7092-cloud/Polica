"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "./ui";

export function AdminCampaignCleanup({ campaigns }: { campaigns: { id: string; name: string; status: string }[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function cleanup() {
    if (selected.length === 0) return;
    if (!window.confirm(`Clean up ${selected.length} selected campaign${selected.length === 1 ? "" : "s"}? Unused campaigns will be deleted. Campaigns with history will be archived.`)) return;

    setBusy(true);
    setMessage("");
    setError("");
    const client = supabase();
    const { data, error } = await client.rpc("admin_cleanup_campaigns", { p_campaign_ids: selected });
    if (error) {
      setError(error.message);
    } else {
      const result = Array.isArray(data) ? data[0] : data;
      setMessage(`${result?.deleted_count ?? 0} deleted · ${result?.archived_count ?? 0} archived`);
      setSelected([]);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink/40">Cleanup mode</p>
          <p className="text-sm text-ink/55">Select old/test campaigns. Unused ones are deleted; campaigns with history are safely archived.</p>
        </div>
        {selected.length > 0 && <span className="rounded-full bg-coral/10 px-3 py-2 text-xs font-black text-coral">{selected.length} selected</span>}
      </div>

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-cream p-3">
        {campaigns.map((campaign) => (
          <label key={campaign.id} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-3">
            <input type="checkbox" checked={selected.includes(campaign.id)} onChange={() => toggle(campaign.id)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{campaign.name}</p>
              <p className="text-[10px] uppercase text-ink/40">{campaign.status}</p>
            </div>
          </label>
        ))}
      </div>

      <Button type="button" disabled={busy || selected.length === 0} className="mt-3 w-full bg-coral" onClick={() => void cleanup()}>
        {busy ? <Archive className="mr-2 inline" size={16} /> : <Trash2 className="mr-2 inline" size={16} />}
        {busy ? "Cleaning up…" : "Delete / archive selected"}
      </Button>
      {message && <p className="mt-2 text-xs font-bold text-mint">{message}</p>}
      {error && <p className="mt-2 text-xs font-bold text-coral">{error}</p>}
    </div>
  );
}
