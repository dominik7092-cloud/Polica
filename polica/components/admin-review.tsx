"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  CheckCircle2,
  XCircle,
  MapPin,
  Camera,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Button,
  Card,
  Chip,
} from "./ui";

type Submission = {
  id: string;
  job_id: string;
  agent_id: string;
  status: string;
  answers: Record<string, unknown>;
  captured_lat: number | null;
  captured_lng: number | null;
  captured_at: string | null;
  gps_distance_m: number | null;
  gps_verified: boolean | null;
  rejection_reason: string | null;
  created_at: string;
};

type Job = {
  id: string;
  title: string;
  reward_cents: number;
};

type Profile = {
  id: string;
  first_name: string | null;
};

type ReviewItem = Submission & {
  jobTitle: string;
  reward: number;
  agentName: string;
  photoUrl: string | null;
};

export function AdminReview() {
  const [items, setItems] =
    useState<ReviewItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    expandedId,
    setExpandedId,
  ] = useState<string | null>(null);

  const [
    reviewingId,
    setReviewingId,
  ] = useState<string | null>(null);

  const [
    rejectingId,
    setRejectingId,
  ] = useState<string | null>(null);

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

  const loadSubmissions =
    useCallback(async () => {
      setLoading(true);
      setError("");

      const client = supabase();

      const {
        data: submissionsData,
        error: submissionsError,
      } = await client
        .from("submissions")
        .select(`
          id,
          job_id,
          agent_id,
          status,
          answers,
          captured_lat,
          captured_lng,
          captured_at,
          gps_distance_m,
          gps_verified,
          rejection_reason,
          created_at
        `)
        .in("status", [
          "submitted",
          "flagged",
        ])
        .order("created_at", {
          ascending: false,
        });

      if (submissionsError) {
        setError(
          submissionsError.message
        );
        setLoading(false);
        return;
      }

      const submissions =
        (submissionsData ??
          []) as Submission[];

      if (
        submissions.length === 0
      ) {
        setItems([]);
        setLoading(false);
        return;
      }

      const jobIds = Array.from(
        new Set(
          submissions.map(
            (submission) =>
              submission.job_id
          )
        )
      );

      const agentIds =
        Array.from(
          new Set(
            submissions.map(
              (submission) =>
                submission.agent_id
            )
          )
        );

      const [
        jobsResult,
        profilesResult,
      ] = await Promise.all([
        client
          .from("jobs")
          .select(
            "id, title, reward_cents"
          )
          .in("id", jobIds),

        client
          .from("profiles")
          .select(
            "id, first_name"
          )
          .in("id", agentIds),
      ]);

      const jobs =
        (jobsResult.data ??
          []) as Job[];

      const profiles =
        (profilesResult.data ??
          []) as Profile[];

      const jobsById =
        new globalThis.Map(
          jobs.map((job) => [
            job.id,
            job,
          ])
        );

      const profilesById =
        new globalThis.Map(
          profiles.map(
            (profile) => [
              profile.id,
              profile,
            ]
          )
        );

      const reviewItems =
        await Promise.all(
          submissions.map(
            async (
              submission
            ): Promise<ReviewItem> => {
              const job =
                jobsById.get(
                  submission.job_id
                );

              const profile =
                profilesById.get(
                  submission.agent_id
                );

              const photoPath =
                typeof submission
                  .answers
                  ?.photo_path ===
                "string"
                  ? submission.answers
                      .photo_path
                  : null;

              let photoUrl:
                | string
                | null = null;

              if (photoPath) {
                const {
                  data:
                    signedData,
                } =
                  await client.storage
                    .from(
                      "job-evidence"
                    )
                    .createSignedUrl(
                      photoPath,
                      600
                    );

                photoUrl =
                  signedData
                    ?.signedUrl ??
                  null;
              }

              return {
                ...submission,
                jobTitle:
                  job?.title ??
                  "Unknown job",
                reward:
                  (job?.reward_cents ??
                    0) / 100,
                agentName:
                  profile?.first_name ||
                  "Agent",
                photoUrl,
              };
            }
          )
        );

      setItems(reviewItems);
      setLoading(false);
    }, []);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  async function approve(
    submission: ReviewItem
  ) {
    setReviewingId(
      submission.id
    );
    setError("");

    const client = supabase();

    const { error: reviewError } =
      await client.rpc(
        "review_submission",
        {
          p_submission:
            submission.id,
          p_decision:
            "approve",
          p_reason: null,
        }
      );

    if (reviewError) {
      setError(
        reviewError.message
      );
      setReviewingId(null);
      return;
    }

    setItems((current) =>
      current.filter(
        (item) =>
          item.id !==
          submission.id
      )
    );

    setExpandedId(null);
    setReviewingId(null);
  }

  async function reject(
    submission: ReviewItem
  ) {
    const reason =
      rejectionReason.trim();

    if (reason.length < 5) {
      setError(
        "Enter a rejection reason of at least 5 characters."
      );
      return;
    }

    setReviewingId(
      submission.id
    );
    setError("");

    const client = supabase();

    const { error: reviewError } =
      await client.rpc(
        "review_submission",
        {
          p_submission:
            submission.id,
          p_decision:
            "reject",
          p_reason: reason,
        }
      );

    if (reviewError) {
      setError(
        reviewError.message
      );
      setReviewingId(null);
      return;
    }

    setItems((current) =>
      current.filter(
        (item) =>
          item.id !==
          submission.id
      )
    );

    setRejectingId(null);
    setRejectionReason("");
    setExpandedId(null);
    setReviewingId(null);
  }

  if (loading) {
    return (
      <Card className="mt-4 p-6 text-center">
        <RefreshCw
          className="mx-auto animate-spin text-mint"
          size={26}
        />

        <p className="mt-3 font-bold">
          Loading submissions…
        </p>
      </Card>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink/40">
            Mission control
          </p>

          <h2 className="text-2xl font-black">
            Review queue
          </h2>
        </div>

        <Chip
          className={
            items.length > 0
              ? "bg-coral/10 text-coral"
              : "bg-mint/20 text-ink"
          }
        >
          {items.length} pending
        </Chip>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-coral/10 p-4 text-sm text-coral">
          <AlertTriangle
            className="shrink-0"
            size={18}
          />

          <p>{error}</p>
        </div>
      )}

      {items.length === 0 ? (
        <Card className="mt-4 p-7 text-center">
          <CheckCircle2
            className="mx-auto text-mint"
            size={42}
          />

          <h3 className="mt-3 text-xl font-black">
            Queue clear
          </h3>

          <p className="mt-2 text-sm text-ink/50">
            There are no submissions
            waiting for review.
          </p>
        </Card>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((item) => {
            const expanded =
              expandedId ===
              item.id;

            const flagged =
              item.status ===
              "flagged";

            const availability =
              String(
                item.answers
                  ?.availability ??
                  "Not provided"
              );

            const price =
              typeof item.answers
                ?.price_eur ===
              "number"
                ? `€${item.answers.price_eur.toFixed(
                    2
                  )}`
                : "Not provided";

            const observation =
              String(
                item.answers
                  ?.observation ??
                  "No observation"
              );

            return (
              <Card
                key={item.id}
                className="overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(
                      expanded
                        ? null
                        : item.id
                    )
                  }
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Chip
                        className={
                          flagged
                            ? "bg-coral/10 text-coral"
                            : "bg-mint/20 text-ink"
                        }
                      >
                        {flagged
                          ? "GPS flagged"
                          : "Submitted"}
                      </Chip>

                      <h3 className="mt-3 font-black">
                        {
                          item.jobTitle
                        }
                      </h3>

                      <p className="mt-1 text-xs text-ink/45">
                        {
                          item.agentName
                        }{" "}
                        · €
                        {item.reward.toFixed(
                          2
                        )}
                      </p>
                    </div>

                    {expanded ? (
                      <ChevronUp
                        size={20}
                      />
                    ) : (
                      <ChevronDown
                        size={20}
                      />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-black/5 p-4">
                    {item.photoUrl ? (
                      <img
                        src={
                          item.photoUrl
                        }
                        alt="Mission evidence"
                        className="aspect-[4/3] w-full rounded-2xl bg-cream object-cover"
                      />
                    ) : (
                      <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-cream">
                        <div className="text-center">
                          <Camera
                            className="mx-auto text-ink/30"
                            size={34}
                          />

                          <p className="mt-2 text-xs text-ink/45">
                            Evidence
                            photo not
                            available
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-cream p-4">
                        <p className="text-[10px] font-bold uppercase text-ink/40">
                          Availability
                        </p>

                        <p className="mt-1 font-black">
                          {
                            availability
                          }
                        </p>
                      </div>

                      <div className="rounded-2xl bg-cream p-4">
                        <p className="text-[10px] font-bold uppercase text-ink/40">
                          Price
                        </p>

                        <p className="mt-1 font-black">
                          {price}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-cream p-4">
                      <p className="text-[10px] font-bold uppercase text-ink/40">
                        Observation
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {
                          observation
                        }
                      </p>
                    </div>

                    <div
                      className={`mt-3 rounded-2xl p-4 ${
                        item.gps_verified
                          ? "bg-mint/10"
                          : "bg-coral/10"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <MapPin
                          className={
                            item.gps_verified
                              ? "text-mint"
                              : "text-coral"
                          }
                          size={20}
                        />

                        <div>
                          <p className="font-black">
                            {item.gps_verified
                              ? "GPS verified"
                              : "GPS requires review"}
                          </p>

                          <p className="mt-1 text-xs text-ink/50">
                            Distance
                            from store:{" "}
                            {item.gps_distance_m ??
                              "Unknown"}{" "}
                            m
                          </p>

                          {item.captured_at && (
                            <p className="mt-1 text-xs text-ink/50">
                              Captured:{" "}
                              {new Date(
                                item.captured_at
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl bg-ink p-4 text-white">
                      <p className="text-xs text-white/50">
                        Reward on
                        approval
                      </p>

                      <p className="mt-1 text-3xl font-black">
                        €
                        {item.reward.toFixed(
                          2
                        )}
                      </p>
                    </div>

                    {rejectingId ===
                    item.id ? (
                      <div className="mt-4">
                        <label className="text-sm font-bold">
                          Rejection
                          reason
                        </label>

                        <textarea
                          rows={4}
                          value={
                            rejectionReason
                          }
                          onChange={(
                            event
                          ) =>
                            setRejectionReason(
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Explain what needs to be corrected"
                          className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white p-4 outline-none focus:border-coral"
                        />

                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            className="flex-1 bg-white text-ink shadow-sm"
                            onClick={() => {
                              setRejectingId(
                                null
                              );
                              setRejectionReason(
                                ""
                              );
                            }}
                          >
                            Cancel
                          </Button>

                          <Button
                            type="button"
                            disabled={
                              reviewingId ===
                              item.id
                            }
                            className="flex-1 bg-coral"
                            onClick={() =>
                              void reject(
                                item
                              )
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          className="bg-white text-coral shadow-sm"
                          onClick={() => {
                            setRejectingId(
                              item.id
                            );
                            setRejectionReason(
                              ""
                            );
                          }}
                        >
                          <XCircle
                            className="mr-2 inline"
                            size={17}
                          />
                          Reject
                        </Button>

                        <Button
                          type="button"
                          disabled={
                            reviewingId ===
                            item.id
                          }
                          className="bg-mint text-ink"
                          onClick={() =>
                            void approve(
                              item
                            )
                          }
                        >
                          <CheckCircle2
                            className="mr-2 inline"
                            size={17}
                          />

                          {reviewingId ===
                          item.id
                            ? "Approving…"
                            : `Approve €${item.reward.toFixed(
                                2
                              )}`}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
