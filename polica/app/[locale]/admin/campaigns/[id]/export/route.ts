import { NextResponse } from "next/server";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";

function safeName(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "campaign";
}

export async function GET(
  _request: Request,
  { params }: { params: { locale: string; id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id,name,budget_cents,client_price_per_result_cents,target_results,company_id,companies(name)")
    .eq("id", params.id)
    .single();
  if (!campaign) return new NextResponse("Campaign not found", { status: 404 });

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id,title,job_type,reward_cents,store_id")
    .eq("campaign_id", params.id);

  const jobIds = (jobs ?? []).map((job) => job.id);
  const storeIds = Array.from(new Set((jobs ?? []).map((job) => job.store_id)));

  const { data: stores } = storeIds.length
    ? await supabase.from("stores").select("id,chain,address").in("id", storeIds)
    : { data: [] as any[] };

  const { data: submissions } = jobIds.length
    ? await supabase
        .from("submissions")
        .select("id,job_id,status,answers,photo_path,gps_verified,gps_distance_m,created_at")
        .in("job_id", jobIds)
        .order("created_at", { ascending: true })
    : { data: [] as any[] };

  const jobsById = new Map((jobs ?? []).map((job) => [job.id, job]));
  const storesById = new Map((stores ?? []).map((store) => [store.id, store]));
  const company: any = Array.isArray((campaign as any).companies)
    ? (campaign as any).companies[0]
    : (campaign as any).companies;

  const approved = (submissions ?? []).filter((item) => item.status === "approved").length;
  const billableCents = approved * campaign.client_price_per_result_cents;
  const refundCents = Math.max(campaign.budget_cents - billableCents, 0);

  const rows = (submissions ?? []).map((submission: any) => {
    const job: any = jobsById.get(submission.job_id);
    const store: any = job ? storesById.get(job.store_id) : null;
    const answers = submission.answers && typeof submission.answers === "object" ? submission.answers : {};
    return {
      "Submission ID": submission.id,
      "Status": submission.status,
      "Retailer": store?.chain ?? "",
      "Store address": store?.address ?? "",
      "Check": job?.title ?? "",
      "Check type": job?.job_type ?? "",
      "Shopper reward EUR": job ? job.reward_cents / 100 : "",
      "Availability": answers.availability ?? "",
      "Price EUR": answers.price_eur ?? "",
      "Observation": answers.observation ?? "",
      "GPS verified": submission.gps_verified ? "Yes" : "No",
      "GPS distance m": submission.gps_distance_m ?? "",
      "Completed": submission.created_at,
      "Evidence file": submission.photo_path ?? "",
    };
  });

  const summaryRows = [
    { Metric: "Company", Value: company?.name ?? "" },
    { Metric: "Campaign", Value: campaign.name },
    { Metric: "Target results", Value: campaign.target_results },
    { Metric: "Approved results", Value: approved },
    { Metric: "Budget EUR", Value: campaign.budget_cents / 100 },
    { Metric: "Client price/result EUR", Value: campaign.client_price_per_result_cents / 100 },
    { Metric: "Billable now EUR", Value: billableCents / 100 },
    { Metric: "Potential refund EUR", Value: refundCents / 100 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Results");
  const workbookBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const zip = new JSZip();
  zip.file("results.xlsx", workbookBuffer);
  const pictures = zip.folder("pictures");

  for (const submission of submissions ?? []) {
    if (!submission.photo_path) continue;
    const job: any = jobsById.get(submission.job_id);
    const store: any = job ? storesById.get(job.store_id) : null;
    const { data, error } = await supabase.storage.from("job-evidence").download(submission.photo_path);
    if (error || !data) continue;
    const bytes = new Uint8Array(await data.arrayBuffer());
    const folder = pictures?.folder(safeName(`${store?.chain ?? "Store"}_${store?.address ?? job?.title ?? submission.id}`));
    folder?.file(`${submission.id}.jpg`, bytes);
  }

  const output = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
  const filename = `${safeName(company?.name ?? "Client")}_${safeName(campaign.name)}.zip`;

  return new NextResponse(output, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
