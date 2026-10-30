"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, ShoppingCart, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Chip } from "./ui";
import { MissionRunner, type MissionRunnerReservation, type MissionStep } from "./mission-runner";

export type ShoppingTripCandidate = {
  id: string;
  storeId: string;
  title: string;
  chain: string;
  address: string;
  reward: number;
  minutes: number;
  steps: MissionStep[];
};

type ActiveTripJob = {
  trip_id: string;
  trip_expires_at: string;
  reservation_id: string;
  reservation_expires_at: string;
  job_id: string;
  title: string;
  job_type: string;
  reward_cents: number;
  estimated_minutes: number;
  steps: MissionStep[];
  store_id: string;
  chain: string;
  address: string;
  lat: number;
  lng: number;
};

function secondsUntil(value: string) {
  return Math.max(0, Math.floor((new Date(value).getTime() - Date.now()) / 1000));
}

export function ShoppingTripManager({
  jobs,
  onChanged,
}: {
  jobs: ShoppingTripCandidate[];
  onChanged: () => void;
}) {
  const [activeTrip, setActiveTrip] = useState<ActiveTripJob[]>([]);
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const groups = useMemo(() => {
    const grouped = new Map<string, ShoppingTripCandidate[]>();
    for (const job of jobs) {
      const current = grouped.get(job.storeId) ?? [];
      current.push(job);
      grouped.set(job.storeId, current);
    }
    return Array.from(grouped.values())
      .filter((items) => items.length >= 2)
      .sort((a, b) => {
        const rewardA = a.reduce((sum, item) => sum + item.reward, 0);
        const rewardB = b.reduce((sum, item) => sum + item.reward, 0);
        return rewardB - rewardA;
      });
  }, [jobs]);

  const loadActiveTrip = useCallback(async () => {
    const client = supabase();
    const { data, error: loadError } = await client.rpc("get_active_shopping_trip");
    if (loadError) {
      setError(loadError.message);
      return;
    }
    const rows = (data ?? []) as ActiveTripJob[];
    setActiveTrip(rows);
    if (rows.length > 0) setCountdown(secondsUntil(rows[0].trip_expires_at));
  }, []);

  useEffect(() => {
    void loadActiveTrip();
  }, [loadActiveTrip]);

  useEffect(() => {
    if (activeTrip.length === 0) return;
    const timer = window.setInterval(() => {
      const remaining = secondsUntil(activeTrip[0].trip_expires_at);
      setCountdown(remaining);
      if (remaining === 0) {
        setActiveTrip([]);
        setRunnerOpen(false);
        onChanged();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeTrip, onChanged]);

  async function addAll(items: ShoppingTripCandidate[]) {
    setBusy(true);
    setError("");
    const client = supabase();
    const { error: startError } = await client.rpc("start_shopping_trip", {
      p_job_ids: items.map((item) => item.id),
    });
    if (startError) {
      setError(startError.message);
      setBusy(false);
      return;
    }
    await loadActiveTrip();
    onChanged();
    setBusy(false);
  }

  async function removeCheck(reservationId: string) {
    setBusy(true);
    setError("");
    const client = supabase();
    const { error: cancelError } = await client.rpc("cancel_reservation", {
      p_reservation: reservationId,
    });
    if (cancelError) setError(cancelError.message);
    await loadActiveTrip();
    onChanged();
    setBusy(false);
  }

  async function cancelTrip() {
    if (activeTrip.length === 0) return;
    setBusy(true);
    setError("");
    const client = supabase();
    const { error: cancelError } = await client.rpc("cancel_shopping_trip", {
      p_trip: activeTrip[0].trip_id,
    });
    if (cancelError) {
      setError(cancelError.message);
      setBusy(false);
      return;
    }
    setActiveTrip([]);
    setRunnerOpen(false);
    onChanged();
    setBusy(false);
  }

  async function checkSubmitted() {
    if (activeTrip.length === 0) return;
    const tripId = activeTrip[0].trip_id;
    const client = supabase();
    await client.rpc("finish_shopping_trip_if_complete", { p_trip: tripId });
    await loadActiveTrip();
    setRunnerOpen(false);
    onChanged();
  }

  if (activeTrip.length > 0) {
    const current = activeTrip[0];
    const totalReward = activeTrip.reduce((sum, item) => sum + item.reward_cents, 0) / 100;
    const totalMinutes = activeTrip.reduce((sum, item) => sum + item.estimated_minutes, 0);
    const reservation: MissionRunnerReservation = {
      id: current.reservation_id,
      expiresAt: current.reservation_expires_at,
      job: {
        id: current.job_id,
        title: current.title,
        chain: current.chain,
        address: current.address,
        steps: Array.isArray(current.steps) ? current.steps : [],
      },
    };

    return (
      <>
        <Card className="mb-5 bg-ink p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-mint">My shopping trip</p>
              <h2 className="mt-1 text-xl font-black">{current.chain}</h2>
              <p className="mt-1 text-xs text-white/50">{current.address}</p>
            </div>
            <Chip className="bg-mint text-ink">{activeTrip.length} left</Chip>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/10 p-3"><b>{activeTrip.length}</b><p className="text-[10px] text-white/50">CHECKS</p></div>
            <div className="rounded-2xl bg-white/10 p-3"><b>~{totalMinutes} min</b><p className="text-[10px] text-white/50">EXTRA</p></div>
            <div className="rounded-2xl bg-white/10 p-3"><b>€{totalReward.toFixed(2)}</b><p className="text-[10px] text-white/50">LEFT</p></div>
          </div>

          <Button type="button" className="mt-4 w-full bg-mint text-ink" onClick={() => setRunnerOpen(true)}>
            Start next quick check
          </Button>

          <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-3 flex w-full items-center justify-center gap-1 text-xs font-bold text-white/60">
            Manage trip {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
              {activeTrip.map((item) => (
                <div key={item.reservation_id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 p-3">
                  <div className="min-w-0"><p className="truncate text-sm font-bold">{item.title}</p><p className="text-[10px] text-white/45">€{(item.reward_cents / 100).toFixed(2)} · ~{item.estimated_minutes} min</p></div>
                  <button type="button" disabled={busy} onClick={() => void removeCheck(item.reservation_id)} className="shrink-0 rounded-full bg-white/10 p-2" aria-label="Remove check from trip"><X size={15} /></button>
                </div>
              ))}
              <Button type="button" disabled={busy} className="w-full bg-coral" onClick={() => void cancelTrip()}>
                Cancel shopping trip
              </Button>
            </div>
          )}

          {error && <p className="mt-3 text-xs font-semibold text-coral">{error}</p>}
          <p className="mt-3 text-center text-[10px] text-white/35">Trip reservation remains active while you shop.</p>
        </Card>

        {runnerOpen && (
          <MissionRunner
            reservation={reservation}
            countdownSeconds={countdown}
            onClose={() => setRunnerOpen(false)}
            onSubmitted={() => void checkSubmitted()}
          />
        )}
      </>
    );
  }

  if (groups.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-mint">Make one shop count</p>
        <h2 className="text-2xl font-black">Shopping trips</h2>
        <p className="mt-1 text-sm text-ink/50">Bundle quick checks at the same store and do them during one normal visit.</p>
      </div>

      {groups.map((items) => {
        const first = items[0];
        const reward = items.reduce((sum, item) => sum + item.reward, 0);
        const minutes = items.reduce((sum, item) => sum + item.minutes, 0);
        return (
          <Card key={first.storeId} className="p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint/15 text-mint"><ShoppingCart size={20} /></div>
              <div className="min-w-0 flex-1">
                <p className="font-black">{first.chain}</p>
                <p className="mt-1 text-xs text-ink/45">{first.address}</p>
              </div>
              <Chip className="bg-mint/15">{items.length} checks</Chip>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-cream p-3 text-center"><p className="text-xl font-black">~{minutes} min</p><p className="text-[10px] font-bold text-ink/40">EXTRA</p></div>
              <div className="rounded-2xl bg-cream p-3 text-center"><p className="text-xl font-black">€{reward.toFixed(2)}</p><p className="text-[10px] font-bold text-ink/40">POTENTIAL</p></div>
            </div>

            <div className="mt-3 space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl bg-cream px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2"><CheckCircle2 className="shrink-0 text-mint" size={15} /><span className="truncate text-xs font-bold">{item.title}</span></div>
                  <span className="shrink-0 text-xs font-black">€{item.reward.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <Button type="button" disabled={busy} className="mt-4 w-full bg-coral" onClick={() => void addAll(items)}>
              {busy ? "Adding…" : "Add all to my trip"}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
