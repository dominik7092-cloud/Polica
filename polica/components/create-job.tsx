"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Euro, Plus, Send, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Chip } from "./ui";
import {
  RetailLocationMultiPicker,
  type RetailLocation,
} from "./retail-location-multi-picker";

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
  const campaignId = useSearchParams().get("campaign");
  const [selectedLocations, setSelectedLocations] = useState<RetailLocation[]>([]);
  const [title, setTitle] = useState("");
  const [jobType, setJobType] = useState("Audit");
  const [reward, setReward] = useState("7.50");
  const [refund, setRefund] = useState("0");
  const [minutes, setMinutes] = useState("12");
  const [questions, setQuestions] = useState(
    [
      "Is the display available?",
      "Enter the displayed price",
      "Take a clear photo of the display",
      "Describe any visibility or availability issue",
    ].join("\n")
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdCount, setCreatedCount] = useState<number | null>(null);

  function buildSteps() {
    return questions
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((question, index) => {
        const lower = question.toLowerCase();
        let type = "text";
        if (lower.includes("photo")) type = "photo";
        else if (lower.includes("price")) type = "price";
        else if (lower.includes("rate") || lower.includes("rating")) type = "rating";
        else if (lower.startsWith("is ") || lower.startsWith("are ")) type = "single_choice";

        return {
          id: `step-${index + 1}`,
          type,
          question,
          required: true,
          ...(type === "single_choice" ? { options: ["Yes", "No"] } : {}),
          ...(type === "text" ? { minimum_length: 10 } : {}),
          ...(type === "price" ? { currency: "EUR" } : {}),
        };
      });
  }

  async function publish() {
    setError("");
    setCreatedCount(null);

    if (selectedLocations.length === 0) {
      setError("Select at least one Konzum location.");
      return;
    }
    if (!title.trim()) {
      setError("Mission title is required.");
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

    const steps = buildSteps();
    if (steps.length === 0) {
      setError("Add at least one mission step.");
      return;
    }

    setSubmitting(true);
    const client = supabase();
    const { data, error: publishError } = await client.rpc("create_campaign_jobs_for_retail_locations", {
      p_campaign: campaignId,
      p_location_ids: selectedLocations.map((location) => location.id),
      p_title: title.trim(),
      p_job_type: jobType,
      p_reward_cents: Math.round(rewardValue * 100),
      p_refund_cents: Math.round(Math.max(Number.isFinite(refundValue) ? refundValue : 0, 0) * 100),
      p_estimated_minutes: Math.round(minutesValue),
      p_starts_at: start.toISOString(),
      p_ends_at: end.toISOString(),
      p_steps: steps,
    });

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
    setTitle("");
    setJobType("Audit");
    setReward("7.50");
    setRefund("0");
    setMinutes("12");
    setStartDate("");
    setEndDate("");
  }

  if (createdCount !== null) {
    return (
      <Card className="mt-6 p-7 text-center">
        <CheckCircle2 className="mx-auto text-mint" size={50} />
        <h2 className="mt-4 text-2xl font-black">Campaign published</h2>
        <p className="mt-2 text-sm text-ink/55">
          {createdCount} individual missions were created for selected Konzum locations.
        </p>
        <Button type="button" className="mt-5 w-full" onClick={reset}>
          <Plus className="mr-2 inline" size={18} />
          Create another campaign
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
          Select one or multiple Konzum locations. Polica will create one independently reservable mission for every selected store.
        </p>
        <div className="mt-5">
          <RetailLocationMultiPicker value={selectedLocations} onChange={setSelectedLocations} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-black">Mission</h2>
        <label className="mt-5 block">
          <span className="text-sm font-bold">Mission title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Check promotional display"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>

        <div className="mt-5">
          <p className="text-sm font-bold">Job type</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {jobTypes.map((type) => (
              <button type="button" key={type} onClick={() => setJobType(type)}>
                <Chip className={jobType === type ? "bg-ink text-white" : "bg-cream"}>{type}</Chip>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label>
            <span className="flex items-center gap-1 text-sm font-bold"><Euro size={15} /> Reward/store</span>
            <input type="number" min="1" step="0.50" value={reward} onChange={(e) => setReward(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint" />
          </label>
          <label>
            <span className="flex items-center gap-1 text-sm font-bold"><Clock size={15} /> Minutes</span>
            <input type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint" />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-bold">Product refund/store (optional)</span>
          <input type="number" min="0" step="0.50" value={refund} onChange={(e) => setRefund(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint" />
        </label>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-black">Dynamic task steps</h2>
        <p className="mt-2 text-sm text-ink/50">Enter one instruction per line.</p>
        <textarea rows={8} value={questions} onChange={(e) => setQuestions(e.target.value)} className="mt-4 w-full resize-none rounded-2xl border border-black/10 bg-white p-4 outline-none focus:border-mint" />
        <p className="mt-3 text-xs text-ink/40">Polica recognizes yes/no, price, photo, rating and text steps.</p>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-black">Campaign window</h2>
        <label className="mt-5 block">
          <span className="text-sm font-bold">Starts</span>
          <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint" />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-bold">Ends</span>
          <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint" />
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
        <p className="mt-1 text-2xl font-black">{selectedLocations.length} locations</p>
        <p className="mt-2 text-sm text-white/65">
          Agent rewards: €{(selectedLocations.length * (Number(reward) || 0)).toFixed(2)} if every mission is approved.
        </p>
      </div>

      <Button type="button" disabled={submitting || selectedLocations.length === 0} className="w-full bg-coral py-4" onClick={() => void publish()}>
        <Send className="mr-2 inline" size={18} />
        {submitting ? "Publishing…" : `Publish ${selectedLocations.length || ""} missions`}
      </Button>
    </div>
  );
}
