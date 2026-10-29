"use client";

import {
  useState,
} from "react";
import {
  Plus,
  MapPin,
  Euro,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";
import {
  supabase,
} from "@/lib/supabase";
import {
  Button,
  Card,
  Chip,
} from "./ui";
import {
  StoreMapPicker,
} from "./store-map-picker";

const jobTypes = [
  "Audit",
  "Survey",
  "Buy & try",
  "Rating & review",
  "Eye spy",
  "Scavenger hunt",
  "Mystery shop",
];

export function CreateJob() {
  const [
    chain,
    setChain,
  ] = useState("");

  const [
    address,
    setAddress,
  ] = useState("");

  const [
    latitude,
    setLatitude,
  ] =
    useState<number | null>(
      null
    );

  const [
    longitude,
    setLongitude,
  ] =
    useState<number | null>(
      null
    );

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    jobType,
    setJobType,
  ] = useState("Audit");

  const [
    reward,
    setReward,
  ] = useState("7.50");

  const [
    refund,
    setRefund,
  ] = useState("0");

  const [
    minutes,
    setMinutes,
  ] = useState("12");

  const [
    questions,
    setQuestions,
  ] = useState(
    [
      "Is the display available?",
      "Enter the displayed price",
      "Take a clear photo of the display",
      "Describe any visibility or availability issue",
    ].join("\n")
  );

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    endDate,
    setEndDate,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    created,
    setCreated,
  ] = useState(false);

  function buildSteps() {
    return questions
      .split("\n")
      .map((line) =>
        line.trim()
      )
      .filter(Boolean)
      .map(
        (
          question,
          index
        ) => {
          const lower =
            question.toLowerCase();

          let type =
            "text";

          if (
            lower.includes(
              "photo"
            )
          ) {
            type =
              "photo";
          } else if (
            lower.includes(
              "price"
            )
          ) {
            type =
              "price";
          } else if (
            lower.startsWith(
              "is "
            ) ||
            lower.startsWith(
              "are "
            )
          ) {
            type =
              "single_choice";
          }

          return {
            id: `step-${
              index + 1
            }`,

            type,

            question,

            required: true,

            ...(type ===
            "single_choice"
              ? {
                  options: [
                    "Yes",
                    "No",
                  ],
                }
              : {}),

            ...(type ===
            "text"
              ? {
                  minimum_length:
                    10,
                }
              : {}),

            ...(type ===
            "price"
              ? {
                  currency:
                    "EUR",
                }
              : {}),
          };
        }
      );
  }

  async function createJob() {
    setError("");
    setCreated(false);

    if (
      !chain.trim() ||
      !address.trim() ||
      !title.trim()
    ) {
      setError(
        "Chain, address and mission title are required."
      );

      return;
    }

    if (
      latitude === null ||
      longitude === null
    ) {
      setError(
        "Select the exact store location on the map."
      );

      return;
    }

    const rewardValue =
      Number(reward);

    const refundValue =
      Number(
        refund || "0"
      );

    const minutesValue =
      Number(minutes);

    if (
      !Number.isFinite(
        rewardValue
      ) ||
      rewardValue < 1
    ) {
      setError(
        "Reward must be at least €1."
      );

      return;
    }

    if (
      !Number.isFinite(
        minutesValue
      ) ||
      minutesValue < 1
    ) {
      setError(
        "Enter a valid mission duration."
      );

      return;
    }

    if (
      !startDate ||
      !endDate
    ) {
      setError(
        "Select the mission time window."
      );

      return;
    }

    const start =
      new Date(
        startDate
      );

    const end =
      new Date(
        endDate
      );

    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      ) ||
      end <= start
    ) {
      setError(
        "The mission end time must be after the start time."
      );

      return;
    }

    const steps =
      buildSteps();

    if (
      steps.length === 0
    ) {
      setError(
        "Add at least one mission step."
      );

      return;
    }

    setSubmitting(true);

    const client =
      supabase();

    const {
      error:
        createError,
    } = await client.rpc(
      "create_job_with_store",
      {
        p_chain:
          chain.trim(),

        p_address:
          address.trim(),

        p_lat:
          latitude,

        p_lng:
          longitude,

        p_title:
          title.trim(),

        p_job_type:
          jobType,

        p_reward_cents:
          Math.round(
            rewardValue *
              100
          ),

        p_refund_cents:
          Math.round(
            Math.max(
              Number.isFinite(
                refundValue
              )
                ? refundValue
                : 0,
              0
            ) * 100
          ),

        p_estimated_minutes:
          Math.round(
            minutesValue
          ),

        p_starts_at:
          start.toISOString(),

        p_ends_at:
          end.toISOString(),

        p_steps:
          steps,
      }
    );

    if (createError) {
      setError(
        createError.message
      );

      setSubmitting(
        false
      );

      return;
    }

    setSubmitting(false);
    setCreated(true);
  }

  function resetForm() {
    setCreated(false);

    setChain("");
    setAddress("");
    setLatitude(null);
    setLongitude(null);
    setTitle("");
    setJobType("Audit");
    setReward("7.50");
    setRefund("0");
    setMinutes("12");
    setStartDate("");
    setEndDate("");

    setQuestions(
      [
        "Is the display available?",
        "Enter the displayed price",
        "Take a clear photo of the display",
        "Describe any visibility or availability issue",
      ].join("\n")
    );
  }

  if (created) {
    return (
      <Card className="mt-6 p-7 text-center">
        <CheckCircle2
          className="mx-auto text-mint"
          size={50}
        />

        <h2 className="mt-4 text-2xl font-black">
          Mission published
        </h2>

        <p className="mt-2 text-sm text-ink/55">
          The mission is now
          available to eligible
          Polica agents.
        </p>

        <Button
          type="button"
          className="mt-5 w-full"
          onClick={
            resetForm
          }
        >
          <Plus
            className="mr-2 inline"
            size={18}
          />

          Create another
          mission
        </Button>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <MapPin
            size={20}
          />

          <h2 className="text-xl font-black">
            Store
          </h2>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-bold">
            Chain
          </span>

          <input
            value={chain}
            onChange={(
              event
            ) =>
              setChain(
                event
                  .target
                  .value
              )
            }
            placeholder="Konzum"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-bold">
            Address
          </span>

          <input
            value={
              address
            }
            onChange={(
              event
            ) =>
              setAddress(
                event
                  .target
                  .value
              )
            }
            placeholder="Radnička cesta 49, Zagreb"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>

        <div className="mt-5">
          <p className="mb-3 text-sm font-bold">
            Store location
          </p>

          <StoreMapPicker
            latitude={
              latitude
            }
            longitude={
              longitude
            }
            onChange={(
              newLatitude,
              newLongitude
            ) => {
              setLatitude(
                newLatitude
              );

              setLongitude(
                newLongitude
              );
            }}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-black">
          Mission
        </h2>

        <label className="mt-5 block">
          <span className="text-sm font-bold">
            Mission title
          </span>

          <input
            value={title}
            onChange={(
              event
            ) =>
              setTitle(
                event
                  .target
                  .value
              )
            }
            placeholder="Check beverage display"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>

        <div className="mt-5">
          <p className="text-sm font-bold">
            Job type
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {jobTypes.map(
              (type) => (
                <button
                  type="button"
                  key={
                    type
                  }
                  onClick={() =>
                    setJobType(
                      type
                    )
                  }
                >
                  <Chip
                    className={
                      jobType ===
                      type
                        ? "bg-ink text-white"
                        : "bg-cream"
                    }
                  >
                    {
                      type
                    }
                  </Chip>
                </button>
              )
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label>
            <span className="flex items-center gap-1 text-sm font-bold">
              <Euro
                size={
                  15
                }
              />
              Reward
            </span>

            <input
              type="number"
              min="1"
              step="0.50"
              value={
                reward
              }
              onChange={(
                event
              ) =>
                setReward(
                  event
                    .target
                    .value
                )
              }
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
            />
          </label>

          <label>
            <span className="flex items-center gap-1 text-sm font-bold">
              <Clock
                size={
                  15
                }
              />
              Minutes
            </span>

            <input
              type="number"
              min="1"
              value={
                minutes
              }
              onChange={(
                event
              ) =>
                setMinutes(
                  event
                    .target
                    .value
                )
              }
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-bold">
            Product refund
            (optional)
          </span>

          <input
            type="number"
            min="0"
            step="0.50"
            value={refund}
            onChange={(
              event
            ) =>
              setRefund(
                event
                  .target
                  .value
              )
            }
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-black">
          Task steps
        </h2>

        <p className="mt-2 text-sm text-ink/50">
          Enter one instruction
          per line.
        </p>

        <textarea
          rows={8}
          value={
            questions
          }
          onChange={(
            event
          ) =>
            setQuestions(
              event
                .target
                .value
            )
          }
          className="mt-4 w-full resize-none rounded-2xl border border-black/10 bg-white p-4 outline-none focus:border-mint"
        />

        <p className="mt-3 text-xs text-ink/40">
          Polica recognizes
          photo, price,
          yes/no and text
          steps automatically.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-black">
          Campaign window
        </h2>

        <label className="mt-5 block">
          <span className="text-sm font-bold">
            Starts
          </span>

          <input
            type="datetime-local"
            value={
              startDate
            }
            onChange={(
              event
            ) =>
              setStartDate(
                event
                  .target
                  .value
              )
            }
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-bold">
            Ends
          </span>

          <input
            type="datetime-local"
            value={
              endDate
            }
            onChange={(
              event
            ) =>
              setEndDate(
                event
                  .target
                  .value
              )
            }
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-coral/10 p-4 text-sm text-coral">
          <AlertCircle
            className="shrink-0"
            size={18}
          />

          <p>
            {error}
          </p>
        </div>
      )}

      <Button
        type="button"
        disabled={
          submitting
        }
        className="w-full bg-coral py-4"
        onClick={() =>
          void createJob()
        }
      >
        <Send
          className="mr-2 inline"
          size={18}
        />

        {submitting
          ? "Publishing…"
          : "Publish mission"}
      </Button>
    </div>
  );
}
