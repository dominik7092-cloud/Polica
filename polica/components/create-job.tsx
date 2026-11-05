"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Euro,
  GripVertical,
  Plus,
  Send,
  Store,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Chip } from "./ui";
import {
  RetailLocationMultiPicker,
  type RetailLocation,
} from "./retail-location-multi-picker";

type StepType = "single_choice" | "price" | "photo" | "text" | "rating";

type EditableStep = {
  id: string;
  type: StepType;
  question: string;
  required: boolean;
  options: string[];
  minimumLength: number;
  currency: string;
};

type JobTemplate = {
  label: string;
  jobType: string;
  title: string;
  reward: string;
  minutes: string;
  steps: EditableStep[];
};

const MAX_STEPS = 5;

function createStep(
  type: StepType = "single_choice",
  question = "",
  overrides: Partial<EditableStep> = {},
): EditableStep {
  return {
    id: crypto.randomUUID(),
    type,
    question,
    required: true,
    options: type === "single_choice" ? ["Yes", "No"] : [],
    minimumLength: 10,
    currency: "EUR",
    ...overrides,
  };
}

const templates: JobTemplate[] = [
  {
    label: "Availability check",
    jobType: "Audit",
    title: "Check product availability",
    reward: "3.00",
    minutes: "5",
    steps: [
      createStep("single_choice", "Is the requested product available on shelf?"),
      createStep("photo", "Take a clear photo of the complete shelf section."),
    ],
  },
  {
    label: "Price check",
    jobType: "Price check",
    title: "Check product price",
    reward: "3.00",
    minutes: "5",
    steps: [
      createStep("price", "Enter the displayed shelf price."),
      createStep("photo", "Take a photo showing the product and price label together."),
    ],
  },
  {
    label: "Photo / shelf check",
    jobType: "Eye spy",
    title: "Photograph the shelf",
    reward: "3.50",
    minutes: "6",
    steps: [
      createStep("photo", "Take a clear photo of the complete relevant shelf."),
    ],
  },
  {
    label: "Display / POSM check",
    jobType: "Display check",
    title: "Check promotional display",
    reward: "4.00",
    minutes: "7",
    steps: [
      createStep("single_choice", "Is the promotional display present?"),
      createStep("single_choice", "Is the display correctly assembled and stocked?"),
      createStep("photo", "Take a front-facing photo of the complete display."),
      createStep("text", "Describe any visibility, stock, or execution issue."),
    ],
  },
  {
    label: "Share of shelf",
    jobType: "Share of shelf",
    title: "Check shelf share",
    reward: "5.00",
    minutes: "10",
    steps: [
      createStep("photo", "Photograph the full category shelf from left to right."),
      createStep("text", "Enter the number of facings for the requested brand."),
      createStep("text", "Enter the estimated total number of category facings."),
    ],
  },
  {
    label: "Mystery store check",
    jobType: "Mystery shop",
    title: "Complete a mystery store check",
    reward: "7.50",
    minutes: "12",
    steps: [
      createStep("rating", "Rate the overall store execution from 1 to 5."),
      createStep("single_choice", "Was the requested product easy to find?"),
      createStep("text", "Describe the most important observation."),
      createStep("photo", "Take the required evidence photo."),
    ],
  },
  {
    label: "Custom check",
    jobType: "Custom",
    title: "",
    reward: "3.00",
    minutes: "5",
    steps: [createStep("single_choice", "")],
  },
];

const stepTypeOptions: { value: StepType; label: string }[] = [
  { value: "single_choice", label: "Choice" },
  { value: "price", label: "Price" },
  { value: "photo", label: "Photo" },
  { value: "text", label: "Text answer" },
  { value: "rating", label: "1–5 rating" },
];

function cloneTemplateSteps(steps: EditableStep[]) {
  return steps.map((step) => ({
    ...step,
    id: crypto.randomUUID(),
    options: [...step.options],
  }));
}

