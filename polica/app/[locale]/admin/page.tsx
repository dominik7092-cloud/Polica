import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Activity,
  AlertTriangle,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  LogIn,
  MapPinned,
  Plus,
  ShieldBan,
  Users,
} from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { AdminReview } from "@/components/admin-review";
import { AdminJobControls, AdminUserControls } from "@/components/admin-controls";

type AdminJob = {
  id: string;
  store_id: string;
  title: string;
  job_type: string;
  reward_cents: number;
  estimated_minutes: number;
  published: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

type StoreRow = { id: string; chain: string | null; address: string };
type ActivityRow = { id: string; user_id: string | null; event_type: string; created_at: string };

export default async function AdminPage({ params }: { params: { locale: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/auth/login`);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect(`/${params.locale}/jobs`);

  const { data: users } = await supabase
    .from("profiles")
    .select("id, first_name, country_code, role, approved_jobs, banned_at, created_at")
    .order("created_at", { ascending: false });

  const { data: activities } = await supabase
    .from("activity_events")
    .select("id, user_id, event_type, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, job_id, status")
    .order("created_at", { ascending: false });

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, status")
    .in("status", ["requested", "processing"]);

  const { data: jobsData } = await supabase
    .from("jobs")
    .select("id, store_id, title, job_type, reward_cents, estimated_minutes, published, starts_at, ends_at")
    .order("starts_at", { ascending: false });
  const jobs = (jobsData ?? []) as AdminJob[];

  const storeIds = Array.from(new Set(jobs.map((job) => job.store_id)));
  let stores: StoreRow[] = [];
  if (storeIds.length > 0) {
    const { data } = await supabase.from("stores").select("id, chain, address").in("id", storeIds);
    stores = (data ?? []) as StoreRow[];
  }

  const { data: reservations } = await supabase.from("reservations").select("id, job_id");
  const { count: locationCount } = await supabase
    .from("retail_locations")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  const storesById = new Map(stores.map((store) => [store.id, store]));
  const jobActivity = new Map<string, { reservations: number; submissions: number }>();
  for (const job of jobs) jobActivity.set(job.id, { reservations: 0, submissions: 0 });
  for (const reservation of reservations ?? []) {
    const item = jobActivity.get(reservation.job_id);
    if (item) item.reservations += 1;
  }
  for (const submission of submissions ?? []) {
    const item = jobActivity.get(submission.job_id);
    if (item) item.submissions += 1;
  }

  const registeredUsers = users?.length ?? 0;
  const bannedUsers = users?.filter((person) => Boolean(person.banned_at)).length ?? 0;
  const reviewCount = submissions?.filter((item) => ["submitted", "flagged"].includes(item.status)).length ?? 0;
  const payoutCount = payouts?.length ?? 0;
  const activeJobs = jobs.filter((job) => job.published).length;
  const completedJobs = submissions?.filter((item) => item.status === "approved").length ?? 0;

  function getUserName(userId: string | null) {
    if (!userId) return "Deleted user";
    return users?.find((candidate) => candidate.id === userId)?.first_name || "User";
  }

  function activityLabel(eventType: string) {
    return eventType.replaceAll("_", " ");
  }

  return (
    <section className="px-5 py-8">
      <p className="text-sm font-bold text-coral">Polica Admin</p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">Control center</h1>
          <p className="mt-2 text-sm text-ink/50">Operate campaigns, checks, users, submissions and payouts.</p>
        </div>
        <Link href={`/${params.locale}/client`} className="shrink-0 rounded-2xl bg-coral px-4 py-3 text-xs font-black text-white">
          <Plus className="mr-1 inline" size={15} /> Create campaign
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card className="p-4"><BriefcaseBusiness size={20} /><p className="mt-3 text-2xl font-black">{activeJobs}</p><p className="text-xs font-bold text-ink/45">Published checks</p></Card>
        <Card className="p-4"><AlertTriangle size={20} /><p className="mt-3 text-2xl font-black">{reviewCount}</p><p className="text-xs font-bold text-ink/45">Needs review</p></Card>
        <Card className="p-4"><Banknote size={20} /><p className="mt-3 text-2xl font-black">{payoutCount}</p><p className="text-xs font-bold text-ink/45">Payout requests</p></Card>
        <Card className="p-4"><Users size={20} /><p className="mt-3 text-2xl font-black">{registeredUsers}</p><p className="text-xs font-bold text-ink/45">Users</p></Card>
        <Card className="p-4"><CheckCircle2 size={20} /><p className="mt-3 text-2xl font-black">{completedJobs}</p><p className="text-xs font-bold text-ink/45">Approved results</p></Card>
        <Card className="p-4"><MapPinned size={20} /><p className="mt-3 text-2xl font-black">{locationCount ?? 0}</p><p className="text-xs font-bold text-ink/45">Active locations</p></Card>
      </div>

      <div className="mt-10 grid gap-3">
        <Link href={`/${params.locale}/admin/campaigns`} className="rounded-3xl bg-ink p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-mint">Campaign management</p>
          <h2 className="mt-2 text-2xl font-black">Open campaigns</h2>
          <p className="mt-2 text-sm text-white/60">Filter by client and status, pause campaigns, and open store-level results without scrolling through every check.</p>
        </Link>
        <Link href={`/${params.locale}/client`} className="rounded-3xl bg-coral p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">Quick action</p>
          <h2 className="mt-2 text-2xl font-black">Create checks</h2>
          <p className="mt-2 text-sm text-white/70">Use the existing multi-store creator while the new campaign creation screen is connected.</p>
        </Link>
      </div>

      <div className="mt-10"><p className="text-xs font-bold uppercase tracking-widest text-ink/40">Quality control</p><h2 className="text-2xl font-black">Submission review</h2></div>
      <AdminReview />

      <div className="mt-10 flex items-center gap-2"><Activity size={20} /><h2 className="text-xl font-black">Recent activity</h2></div>
      <div className="mt-3 space-y-3">
        {(activities as ActivityRow[] | null)?.length ? (activities as ActivityRow[]).map((event) => (
          <Card key={event.id} className="p-4"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/20"><LogIn size={18} /></div><div><p className="font-black">{getUserName(event.user_id)}</p><p className="text-sm capitalize text-ink/60">{activityLabel(event.event_type)}</p><p className="mt-1 text-xs text-ink/40">{new Date(event.created_at).toLocaleString(params.locale === "hr" ? "hr-HR" : "en-GB")}</p></div></div></Card>
        )) : <Card className="p-4"><p className="text-sm text-ink/50">No activity recorded yet.</p></Card>}
      </div>

      <div className="mt-10 flex items-center gap-2"><Building2 size={20} /><h2 className="text-xl font-black">Users</h2></div>
      <div className="mt-3 space-y-3">
        {users?.map((person) => (
          <Card key={person.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div><p className="font-black">{person.first_name || "Incomplete profile"}</p><p className="mt-1 text-xs text-ink/45">{person.country_code || "No country"} · {person.role}</p></div>
              <Chip className={person.banned_at ? "bg-coral/10 text-coral" : "bg-mint/20 text-ink"}>{person.banned_at ? "Suspended" : "Active"}</Chip>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/5 pt-3">
              <div><p className="text-xs text-ink/45">Approved checks</p><p className="mt-1 font-black">{person.approved_jobs ?? 0}</p></div>
              <div><p className="text-xs text-ink/45">Role</p><p className="mt-1 font-black capitalize">{person.role}</p></div>
            </div>
            <AdminUserControls userId={person.id} banned={Boolean(person.banned_at)} isSelf={person.id === user.id} />
          </Card>
        ))}
      </div>

      <div className="mt-10 rounded-3xl bg-ink p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-mint">Admin note</p>
        <h2 className="mt-2 text-xl font-black">Keep shopper Polica simple.</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">Use this control center for operational complexity. Shoppers should only need nearby checks, Finish and Earnings.</p>
      </div>
    </section>
  );
}
