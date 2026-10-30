"use client";

import { useState } from "react";
import { EyeOff, Eye, Trash2, ShieldBan, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "./ui";

function friendlyError(message: string) {
  if (message.includes("JOB_HAS_ACTIVITY")) return "This check already has activity. Unpublish it instead.";
  if (message.includes("CANNOT_BAN_SELF")) return "You cannot suspend your own Admin account.";
  if (message.includes("ADMIN_REQUIRED")) return "Admin access is required.";
  return message;
}

export function AdminJobControls({ jobId, published, canDelete }: { jobId: string; published: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function setPublished(value: boolean) {
    setBusy(true); setError("");
    const client = supabase();
    const { error } = await client.rpc("admin_set_job_published", { p_job: jobId, p_published: value });
    if (error) setError(friendlyError(error.message));
    else router.refresh();
    setBusy(false);
  }

  async function deleteJob() {
    if (!window.confirm("Delete this unused check permanently?")) return;
    setBusy(true); setError("");
    const client = supabase();
    const { error } = await client.rpc("admin_delete_unused_job", { p_job: jobId });
    if (error) setError(friendlyError(error.message));
    else router.refresh();
    setBusy(false);
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <Button type="button" disabled={busy} className="flex-1 bg-white text-ink shadow-sm" onClick={() => void setPublished(!published)}>
          {published ? <EyeOff className="mr-2 inline" size={15} /> : <Eye className="mr-2 inline" size={15} />}
          {published ? "Unpublish" : "Publish"}
        </Button>
        {canDelete && (
          <Button type="button" disabled={busy} className="bg-coral px-4" onClick={() => void deleteJob()} aria-label="Delete unused check">
            <Trash2 size={16} />
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-coral">{error}</p>}
    </div>
  );
}

export function AdminUserControls({ userId, banned, isSelf }: { userId: string; banned: boolean; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change() {
    setBusy(true); setError("");
    const client = supabase();
    const { error } = await client.rpc("admin_set_user_banned", { p_user: userId, p_banned: !banned });
    if (error) setError(friendlyError(error.message));
    else router.refresh();
    setBusy(false);
  }

  return (
    <div className="mt-3">
      <Button type="button" disabled={busy || isSelf} className={`w-full ${banned ? "bg-mint text-ink" : "bg-white text-coral shadow-sm"}`} onClick={() => void change()}>
        {banned ? <ShieldCheck className="mr-2 inline" size={15} /> : <ShieldBan className="mr-2 inline" size={15} />}
        {isSelf ? "Your Admin account" : banned ? "Reinstate user" : "Suspend user"}
      </Button>
      {error && <p className="mt-2 text-xs font-semibold text-coral">{error}</p>}
    </div>
  );
}
