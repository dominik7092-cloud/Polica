import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EarningsClient } from "@/components/earnings-client";

export default async function WalletPage({
  params,
}: {
  params: { locale: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${params.locale}/auth/login`);
  }

  const { data: walletData } = await supabase
    .from("wallet_entries")
    .select("id, submission_id, amount_cents, status, created_at")
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false });

  const walletEntries = walletData ?? [];
  const submissionIds = walletEntries
    .map((entry) => entry.submission_id)
    .filter((id): id is string => Boolean(id));

  let submissions: { id: string; job_id: string }[] = [];
  if (submissionIds.length > 0) {
    const { data } = await supabase
      .from("submissions")
      .select("id, job_id")
      .in("id", submissionIds);
    submissions = data ?? [];
  }

  const jobIds = Array.from(new Set(submissions.map((item) => item.job_id)));
  let jobs: { id: string; title: string }[] = [];
  if (jobIds.length > 0) {
    const { data } = await supabase
      .from("jobs")
      .select("id, title")
      .in("id", jobIds);
    jobs = data ?? [];
  }

  const submissionsById = new Map(submissions.map((item) => [item.id, item]));
  const jobsById = new Map(jobs.map((item) => [item.id, item]));

  const available = walletEntries
    .filter((entry) => entry.status === "available")
    .reduce((sum, entry) => sum + entry.amount_cents, 0) / 100;

  const pending = walletEntries
    .filter((entry) => entry.status === "pending")
    .reduce((sum, entry) => sum + entry.amount_cents, 0) / 100;

  const entries = walletEntries.map((entry) => {
    const submission = entry.submission_id
      ? submissionsById.get(entry.submission_id)
      : null;
    const job = submission ? jobsById.get(submission.job_id) : null;

    return {
      id: entry.id,
      title: job?.title ?? "Quick check reward",
      amount: entry.amount_cents / 100,
      status: entry.status,
      date: new Date(entry.created_at).toLocaleDateString(
        params.locale === "hr" ? "hr-HR" : "en-GB"
      ),
    };
  });

  return <EarningsClient available={available} pending={pending} entries={entries} />;
}
