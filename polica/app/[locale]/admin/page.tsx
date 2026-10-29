import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AlertTriangle,
  Banknote,
  Users,
  ShieldBan,
  LogIn,
  Activity,
} from "lucide-react";
import { Card, Button, Chip } from "@/components/ui";

export default async function AdminPage({
  params,
}: {
  params: { locale: string };
}) {
  const supabase = createClient();

  // Check whether user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${params.locale}/auth/login`);
  }

  // Check whether logged-in user is an admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect(`/${params.locale}/jobs`);
  }

  // Load real Polica users
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select(
      "id, first_name, country_code, role, approved_jobs, banned_at, created_at"
    )
    .order("created_at", { ascending: false });

  if (usersError) {
    console.error("Unable to load users:", usersError);
  }

  // Load recent activity
  const { data: activities, error: activitiesError } = await supabase
    .from("activity_events")
    .select(
      "id, user_id, event_type, entity_type, entity_id, metadata, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (activitiesError) {
    console.error("Unable to load activity:", activitiesError);
  }

  const registeredUsers = users?.length ?? 0;

  const bannedUsers =
    users?.filter((person) => person.banned_at !== null).length ?? 0;

  function getUserName(userId: string | null) {
    if (!userId) {
      return "Deleted user";
    }

    const person = users?.find(
      (registeredUser) => registeredUser.id === userId
    );

    return person?.first_name || "Unknown user";
  }

  function getActivityLabel(eventType: string) {
    switch (eventType) {
      case "login":
        return "Logged in";
      case "account_created":
        return "Created account";
      case "job_reserved":
        return "Reserved a job";
      case "job_submitted":
        return "Submitted a job";
      case "submission_approved":
        return "Submission approved";
      case "submission_rejected":
        return "Submission rejected";
      case "payout_requested":
        return "Requested payout";
      case "payout_paid":
        return "Payout completed";
      default:
        return eventType.replaceAll("_", " ");
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

      {/* Dashboard cards */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <AlertTriangle size={20} />

          <p className="mt-3 text-2xl font-black">
            9
          </p>

          <p className="text-xs font-bold text-ink/45">
            Flagged
          </p>
        </Card>

        <Card className="p-4">
          <Banknote size={20} />

          <p className="mt-3 text-2xl font-black">
            14
          </p>

          <p className="text-xs font-bold text-ink/45">
            Payouts
          </p>
        </Card>

        <Card className="p-4">
          <Users size={20} />

          <p className="mt-3 text-2xl font-black">
            {registeredUsers}
          </p>

          <p className="text-xs font-bold text-ink/45">
            Users
          </p>
        </Card>

        <Card className="p-4">
          <ShieldBan size={20} />

          <p className="mt-3 text-2xl font-black">
            {bannedUsers}
          </p>

          <p className="text-xs font-bold text-ink/45">
            Banned
          </p>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="mt-8 flex items-center gap-2">
        <Activity size={20} />

        <h2 className="text-xl font-black">
          Recent activity
        </h2>
      </div>

      <div className="mt-3 space-y-3">
        {activities && activities.length > 0 ? (
          activities.map((event) => (
            <Card
              key={event.id}
              className="p-4"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/20">
                  <LogIn size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">
                        {getUserName(event.user_id)}
                      </p>

                      <p className="text-sm text-ink/60">
                        {getActivityLabel(event.event_type)}
                      </p>
                    </div>

                    <Chip>
                      {event.event_type}
                    </Chip>
                  </div>

                  <p className="mt-2 text-xs text-ink/40">
                    {new Date(event.created_at).toLocaleString(
                      params.locale === "hr"
                        ? "hr-HR"
                        : "en-GB"
                    )}
                  </p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-4">
            <p className="text-sm text-ink/50">
              No activity recorded yet.
            </p>
          </Card>
        )}
      </div>

      {/* Registered users */}
      <h2 className="mb-3 mt-8 text-xl font-black">
        Registered users
      </h2>

      <div className="space-y-3">
        {users && users.length > 0 ? (
          users.map((person) => (
            <Card
              key={person.id}
              className="p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black">
                    {person.first_name || "Incomplete profile"}
                  </p>

                  <p className="mt-1 text-xs text-ink/45">
                    {person.country_code || "No country"} ·{" "}
                    {person.role}
                  </p>
                </div>

                <Chip
                  className={
                    person.banned_at
                      ? "bg-coral/10 text-coral"
                      : "bg-mint/20 text-ink"
                  }
                >
                  {person.banned_at ? "Banned" : "Active"}
                </Chip>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/5 pt-3">
                <div>
                  <p className="text-xs text-ink/45">
                    Approved jobs
                  </p>

                  <p className="mt-1 font-black">
                    {person.approved_jobs ?? 0}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-ink/45">
                    Role
                  </p>

                  <p className="mt-1 font-black capitalize">
                    {person.role}
                  </p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-4">
            <p className="text-sm text-ink/50">
              No registered users found.
            </p>
          </Card>
        )}
      </div>

      {/* Still demo data for now */}
      <h2 className="mb-3 mt-8 text-xl font-black">
        Flagged submissions
      </h2>

      <Card className="mb-3 p-4">
        <div className="flex justify-between gap-4">
          <div>
            <Chip className="bg-coral/10 text-coral">
              Needs review
            </Chip>

            <h3 className="mt-2 font-black">
              GPS 1.8 km from store
            </h3>

            <p className="text-xs text-ink/45">
              Demo submission
            </p>
          </div>

          <Button className="self-center px-4 py-2 text-xs">
            Review
          </Button>
        </div>
      </Card>
    </section>
  );
}
