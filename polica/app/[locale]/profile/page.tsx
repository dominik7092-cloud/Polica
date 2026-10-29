import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ShieldCheck,
  Download,
  Trash2,
  ChevronRight,
  Award,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  XCircle,
  MapPin,
  History,
} from "lucide-react";
import { Card, Chip } from "@/components/ui";

type Submission = {
  id: string;
  job_id: string;
  status: string;
  gps_verified: boolean | null;
  gps_distance_m: number | null;
  rejection_reason: string | null;
  created_at: string;
};

type Job = {
  id: string;
  title: string;
  reward_cents: number;
};

type WalletEntry = {
  submission_id: string | null;
  amount_cents: number;
  status: string;
};

export default async function ProfilePage({
  params,
}: {
  params: {
    locale: string;
  };
}) {
  const supabase = createClient();

  // --------------------------------
  // AUTH
  // --------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/${params.locale}/auth/login`
    );
  }

  // --------------------------------
  // PROFILE
  // --------------------------------

  const { data: profile } =
    await supabase
      .from("profiles")
      .select(`
        first_name,
        country_code,
        role,
        approved_jobs
      `)
      .eq("id", user.id)
      .single();

  // --------------------------------
  // SUBMISSION HISTORY
  // --------------------------------

  const {
    data: submissionData,
  } = await supabase
    .from("submissions")
    .select(`
      id,
      job_id,
      status,
      gps_verified,
      gps_distance_m,
      rejection_reason,
      created_at
    `)
    .eq("agent_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  const submissions =
    (submissionData ??
      []) as Submission[];

  // --------------------------------
  // JOB DETAILS
  // --------------------------------

  const jobIds = Array.from(
    new Set(
      submissions.map(
        (submission) =>
          submission.job_id
      )
    )
  );

  let jobs: Job[] = [];

  if (jobIds.length > 0) {
    const {
      data: jobData,
    } = await supabase
      .from("jobs")
      .select(`
        id,
        title,
        reward_cents
      `)
      .in("id", jobIds);

    jobs =
      (jobData ?? []) as Job[];
  }

  // --------------------------------
  // WALLET REWARDS
  // --------------------------------

  const submissionIds =
    submissions.map(
      (submission) =>
        submission.id
    );

  let walletEntries:
    WalletEntry[] = [];

  if (
    submissionIds.length > 0
  ) {
    const {
      data: walletData,
    } = await supabase
      .from("wallet_entries")
      .select(`
        submission_id,
        amount_cents,
        status
      `)
      .eq(
        "agent_id",
        user.id
      )
      .in(
        "submission_id",
        submissionIds
      );

    walletEntries =
      (walletData ??
        []) as WalletEntry[];
  }

  const jobsById =
    new globalThis.Map(
      jobs.map((job) => [
        job.id,
        job,
      ])
    );

  const walletBySubmission =
    new globalThis.Map(
      walletEntries
        .filter(
          (entry) =>
            entry.submission_id
        )
        .map((entry) => [
          entry.submission_id as string,
          entry,
        ])
    );

  // --------------------------------
  // AGENT LEVEL
  // --------------------------------

  const approvedJobs =
    profile?.approved_jobs ??
    0;

  let agentLevel = "New agent";
  let jobsUntilNextLevel =
    Math.max(
      5 - approvedJobs,
      0
    );

  let progressPercent =
    Math.min(
      (approvedJobs / 5) *
        100,
      100
    );

  if (approvedJobs >= 20) {
    agentLevel =
      "Senior agent";

    jobsUntilNextLevel = 0;

    progressPercent = 100;
  } else if (
    approvedJobs >= 5
  ) {
    agentLevel =
      "Regular agent";

    jobsUntilNextLevel =
      20 -
      approvedJobs;

    progressPercent =
      Math.min(
        ((approvedJobs -
          5) /
          15) *
          100,
        100
      );
  }

  const firstName =
    profile?.first_name ||
    "Agent";

  const initials =
    firstName
      .slice(0, 2)
      .toUpperCase();

  function getStatusDetails(
    status: string
  ) {
    switch (status) {
      case "approved":
        return {
          label:
            "Approved",
          icon:
            CheckCircle2,
          chip:
            "bg-mint/20 text-ink",
          iconColor:
            "text-mint",
        };

      case "rejected":
        return {
          label:
            "Rejected",
          icon:
            XCircle,
          chip:
            "bg-coral/10 text-coral",
          iconColor:
            "text-coral",
        };

      case "flagged":
        return {
          label:
            "GPS review",
          icon:
            AlertTriangle,
          chip:
            "bg-amber-100 text-amber-700",
          iconColor:
            "text-amber-500",
        };

      default:
        return {
          label:
            "Under review",
          icon:
            Clock3,
          chip:
            "bg-blue-50 text-blue-700",
          iconColor:
            "text-blue-500",
        };
    }
  }

  return (
    <section className="px-5 py-8">
      <p className="text-sm font-bold text-ink/45">
        Account
      </p>

      <h1 className="text-4xl font-black">
        Profile
      </h1>

      {/* PROFILE CARD */}

      <Card className="mt-6 p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-mint text-xl font-black">
            {initials}
          </div>

          <div>
            <h2 className="text-xl font-black">
              {firstName}
            </h2>

            <p className="mt-1 text-xs text-ink/45">
              {profile?.country_code ||
                "No country"}
            </p>

            <Chip className="mt-2 bg-amber-100">
              <Award
                size={13}
                className="mr-1"
              />

              {agentLevel}
            </Chip>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-cream">
          <div
            className="h-full rounded-full bg-mint"
            style={{
              width: `${progressPercent}%`,
            }}
          />
        </div>

        <p className="mt-2 text-xs text-ink/50">
          {approvedJobs} approved{" "}
          {approvedJobs === 1
            ? "job"
            : "jobs"}

          {jobsUntilNextLevel >
            0 &&
            ` · ${jobsUntilNextLevel} more to next level`}
        </p>
      </Card>

      {/* MISSION HISTORY */}

      <div className="mt-9 flex items-center gap-2">
        <History size={20} />

        <h2 className="text-xl font-black">
          Mission history
        </h2>
      </div>

      <p className="mt-1 text-sm text-ink/45">
        Track your submitted,
        approved and rejected
        missions.
      </p>

      {submissions.length ===
      0 ? (
        <Card className="mt-4 p-7 text-center">
          <History
            className="mx-auto text-ink/20"
            size={38}
          />

          <h3 className="mt-3 font-black">
            No missions yet
          </h3>

          <p className="mt-2 text-sm text-ink/50">
            Your completed
            missions will appear
            here.
          </p>
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {submissions.map(
            (submission) => {
              const job =
                jobsById.get(
                  submission.job_id
                );

              const walletEntry =
                walletBySubmission.get(
                  submission.id
                );

              const status =
                getStatusDetails(
                  submission.status
                );

              const StatusIcon =
                status.icon;

              return (
                <Card
                  key={
                    submission.id
                  }
                  className="p-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream ${status.iconColor}`}
                    >
                      <StatusIcon
                        size={21}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-black">
                            {job?.title ||
                              "Mission"}
                          </h3>

                          <p className="mt-1 text-xs text-ink/40">
                            {new Date(
                              submission.created_at
                            ).toLocaleDateString(
                              params.locale ===
                                "hr"
                                ? "hr-HR"
                                : "en-GB"
                            )}
                          </p>
                        </div>

                        {walletEntry ? (
                          <p className="shrink-0 text-lg font-black text-mint">
                            +€
                            {(
                              walletEntry.amount_cents /
                              100
                            ).toFixed(
                              2
                            )}
                          </p>
                        ) : job ? (
                          <p className="shrink-0 text-sm font-black text-ink/40">
                            €
                            {(
                              job.reward_cents /
                              100
                            ).toFixed(
                              2
                            )}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Chip
                          className={
                            status.chip
                          }
                        >
                          {
                            status.label
                          }
                        </Chip>

                        {submission.gps_verified ? (
                          <Chip className="bg-mint/10 text-ink">
                            <MapPin
                              className="mr-1"
                              size={12}
                            />
                            GPS verified
                          </Chip>
                        ) : submission.gps_distance_m !==
                          null ? (
                          <Chip className="bg-amber-100 text-amber-700">
                            <MapPin
                              className="mr-1"
                              size={12}
                            />
                            GPS flagged
                          </Chip>
                        ) : null}
                      </div>

                      {submission.status ===
                        "rejected" &&
                        submission.rejection_reason && (
                          <div className="mt-3 rounded-2xl bg-coral/10 p-3">
                            <p className="text-[10px] font-bold uppercase text-coral">
                              Rejection
                              reason
                            </p>

                            <p className="mt-1 text-sm font-semibold">
                              {
                                submission.rejection_reason
                              }
                            </p>
                          </div>
                        )}

                      {submission.status ===
                        "flagged" &&
                        submission.gps_distance_m !==
                          null && (
                          <p className="mt-3 text-xs text-ink/45">
                            GPS recorded{" "}
                            {
                              submission.gps_distance_m
                            }{" "}
                            m from the
                            assigned store.
                          </p>
                        )}

                      {submission.status ===
                        "approved" &&
                        walletEntry && (
                          <p className="mt-3 text-xs font-semibold text-ink/45">
                            Reward added to
                            your Wallet.
                          </p>
                        )}
                    </div>
                  </div>
                </Card>
              );
            }
          )}
        </div>
      )}

      {/* PRIVACY */}

      <h2 className="mb-3 mt-9 font-black">
        Privacy & safety
      </h2>

      <Card className="mb-3 flex items-center gap-3 p-4">
        <ShieldCheck
          size={20}
        />

        <div className="flex-1">
          <p className="font-bold">
            Privacy controls
          </p>

          <p className="text-xs text-ink/45">
            Manage photo and
            location preferences
          </p>
        </div>

        <ChevronRight
          size={18}
        />
      </Card>

      <Card className="mb-3 flex items-center gap-3 p-4">
        <Download size={20} />

        <div className="flex-1">
          <p className="font-bold">
            Export my data
          </p>

          <p className="text-xs text-ink/45">
            Download a portable
            copy of your Polica
            data
          </p>
        </div>

        <ChevronRight
          size={18}
        />
      </Card>

      <Card className="mb-3 flex items-center gap-3 p-4">
        <Trash2 size={20} />

        <div className="flex-1">
          <p className="font-bold">
            Delete account
          </p>

          <p className="text-xs text-ink/45">
            Request permanent
            account deletion
          </p>
        </div>

        <ChevronRight
          size={18}
        />
      </Card>

      <div className="mt-5 rounded-2xl bg-coral/10 p-4 text-xs leading-relaxed">
        <b>
          Stay scam-aware.
        </b>{" "}
        Polica will never ask you
        to pay to access a job.
        Earnings may be taxable;
        check your national tax
        authority.
      </div>
    </section>
  );
}