export function CreateJob() {
  const campaignId = useSearchParams().get("campaign");
  const [selectedLocations, setSelectedLocations] = useState<RetailLocation[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("Availability check");
  const initialTemplate = templates[0];
  const [title, setTitle] = useState(initialTemplate.title);
  const [jobType, setJobType] = useState(initialTemplate.jobType);
  const [reward, setReward] = useState(initialTemplate.reward);
  const [refund, setRefund] = useState("0");
  const [minutes, setMinutes] = useState(initialTemplate.minutes);
  const [steps, setSteps] = useState<EditableStep[]>(
    cloneTemplateSteps(initialTemplate.steps),
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdCount, setCreatedCount] = useState<number | null>(null);

  const selectedRetailers = useMemo(
    () =>
      Array.from(
        new Set(
          selectedLocations.map((location) => location.retailer).filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "hr")),
    [selectedLocations],
  );

  function applyTemplate(template: JobTemplate) {
    setSelectedTemplate(template.label);
    setJobType(template.jobType);
    setTitle(template.title);
    setReward(template.reward);
    setMinutes(template.minutes);
    setSteps(cloneTemplateSteps(template.steps));
    setError("");
  }

  function updateStep(id: string, patch: Partial<EditableStep>) {
    setSteps((current) =>
      current.map((step) => {
        if (step.id !== id) return step;
        if (patch.type) {
          return {
            ...step,
            ...patch,
            options:
              patch.type === "single_choice"
                ? step.options.length >= 2
                  ? step.options
                  : ["Yes", "No"]
                : [],
          };
        }
        return { ...step, ...patch };
      }),
    );
  }

  function addStep() {
    if (steps.length >= MAX_STEPS) return;
    setSteps((current) => [...current, createStep("single_choice", "")]);
  }

  function removeStep(id: string) {
    if (steps.length === 1) return;
    setSteps((current) => current.filter((step) => step.id !== id));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addChoice(stepId: string) {
    const step = steps.find((item) => item.id === stepId);
    if (!step || step.options.length >= 6) return;
    updateStep(stepId, { options: [...step.options, ""] });
  }

  function updateChoice(stepId: string, optionIndex: number, value: string) {
    const step = steps.find((item) => item.id === stepId);
    if (!step) return;
    updateStep(stepId, {
      options: step.options.map((option, index) =>
        index === optionIndex ? value : option,
      ),
    });
  }

  function removeChoice(stepId: string, optionIndex: number) {
    const step = steps.find((item) => item.id === stepId);
    if (!step || step.options.length <= 2) return;
    updateStep(stepId, {
      options: step.options.filter((_, index) => index !== optionIndex),
    });
  }

  function buildSteps() {
    return steps.map((step, index) => ({
      id: `step-${index + 1}`,
      type: step.type,
      question: step.question.trim(),
      required: step.required,
      ...(step.type === "single_choice"
        ? { options: step.options.map((option) => option.trim()).filter(Boolean) }
        : {}),
      ...(step.type === "text"
        ? { minimum_length: Math.max(1, Math.round(step.minimumLength || 1)) }
        : {}),
      ...(step.type === "price" ? { currency: step.currency || "EUR" } : {}),
    }));
  }

  async function publish() {
    setError("");
    setCreatedCount(null);

    if (!campaignId) {
      setError("Campaign ID is missing. Open this page from the campaign flow and try again.");
      return;
    }
    if (selectedLocations.length === 0) {
      setError("Select at least one retail location.");
      return;
    }
    if (!title.trim()) {
      setError("Mission title is required.");
      return;
    }
    if (steps.length < 1 || steps.length > MAX_STEPS) {
      setError("A mission must contain between 1 and 5 steps.");
      return;
    }
    const incompleteStep = steps.find((step) => !step.question.trim());
    if (incompleteStep) {
      setError("Every mission step needs a question or instruction.");
      return;
    }
    const invalidChoice = steps.find(
      (step) =>
        step.type === "single_choice" &&
        step.options.map((option) => option.trim()).filter(Boolean).length < 2,
    );
    if (invalidChoice) {
      setError("Every choice step needs at least two answer options.");
      return;
    }

    const rewardValue = Number(reward);
    const refundValue = Number(refund || "0");
    const minutesValue = Number(minutes);
    if (!Number.isFinite(rewardValue) || rewardValue < 1) {
      setError("Reward must be at least €1.");
      return;
    }
    if (!Number.isFinite(minutesValue) || minutesValue < 1) {
      setError("Enter a valid mission duration.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Select the campaign time window.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setError("The campaign end time must be after the start time.");
      return;
    }

    setSubmitting(true);
    const client = supabase();
    const { data, error: publishError } = await client.rpc(
      "create_campaign_jobs_for_retail_locations",
      {
        p_campaign: campaignId,
        p_location_ids: selectedLocations.map((location) => location.id),
        p_title: title.trim(),
        p_job_type: jobType,
        p_reward_cents: Math.round(rewardValue * 100),
        p_refund_cents: Math.round(
          Math.max(Number.isFinite(refundValue) ? refundValue : 0, 0) * 100,
        ),
        p_estimated_minutes: Math.round(minutesValue),
        p_starts_at: start.toISOString(),
        p_ends_at: end.toISOString(),
        p_steps: buildSteps(),
      },
    );

    if (publishError) {
      setError(publishError.message);
      setSubmitting(false);
      return;
    }

    setCreatedCount(typeof data === "number" ? data : selectedLocations.length);
    setSubmitting(false);
  }

  function reset() {
    setCreatedCount(null);
    setSelectedLocations([]);
    setRefund("0");
    setStartDate("");
    setEndDate("");
    applyTemplate(templates[0]);
  }

  if (createdCount !== null) {
    return (
      <Card className="mt-6 p-7 text-center">
        <CheckCircle2 className="mx-auto text-mint" size={50} />
        <h2 className="mt-4 text-2xl font-black">Campaign published</h2>
        <p className="mt-2 text-sm text-ink/55">
          {createdCount} individual missions were created for the selected retail locations.
        </p>
        <Button type="button" className="mt-5 w-full" onClick={reset}>
          <Plus className="mr-2 inline" size={18} />
          Create another mission
        </Button>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Store size={20} />
          <h2 className="text-xl font-black">Campaign locations</h2>
        </div>
        <p className="mt-2 text-sm text-ink/50">
          Select stores. Polica creates one independently reservable mission for every selected location.
        </p>
        <div className="mt-5">
          <RetailLocationMultiPicker
            value={selectedLocations}
            onChange={setSelectedLocations}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-black">1. Choose the job</h2>
        <p className="mt-2 text-sm text-ink/50">
          Start with a template, then edit every question and setting below.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {templates.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => applyTemplate(template)}
              className={`rounded-2xl border p-3 text-left text-sm font-black ${
                selectedTemplate === template.label
                  ? "border-mint bg-mint/15"
                  : "border-black/10 bg-white"
              }`}
            >
              {template.label}
            </button>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-bold">Mission title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Check promotional display"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-bold">Internal job type</span>
          <input
            value={jobType}
            onChange={(event) => setJobType(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label>
            <span className="flex items-center gap-1 text-sm font-bold">
              <Euro size={15} /> Reward/store
            </span>
            <input
              type="number"
              min="1"
              step="0.50"
              value={reward}
              onChange={(event) => setReward(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
            />
          </label>
          <label>
            <span className="flex items-center gap-1 text-sm font-bold">
              <Clock size={15} /> Minutes
            </span>
            <input
              type="number"
              min="1"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-bold">Product refund/store (optional)</span>
          <input
            type="number"
            min="0"
            step="0.50"
            value={refund}
            onChange={(event) => setRefund(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">2. Mission steps</h2>
            <p className="mt-1 text-sm text-ink/50">
              Use 1 to 5 editable steps. These are exactly what the shopper sees.
            </p>
          </div>
          <Chip>{steps.length}/{MAX_STEPS}</Chip>
        </div>

        <div className="mt-5 space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="rounded-3xl border border-black/10 bg-cream p-4">
              <div className="flex items-center gap-2">
                <GripVertical className="text-ink/25" size={18} />
                <p className="flex-1 font-black">Step {index + 1}</p>
                <button
                  type="button"
                  onClick={() => moveStep(index, -1)}
                  disabled={index === 0}
                  className="rounded-full bg-white p-2 disabled:opacity-25"
                  aria-label="Move step up"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, 1)}
                  disabled={index === steps.length - 1}
                  className="rounded-full bg-white p-2 disabled:opacity-25"
                  aria-label="Move step down"
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => removeStep(step.id)}
                  disabled={steps.length === 1}
                  className="rounded-full bg-coral/10 p-2 text-coral disabled:opacity-25"
                  aria-label="Delete step"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-bold uppercase text-ink/40">Step type</span>
                <select
                  value={step.type}
                  onChange={(event) =>
                    updateStep(step.id, { type: event.target.value as StepType })
                  }
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-mint"
                >
                  {stepTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-bold uppercase text-ink/40">
                  Question or instruction
                </span>
                <textarea
                  rows={3}
                  value={step.question}
                  onChange={(event) =>
                    updateStep(step.id, { question: event.target.value })
                  }
                  placeholder="What should the shopper check?"
                  className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white p-4 outline-none focus:border-mint"
                />
              </label>

              {step.type === "single_choice" && (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase text-ink/40">Answer choices</p>
                  <div className="mt-2 space-y-2">
                    {step.options.map((option, optionIndex) => (
                      <div key={`${step.id}-${optionIndex}`} className="flex gap-2">
                        <input
                          value={option}
                          onChange={(event) =>
                            updateChoice(step.id, optionIndex, event.target.value)
                          }
                          placeholder={`Option ${optionIndex + 1}`}
                          className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-mint"
                        />
                        <button
                          type="button"
                          disabled={step.options.length <= 2}
                          onClick={() => removeChoice(step.id, optionIndex)}
                          className="rounded-2xl bg-white px-3 text-coral disabled:opacity-25"
                          aria-label="Remove option"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {step.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addChoice(step.id)}
                      className="mt-2 text-xs font-black text-coral"
                    >
                      + Add answer choice
                    </button>
                  )}
                </div>
              )}

              {step.type === "text" && (
                <label className="mt-4 block">
                  <span className="text-xs font-bold uppercase text-ink/40">
                    Minimum characters
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={step.minimumLength}
                    onChange={(event) =>
                      updateStep(step.id, {
                        minimumLength: Math.max(1, Number(event.target.value) || 1),
                      })
                    }
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-mint"
                  />
                </label>
              )}

              {step.type === "price" && (
                <label className="mt-4 block">
                  <span className="text-xs font-bold uppercase text-ink/40">Currency</span>
                  <select
                    value={step.currency}
                    onChange={(event) =>
                      updateStep(step.id, { currency: event.target.value })
                    }
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-mint"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="HRK">HRK</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </label>
              )}

              <label className="mt-4 flex items-center justify-between rounded-2xl bg-white p-3">
                <div>
                  <p className="text-sm font-black">Required step</p>
                  <p className="text-xs text-ink/40">Shopper cannot continue without it.</p>
                </div>
                <input
                  type="checkbox"
                  checked={step.required}
                  onChange={(event) =>
                    updateStep(step.id, { required: event.target.checked })
                  }
                  className="h-5 w-5 accent-black"
                />
              </label>
            </div>
          ))}
        </div>

        <Button
          type="button"
          disabled={steps.length >= MAX_STEPS}
          className="mt-4 w-full bg-white text-ink shadow-sm"
          onClick={addStep}
        >
          <Plus className="mr-2 inline" size={18} />
          {steps.length >= MAX_STEPS ? "Maximum 5 steps" : "Add another step"}
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-black">3. Campaign window</h2>
        <label className="mt-5 block">
          <span className="text-sm font-bold">Starts</span>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-bold">Ends</span>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-coral/10 p-4 text-sm text-coral">
          <AlertCircle className="shrink-0" size={18} />
          <p>{error}</p>
        </div>
      )}

      <div className="rounded-2xl bg-ink p-5 text-white">
        <p className="text-xs text-white/50">Campaign summary</p>
        <p className="mt-1 text-2xl font-black">
          {selectedLocations.length} locations · {steps.length} steps
        </p>
        <p className="mt-1 text-sm font-bold text-mint">{selectedTemplate}</p>
        {selectedRetailers.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedRetailers.map((item) => (
              <span
                key={item}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold"
              >
                {item}
              </span>
            ))}
          </div>
        )}
        <p className="mt-2 text-sm text-white/65">
          Agent rewards: €
          {(selectedLocations.length * (Number(reward) || 0)).toFixed(2)} if every mission is approved.
        </p>
      </div>

      <Button
        type="button"
        disabled={submitting || selectedLocations.length === 0}
        className="w-full bg-coral py-4"
        onClick={() => void publish()}
      >
        <Send className="mr-2 inline" size={18} />
        {submitting
          ? "Publishing…"
          : `Publish ${selectedLocations.length || ""} missions`}
      </Button>
    </div>
  );
}
