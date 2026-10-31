import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Camera, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Chip } from "@/components/ui";

type EvidenceRow = {
  id: string;
  job_id: string;
  submission_id: string;
  photo_path: string;
  created_at: string;
};

type JobRow = {
  id: string;
  title: string;
  store_id: string;
};

type StoreRow = {
  id: string;
  chain: string | null;
  address: string;
};

type SubmissionRow = {
  id: string;
  status: string;
  gps_verified: boolean | null;
};

export default async function CampaignPicturesPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${params.locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect(`/${params.locale}/jobs`);

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, company_id, companies(name)")
    .eq("id", params.id)
    .single();

  if (!campaign) notFound();

  const { data: evidenceData } = await supabase
    .from("campaign_evidence")
    .select("id, job_id, submission_id, photo_path, created_at")
    .eq("campaign_id", params.id)
    .order("created_at", { ascending: false });

  const evidence = (evidenceData ?? []) as EvidenceRow[];
  const jobIds = Array.from(new Set(evidence.map((item) => item.job_id)));
  const submissionIds = Array.from(
    new Set(evidence.map((item) => item.submission_id))
  );

  let jobs: JobRow[] = [];
  let submissions: SubmissionRow[] = [];

  if (jobIds.length > 0) {
    const { data } = await supabase
      .from("jobs")
      .select("id, title, store_id")
      .in("id", jobIds);
    jobs = (data ?? []) as JobRow[];
  }

  if (submissionIds.length > 0) {
    const { data } = await supabase
      .from("submissions")
      .select("id, status, gps_verified")
      .in("id", submissionIds);
    submissions = (data ?? []) as SubmissionRow[];
  }

  const storeIds = Array.from(new Set(jobs.map((job) => job.store_id)));
  let stores: StoreRow[] = [];

  if (storeIds.length > 0) {
    const { data } = await supabase
      .from("stores")
      .select("id, chain, address")
      .in("id", storeIds);
    stores = (data ?? []) as StoreRow[];
  }

  const signedUrls = new Map<string, string>();
  if (evidence.length > 0) {
    const { data } = await supabase.storage
      .from("job-evidence")
      .createSignedUrls(
        evidence.map((item) => item.photo_path),
        60 * 60
      );

    for (const item of data ?? []) {
      if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl);
    }
  }

  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const storesById = new Map(stores.map((store) => [store.id, store]));
  const submissionsById = new Map(
    submissions.map((submission) => [submission.id, submission])
  );
  const company = Array.isArray((campaign as any).companies)
    ? (campaign as any).companies[0]
    : (campaign as any).companies;

  return (
    <section className="px-5 py-8">
      <Link
        href={`/${params.locale}/admin/campaigns/${params.id}`}
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm"
      >
        <ArrowLeft size={16} /> Campaign
      </Link>

      <p className="mt-7 text-sm font-bold text-coral">{company?.name ?? "Client"}</p>
      <h1 className="text-4xl font-black">Campaign pictures</h1>
      <p className="mt-2 text-sm text-ink/50">
        {campaign.name} · {evidence.length} evidence pictures
      </p>

      {evidence.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <Camera className="mx-auto text-ink/20" size={42} />
          <h2 className="mt-3 text-xl font-black">No pictures yet</h2>
          <p className="mt-2 text-sm text-ink/45">
            Pictures appear here after checks linked to this campaign are submitted.
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {evidence.map((item) => {
            const job = jobsById.get(item.job_id);
            const store = job ? storesById.get(job.store_id) : null;
            const submission = submissionsById.get(item.submission_id);
            const url = signedUrls.get(item.photo_path);

            return (
              <Card key={item.id} className="overflow-hidden p-0">
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt={`Evidence for ${job?.title ?? "campaign check"}`}
                      className="aspect-square w-full object-cover"
                    />
                  </a>
                ) : (
                  <div className="grid aspect-square place-items-center bg-cream">
                    <Camera className="text-ink/20" size={32} />
                  </div>
                )}

                <div className="p-3">
                  <p className="truncate text-sm font-black">
                    {job?.title ?? "Campaign check"}
                  </p>
                  <p className="mt-1 flex items-start gap-1 text-[10px] text-ink/45">
                    <MapPin className="mt-0.5 shrink-0" size={11} />
                    <span className="line-clamp-2">
                      {store?.chain ?? "Store"} · {store?.address ?? ""}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Chip className="px-2 py-1 text-[10px]">
                      {submission?.status ?? "submitted"}
                    </Chip>
                    {submission?.gps_verified && (
                      <Chip className="bg-mint/15 px-2 py-1 text-[10px]">
                        GPS ✓
                      </Chip>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
