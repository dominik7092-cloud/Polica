import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  CheckCircle2,
  Clock3,
  History,
  MapPin,
  Store,
  XCircle,
} from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { ProfilePreferences } from "@/components/profile-preferences-client";
import { PermissionSettingsButton } from "@/components/permission-settings-button";
import { LanguageSelector } from "@/components/language-selector";

type Submission = {
  id: string;
  job_id: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
};

type Job = {
  id: string;
  title: string;
  reward_cents: number;
};

type RegularStore = {
  id: string;
  store_name: string;
  chain: string;
  address: string;
};

export default async function ProfilePage({
  params,
}: {
  params: { locale: string };
}) {
  const t = await getTranslations("profile");
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${params.locale}/auth/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, country_code, nearby_distance_km")
    .eq("id", user.id)
    .single();

  const { data: storeData } = await supabase
    .from("agent_store_preferences")
    .select("id, store_name, chain, address")
    .eq("agent_id", user.id)
    .order("created_at", { ascending: true });

  const regularStores = (storeData ?? []) as RegularStore[];

  const { data: submissionData } = await supabase
    .from("submissions")
    .select("id, job_id, status, rejection_reason, created_at")
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const submissions = (submissionData ?? []) as Submission[];

  const jobIds = Array.from(
    new Set(submissions.map((item) => item.job_id))
  );

  let jobs: Job[] = [];

  if (jobIds.length > 0) {
    const { data } = await supabase
      .from("jobs")
      .select("id, title, reward_cents")
      .in("id", jobIds);

    jobs = (data ?? []) as Job[];
  }

  const jobsById = new Map(
    jobs.map((job) => [job.id, job])
  );

  const firstName =
    profile?.first_name || t("defaultName");

  const initials = firstName
    .slice(0, 2)
    .toUpperCase();

  const approved = submissions.filter(
    (item) => item.status === "approved"
  ).length;

  const pending = submissions.filter(
    (item) =>
      item.status === "submitted" ||
      item.status === "flagged"
  ).length;

  return (
    <section className="px-5 py-8">
      <p className="text-sm font-bold text-ink/45">
        {t("accountLabel")}
      </p>

      <h1 className="text-4xl font-black">
        {t("title")}
      </h1>

      <Card className="mt-6 p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-mint text-xl font-black">
            {initials}
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-black">
              {firstName}
            </h2>

            <p className="mt-1 truncate text-xs text-ink/45">
              {user.email}
            </p>

            <p className="mt-1 text-xs text-ink/35">
              {profile?.country_code || "HR"}
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-8">
        <h2 className="text-xl font-black">
          {t("shoppingTitle")}
        </h2>

        <p className="mt-1 text-sm text-ink/45">
          {t("shoppingDescription")}
        </p>
      </div>

      <ProfilePreferences
        initialDistance={profile?.nearby_distance_km ?? 5}
      />

      <Card className="mt-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
              <Store size={19} />
            </div>

            <div>
              <p className="font-black">
                {t("regularStores")}
              </p>

              <p className="text-xs text-ink/45">
                {t("savedStores", {
                  count: regularStores.length,
                })}
              </p>
            </div>
          </div>

          <Link
            href={`/${params.locale}/onboarding`}
            className="rounded-full bg-cream px-3 py-2 text-xs font-black"
          >
            {t("manage")}
          </Link>
        </div>

        {regularStores.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-black/5 pt-3">
            {regularStores.slice(0, 3).map((store) => (
              <div
                key={store.id}
                className="flex items-start gap-2 text-sm"
              >
                <MapPin
                  className="mt-0.5 shrink-0 text-mint"
                  size={15}
                />

                <div>
                  <p className="font-bold">
                    {store.store_name}
                  </p>

                  <p className="text-xs text-ink/40">
                    {store.address}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-8 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-black">
            {t("checksTitle")}
          </h2>

          <p className="mt-1 text-sm text-ink/45">
            {t("checksDescription")}
          </p>
        </div>

        <div className="flex gap-2">
          <Chip className="bg-mint/15">
            {t("approvedCount", {
              count: approved,
            })}
          </Chip>

          <Chip>
            {t("pendingCount", {
              count: pending,
            })}
          </Chip>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card className="mt-3 p-6 text-center">
          <History
            className="mx-auto text-ink/20"
            size={34}
          />

          <p className="mt-3 font-black">
            {t("noChecks")}
          </p>
        </Card>
      ) : (
        <div className="mt-3 space-y-3">
          {submissions.map((submission) => {
            const job = jobsById.get(
              submission.job_id
            );

            const approvedStatus =
              submission.status === "approved";

            const rejectedStatus =
              submission.status === "rejected";

            const StatusIcon = approvedStatus
              ? CheckCircle2
              : rejectedStatus
                ? XCircle
                : Clock3;

            const statusText = approvedStatus
              ? t("statusApproved")
              : rejectedStatus
                ? t("statusRejected")
                : t("statusUnderReview");

            return (
              <Card
                key={submission.id}
                className="p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                      approvedStatus
                        ? "bg-mint/15 text-mint"
                        : rejectedStatus
                          ? "bg-coral/10 text-coral"
                          : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    <StatusIcon size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-black">
                          {job?.title ||
                            t("quickCheck")}
                        </p>

                        <p className="mt-1 text-xs text-ink/40">
                          {new Date(
                            submission.created_at
                          ).toLocaleDateString(
                            params.locale === "hr"
                              ? "hr-HR"
                              : "en-GB"
                          )}
                        </p>
                      </div>

                      {job && (
                        <p className="shrink-0 font-black">
                          €
                          {(
                            job.reward_cents / 100
                          ).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <Chip
                      className={`mt-2 ${
                        approvedStatus
                          ? "bg-mint/15"
                          : rejectedStatus
                            ? "bg-coral/10 text-coral"
                            : "bg-amber-100"
                      }`}
                    >
                      {statusText}
                    </Chip>

                    {rejectedStatus &&
                      submission.rejection_reason && (
                        <p className="mt-3 rounded-2xl bg-coral/10 p-3 text-xs font-semibold">
                          {
                            submission.rejection_reason
                          }
                        </p>
                      )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-xl font-black">
        {t("accountSection")}
      </h2>

      <LanguageSelector
        currentLocale={params.locale === "hr" ? "hr" : "en"}
        title={t("language")}
        croatianLabel={t("croatian")}
        englishLabel={t("english")}
      />

      <h2 className="mb-3 mt-8 text-xl font-black">
        {t("privacySection")}
      </h2>

      <PermissionSettingsButton
        title={t("cameraLocation")}
        description={t("cameraLocationDescription")}
      />
    </section>
  );
}
