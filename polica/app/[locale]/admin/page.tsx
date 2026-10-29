import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AlertTriangle,
  Banknote,
  Users,
  ShieldBan,
  Activity,
  LogIn,
} from "lucide-react";
import {
  Card,
  Chip,
} from "@/components/ui";
import { AdminReview } from "@/components/admin-review";

export default async function AdminPage({
  params,
}: {
  params: {
    locale: string;
  };
}) {
  const supabase =
    createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/${params.locale}/auth/login`
    );
  }

  const { data: profile } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (
    profile?.role !== "admin"
  ) {
    redirect(
      `/${params.locale}/jobs`
    );
  }

  const { data: users } =
    await supabase
      .from("profiles")
      .select(`
        id,
        first_name,
        country_code,
        role,
        approved_jobs,
        banned_at,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      });

  const {
    data: activities,
  } = await supabase
    .from("activity_events")
    .select(`
      id,
      user_id,
      event_type,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  const {
    data: submissions,
  } = await supabase
    .from("submissions")
    .select("id, status")
    .in("status", [
      "submitted",
      "flagged",
    ]);

  const {
    data: payouts,
  } = await supabase
    .from("payouts")
    .select("id, status")
    .in("status", [
      "requested",
      "processing",
    ]);

  const registeredUsers =
    users?.length ?? 0;

  const bannedUsers =
    users?.filter(
      (person) =>
        Boolean(
          person.banned_at
        )
    ).length ?? 0;

  const reviewCount =
    submissions?.length ?? 0;

  const payoutCount =
    payouts?.length ?? 0;

  function getUserName(
    userId: string | null
  ) {
    if (!userId) {
      return "Deleted user";
    }

    const person =
      users?.find(
        (candidate) =>
          candidate.id ===
          userId
      );

    return (
      person?.first_name ||
      "User"
    );
  }

  function activityLabel(
    eventType: string
  ) {
    switch (eventType) {
      case "login":
        return "Logged in";

      case "job_reserved":
        return "Reserved a job";

      case "job_submitted":
        return "Submitted a mission";

      case "submission_approved":
        return "Submission approved";

      case "submission_rejected":
        return "Submission rejected";

      case "payout_requested":
        return "Payout requested";

      case "payout_paid":
        return "Payout completed";

      default:
        return eventType.replaceAll(
          "_",
          " "
        );
    }
  }

  return (
    <section className="px-5 py-8">
      <p className="text-sm font-bold text-coral">
        Admin console
      </p>

      <h1 className="text-4xl font-black">
        Operations
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <AlertTriangle
            size={20}
          />

          <p className="mt-3 text-2xl font-black">
            {reviewCount}
          </p>

          <p className="text-xs font-bold text-ink/45">
            Review queue
          </p>
        </Card>

        <Card className="p-4">
          <Banknote
            size={20}
          />

          <p className="mt-3 text-2xl font-black">
            {payoutCount}
          </p>

          <p className="text-xs font-bold text-ink/45">
            Payouts
          </p>
        </Card>

        <Card className="p-4">
          <Users size={20} />

          <p className="mt-3 text-2xl font-black">
            {
              registeredUsers
            }
          </p>

          <p className="text-xs font-bold text-ink/45">
            Users
          </p>
        </Card>

        <Card className="p-4">
          <ShieldBan
            size={20}
          />

          <p className="mt-3 text-2xl font-black">
            {bannedUsers}
          </p>

          <p className="text-xs font-bold text-ink/45">
            Banned
          </p>
        </Card>
      </div>

      <AdminReview />

      <div className="mt-10 flex items-center gap-2">
        <Activity size={20} />

        <h2 className="text-xl font-black">
          Recent activity
        </h2>
      </div>

      <div className="mt-3 space-y-3">
        {activities &&
        activities.length >
          0 ? (
          activities.map(
            (event) => (
              <Card
                key={event.id}
                className="p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/20">
                    <LogIn
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="font-black">
                      {getUserName(
                        event.user_id
                      )}
                    </p>

                    <p className="text-sm text-ink/60">
                      {activityLabel(
                        event.event_type
                      )}
                    </p>

                    <p className="mt-1 text-xs text-ink/40">
                      {new Date(
                        event.created_at
                      ).toLocaleString(
                        params.locale ===
                          "hr"
                          ? "hr-HR"
                          : "en-GB"
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            )
          )
        ) : (
          <Card className="p-4">
            <p className="text-sm text-ink/50">
              No activity
              recorded yet.
            </p>
          </Card>
        )}
      </div>

      <h2 className="mb-3 mt-10 text-xl font-black">
        Registered users
      </h2>

      <div className="space-y-3">
        {users?.map(
          (person) => (
            <Card
              key={person.id}
              className="p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black">
                    {person.first_name ||
                      "Incomplete profile"}
                  </p>

                  <p className="mt-1 text-xs text-ink/45">
                    {person.country_code ||
                      "No country"}{" "}
                    ·{" "}
                    {
                      person.role
                    }
                  </p>
                </div>

                <Chip
                  className={
                    person.banned_at
                      ? "bg-coral/10 text-coral"
                      : "bg-mint/20 text-ink"
                  }
                >
                  {person.banned_at
                    ? "Banned"
                    : "Active"}
                </Chip>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/5 pt-3">
                <div>
                  <p className="text-xs text-ink/45">
                    Approved jobs
                  </p>

                  <p className="mt-1 font-black">
                    {person.approved_jobs ??
                      0}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-ink/45">
                    Role
                  </p>

                  <p className="mt-1 font-black capitalize">
                    {
                      person.role
                    }
                  </p>
                </div>
              </div>
            </Card>
          )
        )}
      </div>
    </section>
  );
}
