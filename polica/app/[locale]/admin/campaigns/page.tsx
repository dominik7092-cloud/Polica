import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, Building2, BriefcaseBusiness } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Chip } from "@/components/ui";
import { AdminCampaignControls } from "@/components/admin-campaign-controls";

export default async function CampaignsPage({ params, searchParams }: {
  params: { locale: string };
  searchParams: { status?: string; company?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/auth/login`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect(`/${params.locale}/jobs`);

  let query = supabase.from("campaigns").select(`
    id,name,status,budget_cents,client_price_per_result_cents,target_results,
    starts_at,ends_at,company_id,companies(id,name)
  `).order("created_at", { ascending: false });
  if (searchParams.status && searchParams.status !== "all") query = query.eq("status", searchParams.status);
  if (searchParams.company) query = query.eq("company_id", searchParams.company);
  const { data: campaigns } = await query;
  const { data: companies } = await supabase.from("companies").select("id,name").eq("active", true).order("name");
  const { data: jobs } = await supabase.from("jobs").select("id,campaign_id");
  const { data: submissions } = await supabase.from("submissions").select("id,job_id,status");

  const jobToCampaign = new Map((jobs ?? []).map((job) => [job.id, job.campaign_id]));
  const metrics = new Map<string, { jobs: number; approved: number; review: number }>();
  for (const campaign of campaigns ?? []) metrics.set(campaign.id, { jobs: 0, approved: 0, review: 0 });
  for (const job of jobs ?? []) if (job.campaign_id && metrics.has(job.campaign_id)) metrics.get(job.campaign_id)!.jobs += 1;
  for (const sub of submissions ?? []) {
    const campaignId = jobToCampaign.get(sub.job_id);
    if (!campaignId || !metrics.has(campaignId)) continue;
    if (sub.status === "approved") metrics.get(campaignId)!.approved += 1;
    if (["submitted","flagged"].includes(sub.status)) metrics.get(campaignId)!.review += 1;
  }

  const statuses = ["all","draft","active","paused","completed","cancelled"];

  return (
    <section className="px-5 py-8">
      <p className="text-sm font-bold text-coral">Polica Admin</p>
      <div className="flex items-end justify-between gap-3">
        <div><h1 className="text-4xl font-black">Campaigns</h1><p className="mt-2 text-sm text-ink/50">One client can have multiple concurrent campaigns.</p></div>
        <Link href={`/${params.locale}/admin/campaigns/new`} className="rounded-2xl bg-coral px-4 py-3 text-xs font-black text-white"><Plus className="mr-1 inline" size={15}/> New</Link>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {statuses.map((status) => (
          <Link key={status} href={`/${params.locale}/admin/campaigns?status=${status}`}><Chip className={(searchParams.status ?? "all") === status ? "bg-ink text-white" : "bg-white"}>{status}</Chip></Link>
        ))}
      </div>

      <form className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <select name="company" defaultValue={searchParams.company ?? ""} className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none">
          <option value="">All clients</option>
          {(companies ?? []).map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
        <button type="submit" className="rounded-2xl bg-ink px-4 text-white"><Search size={18}/></button>
      </form>

      <div className="mt-5 space-y-4">
        {(campaigns ?? []).map((campaign: any) => {
          const m = metrics.get(campaign.id) ?? { jobs: 0, approved: 0, review: 0 };
          const company = Array.isArray(campaign.companies) ? campaign.companies[0] : campaign.companies;
          const billable = m.approved * campaign.client_price_per_result_cents;
          const refund = Math.max(campaign.budget_cents - billable, 0);
          return (
            <Card key={campaign.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><div className="flex flex-wrap gap-2"><Chip className="bg-mint/15"><Building2 className="mr-1" size={12}/>{company?.name ?? "Client"}</Chip><Chip>{campaign.status}</Chip></div><h2 className="mt-3 text-xl font-black">{campaign.name}</h2></div>
                <BriefcaseBusiness className="shrink-0 text-ink/25"/>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-cream p-3"><b>{m.jobs}</b><p className="text-[10px] text-ink/40">CHECKS</p></div>
                <div className="rounded-2xl bg-cream p-3"><b>{m.approved}</b><p className="text-[10px] text-ink/40">APPROVED</p></div>
                <div className="rounded-2xl bg-cream p-3"><b>{m.review}</b><p className="text-[10px] text-ink/40">REVIEW</p></div>
              </div>
              <div className="mt-3 rounded-2xl bg-ink p-4 text-white"><div className="flex justify-between text-sm"><span className="text-white/55">Budget</span><b>€{(campaign.budget_cents/100).toFixed(2)}</b></div><div className="mt-2 flex justify-between text-sm"><span className="text-white/55">Billable now</span><b>€{(billable/100).toFixed(2)}</b></div><div className="mt-2 flex justify-between text-sm"><span className="text-white/55">Potential refund</span><b>€{(refund/100).toFixed(2)}</b></div></div>
              <Link href={`/${params.locale}/admin/campaigns/${campaign.id}`} className="mt-4 block rounded-2xl bg-cream py-3 text-center text-sm font-black">Open campaign</Link>
              <AdminCampaignControls campaignId={campaign.id} status={campaign.status}/>
            </Card>
          );
        })}
        {(campaigns ?? []).length === 0 && <Card className="p-7 text-center"><p className="font-black">No campaigns match these filters.</p></Card>}
      </div>
    </section>
  );
}
