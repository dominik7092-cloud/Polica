import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowDownToLine,
  Clock3,
  CheckCircle2,
  WalletCards,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
} from "@/components/ui";

export default async function WalletPage({
  params,
}: {
  params: {
    locale: string;
  };
}) {
  const supabase =
    createClient();

  // -----------------------------------
  // AUTHENTICATION
  // -----------------------------------

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/${params.locale}/auth/login`
    );
  }

  // -----------------------------------
  // LOAD REAL WALLET ENTRIES
  // -----------------------------------

  const {
    data: entries,
    error: walletError,
  } = await supabase
    .from("wallet_entries")
    .select(`
      id,
      submission_id,
      amount_cents,
      status,
      created_at
    `)
    .eq("agent_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (walletError) {
    console.error(
      "Unable to load wallet:",
      walletError
    );
  }

  // -----------------------------------
  // LOAD SUBMISSIONS
  // -----------------------------------

  const submissionIds =
    Array.from(
      new Set(
        (entries ?? [])
          .map(
            (entry) =>
              entry.submission_id
          )
          .filter(Boolean)
      )
    );

  let submissions: {
    id: string;
    job_id: string;
  }[] = [];

  if (
    submissionIds.length > 0
  ) {
    const {
      data:
        submissionsData,
    } = await supabase
      .from("submissions")
      .select(
        "id, job_id"
      )
      .in(
        "id",
        submissionIds
      );

    submissions =
      submissionsData ?? [];
  }

  // -----------------------------------
  // LOAD JOB NAMES
  // -----------------------------------

  const jobIds =
    Array.from(
      new Set(
        submissions
          .map(
            (submission) =>
              submission.job_id
          )
          .filter(Boolean)
      )
    );

  let jobs: {
    id: string;
    title: string;
  }[] = [];

  if (jobIds.length > 0) {
    const {
      data: jobsData,
    } = await supabase
      .from("jobs")
      .select(
        "id, title"
      )
      .in("id", jobIds);

    jobs = jobsData ?? [];
  }

  const submissionsById =
    new Map(
      submissions.map(
        (submission) => [
          submission.id,
          submission,
        ]
      )
    );

  const jobsById =
    new Map(
      jobs.map((job) => [
        job.id,
        job,
      ])
    );

  // -----------------------------------
  // CALCULATE REAL BALANCES
  // -----------------------------------

  const availableCents =
    (entries ?? [])
      .filter(
        (entry) =>
          entry.status ===
          "available"
      )
      .reduce(
        (total, entry) =>
          total +
          entry.amount_cents,
        0
      );

  const pendingCents =
    (entries ?? [])
      .filter(
        (entry) =>
          entry.status ===
          "pending"
      )
      .reduce(
        (total, entry) =>
          total +
          entry.amount_cents,
        0
      );

  const availableBalance =
    availableCents / 100;

  const pendingBalance =
    pendingCents / 100;

  const minimumWithdrawal =
    10;

  const canWithdraw =
    availableBalance >=
    minimumWithdrawal;

  function getJobTitle(
    submissionId:
      | string
      | null
  ) {
    if (!submissionId) {
      return "Wallet adjustment";
    }

    const submission =
      submissionsById.get(
        submissionId
      );

    if (!submission) {
      return "Mission reward";
    }

    const job =
      jobsById.get(
        submission.job_id
      );

    return (
      job?.title ||
      "Mission reward"
    );
  }

  // -----------------------------------
  // UI
  // -----------------------------------

  return (
    <section className="px-5 py-8">
      <p className="text-sm font-bold text-ink/45">
        Your money
      </p>

      <h1 className="text-4xl font-black">
        Wallet
      </h1>

      <Card className="mt-6 bg-ink p-6 text-white">
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/55">
            Available balance
          </p>

          <WalletCards
            className="text-mint"
            size={22}
          />
        </div>

        <p className="mt-1 text-5xl font-black">
          €
          {availableBalance.toFixed(
            2
          )}
        </p>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-sm text-white/65">
            Pending
          </span>

          <b>
            €
            {pendingBalance.toFixed(
              2
            )}
          </b>
        </div>

        <Button
          disabled={
            !canWithdraw
          }
          className="mt-5 w-full bg-mint text-ink"
        >
          <ArrowDownToLine
            className="mr-2 inline"
            size={18}
          />

          Withdraw to IBAN
        </Button>

        <p className="mt-3 text-center text-[11px] text-white/45">
          {canWithdraw
            ? "Eligible for withdrawal"
            : `Minimum withdrawal €${minimumWithdrawal.toFixed(
                2
              )}`}
        </p>
      </Card>

      {/* --------------------------------
          WALLET ACTIVITY
      -------------------------------- */}

      <div className="mb-3 mt-8 flex items-end justify-between">
        <h2 className="text-xl font-black">
          Activity
        </h2>

        <span className="text-xs font-bold text-ink/40">
          {entries?.length ??
            0}{" "}
          transactions
        </span>
      </div>

      {!entries ||
      entries.length === 0 ? (
        <Card className="p-7 text-center">
          <WalletCards
            className="mx-auto text-ink/20"
            size={38}
          />

          <h3 className="mt-3 font-black">
            No earnings yet
          </h3>

          <p className="mt-2 text-sm text-ink/50">
            Approved mission rewards
            will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map(
            (entry) => {
              const available =
                entry.status ===
                "available";

              const pending =
                entry.status ===
                "pending";

              return (
                <Card
                  key={
                    entry.id
                  }
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="flex min-w-0 gap-3">
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                        available
                          ? "bg-mint/20 text-mint"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {available ? (
                        <CheckCircle2
                          size={
                            20
                          }
                        />
                      ) : (
                        <Clock3
                          size={
                            20
                          }
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {getJobTitle(
                          entry.submission_id
                        )}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <Chip
                          className={
                            available
                              ? "bg-mint/15 px-2 py-1"
                              : pending
                                ? "bg-amber-100 px-2 py-1"
                                : "px-2 py-1"
                          }
                        >
                          {
                            entry.status
                          }
                        </Chip>

                        <span className="text-[10px] text-ink/35">
                          {new Date(
                            entry.created_at
                          ).toLocaleDateString(
                            params.locale ===
                              "hr"
                              ? "hr-HR"
                              : "en-GB"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="shrink-0 text-lg font-black text-mint">
                    +€
                    {(
                      entry.amount_cents /
                      100
                    ).toFixed(
                      2
                    )}
                  </p>
                </Card>
              );
            }
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-white p-4 text-xs leading-relaxed text-ink/55">
        Mission rewards appear
        after submission approval.
        Withdrawals become available
        once your eligible balance
        reaches €10.
      </div>
    </section>
  );
}
