"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Euro, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card } from "./ui";

export function AdminNewCampaignForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [budget, setBudget] = useState("500");
  const [pricePerResult, setPricePerResult] = useState("10");
  const [targetResults, setTargetResults] = useState("50");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createCampaign() {
    setError("");
    if (!companyName.trim() || !campaignName.trim()) {
      setError("Company and campaign name are required.");
      return;
    }

    const budgetValue = Number(budget);
    const priceValue = Number(pricePerResult);
    const targetValue = Number(targetResults);
    if (!Number.isFinite(budgetValue) || budgetValue < 0 || !Number.isFinite(priceValue) || priceValue < 0 || !Number.isFinite(targetValue) || targetValue < 0) {
      setError("Budget, price and target must be valid positive numbers.");
      return;
    }

    setBusy(true);
    const client = supabase();
    const { data, error: createError } = await client.rpc("admin_create_company_campaign", {
      p_company_name: companyName.trim(),
      p_contact_name: contactName.trim(),
      p_contact_email: contactEmail.trim(),
      p_campaign_name: campaignName.trim(),
      p_budget_cents: Math.round(budgetValue * 100),
      p_price_per_result_cents: Math.round(priceValue * 100),
      p_target_results: Math.round(targetValue),
      p_starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      p_ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      p_notes: notes.trim(),
    });

    if (createError) {
      setError(createError.message);
      setBusy(false);
      return;
    }

    router.push(`/${locale}/admin/campaigns/${data}`);
    router.refresh();
  }

  return (
    <section className="px-5 py-8">
      <button type="button" onClick={() => router.push(`/${locale}/admin/campaigns`)} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
        <ArrowLeft size={16} /> Campaigns
      </button>

      <p className="mt-7 text-sm font-bold text-coral">Polica Admin</p>
      <h1 className="text-4xl font-black">New campaign</h1>
      <p className="mt-2 text-sm text-ink/50">Create the client and commercial campaign first. Store checks can then be added under this campaign.</p>

      <Card className="mt-6 p-5">
        <div className="flex items-center gap-2"><Building2 size={19} /><h2 className="text-xl font-black">Client</h2></div>
        <label className="mt-4 block"><span className="text-sm font-bold">Company *</span><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ABC Distributor" className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint" /></label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label><span className="text-sm font-bold">Contact</span><input value={contactName} onChange={(e) => setContactName(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none" /></label>
          <label><span className="text-sm font-bold">Email</span><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none" /></label>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-xl font-black">Campaign</h2>
        <label className="mt-4 block"><span className="text-sm font-bold">Campaign name *</span><input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Product X Availability - November" className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint" /></label>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <label><span className="flex items-center gap-1 text-xs font-bold"><Euro size={13}/> Budget</span><input type="number" min="0" step="10" value={budget} onChange={(e) => setBudget(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 outline-none" /></label>
          <label><span className="flex items-center gap-1 text-xs font-bold"><Euro size={13}/> Per result</span><input type="number" min="0" step="1" value={pricePerResult} onChange={(e) => setPricePerResult(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 outline-none" /></label>
          <label><span className="flex items-center gap-1 text-xs font-bold"><Target size={13}/> Target</span><input type="number" min="0" value={targetResults} onChange={(e) => setTargetResults(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 outline-none" /></label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label><span className="text-sm font-bold">Starts</span><input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 outline-none" /></label>
          <label><span className="text-sm font-bold">Ends</span><input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 outline-none" /></label>
        </div>
        <label className="mt-4 block"><span className="text-sm font-bold">Notes</span><textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What the client wants checked..." className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white p-4 outline-none" /></label>
      </Card>

      {error && <p className="mt-4 rounded-2xl bg-coral/10 p-4 text-sm font-semibold text-coral">{error}</p>}
      <Button type="button" disabled={busy} className="mt-5 w-full bg-coral py-4" onClick={() => void createCampaign()}>{busy ? "Creating…" : "Create campaign"}</Button>
    </section>
  );
}
