import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, Image as ImageIcon, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Chip } from "@/components/ui";
import { AdminCampaignControls } from "@/components/admin-campaign-controls";
import { AdminJobControls } from "@/components/admin-controls";

export default async function CampaignDetailPage({ params }: { params: { locale: string; id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/auth/login`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect(`/${params.locale}/jobs`);

  const { data: campaign } = await supabase.from("campaigns").select(`id,name,status,budget_cents,client_price_per_result_cents,target_results,starts_at,ends_at,notes,company_id,companies(name,contact_name,contact_email)`).eq("id", params.id).single();
  if (!campaign) notFound();

  const { data: jobs } = await supabase.from("jobs").select("id,store_id,title,job_type,reward_cents,estimated_minutes,published").eq("campaign_id", params.id).order("title");
  const jobIds = (jobs ?? []).map((j) => j.id);
  const storeIds = Array.from(new Set((jobs ?? []).map((j) => j.store_id)));
  const { data: stores } = storeIds.length ? await supabase.from("stores").select("id,chain,address").in("id", storeIds) : { data: [] } as any;
  const { data: reservations } = jobIds.length ? await supabase.from("reservations").select("id,job_id").in("job_id", jobIds) : { data: [] } as any;
  const { data: submissions } = jobIds.length ? await supabase.from("submissions").select("id,job_id,status,photo_path,gps_verified,created_at").in("job_id", jobIds) : { data: [] } as any;

  const storeMap = new Map((stores ?? []).map((s: any) => [s.id, s]));
  const company: any = Array.isArray((campaign as any).companies) ? (campaign as any).companies[0] : (campaign as any).companies;
  const approved = (submissions ?? []).filter((s: any) => s.status === "approved").length;
  const review = (submissions ?? []).filter((s: any) => ["submitted","flagged"].includes(s.status)).length;
  const billable = approved * campaign.client_price_per_result_cents;
  const refund = Math.max(campaign.budget_cents - billable, 0);

  return (
    <section className="px-5 py-8">
      <Link href={`/${params.locale}/admin/campaigns`} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm"><ArrowLeft size={16}/> Campaigns</Link>
      <div className="mt-7 flex flex-wrap gap-2"><Chip className="bg-mint/15"><Building2 className="mr-1" size={12}/>{company?.name ?? "Client"}</Chip><Chip>{campaign.status}</Chip></div>
      <h1 className="mt-3 text-3xl font-black">{campaign.name}</h1>
      {campaign.notes && <p className="mt-2 text-sm text-ink/50">{campaign.notes}</p>}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Card className="p-4"><p className="text-xs text-ink/40">Approved</p><p className="mt-1 text-2xl font-black">{approved}</p></Card>
        <Card className="p-4"><p className="text-xs text-ink/40">Needs review</p><p className="mt-1 text-2xl font-black">{review}</p></Card>
        <Card className="p-4"><p className="text-xs text-ink/40">Billable now</p><p className="mt-1 text-2xl font-black">€{(billable/100).toFixed(2)}</p></Card>
        <Card className="p-4"><p className="text-xs text-ink/40">Potential refund</p><p className="mt-1 text-2xl font-black">€{(refund/100).toFixed(2)}</p></Card>
      </div>
      <AdminCampaignControls campaignId={campaign.id} status={campaign.status}/>

      <div className="mt-8 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-ink/40">Store checks</p><h2 className="text-2xl font-black">{(jobs ?? []).length} checks</h2></div><Link href={`/${params.locale}/client`} className="text-xs font-black underline">Add checks</Link></div>
      <div className="mt-4 space-y-3">
        {(jobs ?? []).map((job: any) => {
          const store: any = storeMap.get(job.store_id);
          const jobReservations = (reservations ?? []).filter((r: any) => r.job_id === job.id).length;
          const jobSubmissions = (submissions ?? []).filter((s: any) => s.job_id === job.id);
          const canDelete = jobReservations === 0 && jobSubmissions.length === 0;
          return <Card key={job.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{job.title}</p><p className="mt-1 flex items-center gap-1 text-xs text-ink/45"><MapPin size={12}/>{store?.chain ?? "Store"} · {store?.address ?? ""}</p></div><div className="text-right"><p className="font-black">€{(job.reward_cents/100).toFixed(2)}</p><p className="text-[10px] text-ink/40">~{job.estimated_minutes} min</p></div></div><div className="mt-3 flex gap-2"><Chip>{job.published ? "Published" : "Unpublished"}</Chip><Chip>{jobReservations} reservations</Chip><Chip><ImageIcon className="mr-1" size={11}/>{jobSubmissions.length} results</Chip></div><AdminJobControls jobId={job.id} published={job.published} canDelete={canDelete}/></Card>;
        })}
        {(jobs ?? []).length === 0 && <Card className="p-6 text-center"><p className="font-black">No checks attached yet</p><p className="mt-2 text-sm text-ink/45">Create the campaign first, then add store checks.</p></Card>}
      </div>
    </section>
  );
}
