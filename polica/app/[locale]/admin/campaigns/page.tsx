import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Chip } from "@/components/ui";
import { AdminCampaignCleanup } from "@/components/admin-campaign-cleanup";

export default async function CampaignsPage({ params }: { params: { locale: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/auth/login`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect(`/${params.locale}/jobs`);

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id,name,status,budget_cents,client_price_per_result_cents,target_results,created_at,companies(name)")
    .order("created_at", { ascending: false });

  const { data: jobs } = await supabase.from("jobs").select("id,campaign_id");
  const jobIds = (jobs ?? []).map((job) => job.id);
  const { data: submissions } = jobIds.length
    ? await supabase.from("submissions").select("id,job_id,status").in("job_id", jobIds)
    : { data: [] as any[] };

  const jobToCampaign = new Map((jobs ?? []).map((job) => [job.id, job.campaign_id]));
  const metrics = new Map<string, { jobs: number; approved: number; review: number }>();
  for (const campaign of campaigns ?? []) metrics.set(campaign.id, { jobs: 0, approved: 0, review: 0 });
  for (const job of jobs ?? []) if (job.campaign_id && metrics.has(job.campaign_id)) metrics.get(job.campaign_id)!.jobs += 1;
  for (const submission of submissions ?? []) {
    const campaignId = jobToCampaign.get(submission.job_id);
    if (!campaignId || !metrics.has(campaignId)) continue;
    if (submission.status === "approved") metrics.get(campaignId)!.approved += 1;
    if (["submitted", "flagged"].includes(submission.status)) metrics.get(campaignId)!.review += 1;
  }

  const cleanupCampaigns = (campaigns ?? []).map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
  }));

  return (
    <section className="px-5 py-8">
      <p className="text-sm font-bold text-coral">Polica Admin</p>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black">Campaigns</h1>
          <p className="mt-2 text-sm text-ink/50">Manage client campaigns without scrolling through every individual store check.</p>
        </div>
        <Link href={`/${params.locale}/admin/campaigns/new`} className="rounded-2xl bg-coral px-4 py-3 text-xs font-black text-white">
          <Plus className="mr-1 inline" size={15} /> New
        </Link>
      </div>

      {cleanupCampaigns.length > 0 && <AdminCampaignCleanup campaigns={cleanupCampaigns} />}

      <div className="mt-6 space-y-4">
        {(campaigns ?? []).map((campaign: any) => {
          const company = Array.isArray(campaign.companies) ? campaign.companies[0] : campaign.companies;
          const m = metrics.get(campaign.id) ?? { jobs: 0, approved: 0, review: 0 };
          const billable = m.approved * campaign.client_price_per_result_cents;
          const refund = Math.max(campaign.budget_cents - billable, 0);
          return (
            <Card key={campaign.id} className="p-5">
              <div className="flex flex-wrap gap-2"><Chip>{company?.name ?? "Client"}</Chip><Chip className="bg-mint/15">{campaign.status}</Chip></div>
              <h2 className="mt-3 text-xl font-black">{campaign.name}</h2>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-cream p-3"><b>{m.jobs}</b><p className="text-[10px] text-ink/40">CHECKS</p></div>
                <div className="rounded-2xl bg-cream p-3"><b>{m.approved}</b><p className="text-[10px] text-ink/40">APPROVED</p></div>
                <div className="rounded-2xl bg-cream p-3"><b>{m.review}</b><p className="text-[10px] text-ink/40">REVIEW</p></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-ink p-3 text-white"><span className="text-white/50">Billable</span><p className="font-black">EUR {(billable / 100).toFixed(2)}</p></div>
                <div className="rounded-2xl bg-ink p-3 text-white"><span className="text-white/50">Potential refund</span><p className="font-black">EUR {(refund / 100).toFixed(2)}</p></div>
              </div>
              <Link href={`/${params.locale}/admin/campaigns/${campaign.id}`} className="mt-4 block rounded-2xl bg-cream py-3 text-center text-sm font-black">Open campaign</Link>
            </Card>
          );
        })}
        {(campaigns ?? []).length === 0 && <Card className="p-7 text-center"><p className="font-black">No campaigns yet.</p></Card>}
      </div>
    </section>
  );
}
