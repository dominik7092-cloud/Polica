"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Map as MapIcon,
  MapPin,
  Play,
  RefreshCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  MissionRunner,
  type MissionRunnerReservation,
  type MissionStep,
} from "./mission-runner";
import { ShoppingTripManager } from "./shopping-trip-manager";
import { Button, Card, Chip } from "./ui";

type RawJob = {
  id: string;
  store_id: string;
  title: string;
  job_type: string;
  reward_cents: number;
  refund_cents: number | null;
  estimated_minutes: number;
  starts_at: string | null;
  ends_at: string | null;
  steps: MissionStep[] | unknown;
};

type RawStore = {
  id: string;
  chain: string | null;
  address: string;
  lat: number;
  lng: number;
};

type RawReservation = {
  id: string;
  job_id: string;
  agent_id: string;
  reserved_at: string;
  expires_at: string;
  completed_at: string | null;
};

type PolicaJob = {
  id: string;
  storeId: string;
  title: string;
  chain: string;
  address: string;
  type: string;
  reward: number;
  refund: number;
  minutes: number;
  lat: number;
  lng: number;
  stepsCount: number;
  steps: MissionStep[];
  color: string;
  distanceFromUser: number | null;
};

type ActiveReservation = {
  id: string;
  jobId: string;
  reservedAt: string;
  expiresAt: string;
  job: PolicaJob;
};

const PAGE_SIZE = 10;

const jobColors: Record<string, string> = {
  Audit: "#1fd49a",
  Survey: "#4da3ff",
  "Buy & try": "#ff6b57",
  "Rating & review": "#ffb84d",
  "Eye spy": "#9667ff",
  "Scavenger hunt": "#14b8a6",
  "Mystery shop": "#f43f5e",
};

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getReservationMessage(message: string) {
  if (message.includes("ONE_ACTIVE_JOB")) return "You already have an active job.";
  if (message.includes("JOB_ALREADY_RESERVED") || message.includes("duplicate key value")) {
    return "Another agent has already reserved this job.";
  }
  if (message.includes("JOB_NOT_AVAILABLE")) return "This job is no longer available.";
  if (message.includes("ACCOUNT_NOT_AVAILABLE")) return "Your account cannot reserve jobs.";
  return "The job could not be reserved. Please try again.";
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadius = 6371000;
  const toRadians = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRadians;
  const dLng = (lng2 - lng1) * toRadians;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRadians) *
      Math.cos(lat2 * toRadians) *
      Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

export function Jobs() {
  const [jobs, setJobs] = useState<PolicaJob[]>([]);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All jobs");
  const [sortBy, setSortBy] = useState<"distance" | "reward">("reward");
  const [retailAccount, setRetailAccount] = useState("All retailers");
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detail, setDetail] = useState<PolicaJob | null>(null);
  const [activeReservation, setActiveReservation] = useState<ActiveReservation | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [missionOpen, setMissionOpen] = useState(false);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const client = supabase();
    const { data: jobsData, error: jobsError } = await client
      .from("jobs")
      .select(`
        id,
        store_id,
        title,
        job_type,
        reward_cents,
        refund_cents,
        estimated_minutes,
        starts_at,
        ends_at,
        steps
      `)
      .eq("published", true)
      .order("reward_cents", { ascending: false });

    if (jobsError) {
      setLoadError(jobsError.message);
      setJobs([]);
      setLoading(false);
      return;
    }

    const rawJobs = (jobsData ?? []) as RawJob[];
    if (rawJobs.length === 0) {
      setJobs([]);
      setLoading(false);
      return;
    }

    const storeIds = Array.from(new Set(rawJobs.map((job) => job.store_id).filter(Boolean)));
    let stores: RawStore[] = [];
    if (storeIds.length > 0) {
      const { data: storesData } = await client
        .from("stores")
        .select("id, chain, address, lat, lng")
        .in("id", storeIds);
      stores = (storesData ?? []) as RawStore[];
    }

    const storesById = new Map(stores.map((store) => [store.id, store]));
    setJobs(
      rawJobs.map((job) => {
        const store = storesById.get(job.store_id);
        const steps = Array.isArray(job.steps) ? (job.steps as MissionStep[]) : [];
        return {
          id: job.id,
          storeId: job.store_id,
          title: job.title,
          chain: store?.chain || "Store",
          address: store?.address || "Address unavailable",
          type: job.job_type,
          reward: job.reward_cents / 100,
          refund: (job.refund_cents ?? 0) / 100,
          minutes: job.estimated_minutes,
          lat: store?.lat ?? 0,
          lng: store?.lng ?? 0,
          stepsCount: steps.length,
          steps,
          color: jobColors[job.job_type] || "#1fd49a",
          distanceFromUser: null,
        };
      })
    );
    setLoading(false);
  }, []);

  const loadActiveReservation = useCallback(async (currentJobs: PolicaJob[]) => {
    const client = supabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    const { data, error } = await client
      .from("reservations")
      .select("id, job_id, agent_id, reserved_at, expires_at, completed_at")
      .eq("agent_id", user.id)
      .is("completed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("reserved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setActiveReservation(null);
      return;
    }

    const reservation = data as RawReservation;
    const matchingJob = currentJobs.find((job) => job.id === reservation.job_id);
    if (!matchingJob) return;

    setActiveReservation({
      id: reservation.id,
      jobId: reservation.job_id,
      reservedAt: reservation.reserved_at,
      expiresAt: reservation.expires_at,
      job: matchingJob,
    });
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (jobs.length > 0) void loadActiveReservation(jobs);
  }, [jobs, loadActiveReservation]);

  useEffect(() => {
    if (!activeReservation) return;
    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(activeReservation.expiresAt).getTime() - Date.now()) / 1000)
      );
      setCountdownSeconds(remaining);
      if (remaining === 0) {
        setMissionOpen(false);
        setActiveReservation(null);
      }
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [activeReservation]);

  async function reserveJob(job: PolicaJob) {
    setReservationLoading(true);
    setReservationError("");
    const client = supabase();
    const { data, error } = await client.rpc("reserve_job", { p_job: job.id });

    if (error) {
      setReservationError(getReservationMessage(error.message));
      setReservationLoading(false);
      return;
    }

    const reservation = (Array.isArray(data) ? data[0] : data) as RawReservation | null;
    if (!reservation) {
      setReservationError("Reservation data was not returned.");
      setReservationLoading(false);
      return;
    }

    setActiveReservation({
      id: reservation.id,
      jobId: reservation.job_id,
      reservedAt: reservation.reserved_at,
      expiresAt: reservation.expires_at,
      job,
    });
    setDetail(null);
    setReservationLoading(false);
  }

  const availableTypes = useMemo(() => {
    return ["All jobs", ...Array.from(new Set(jobs.map((job) => job.type)))];
  }, [jobs]);

  const retailAccounts = useMemo(() => {
    return ["All retailers", ...Array.from(new Set(jobs.map((job) => job.chain))).sort()];
  }, [jobs]);

  function useMyLocationForJobs() {
    if (!navigator.geolocation) {
      setLoadError("Location services are not available on this device.");
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setUserLocation({ lat: result.coords.latitude, lng: result.coords.longitude });
        setLocatingUser(false);
        setSortBy("distance");
      },
      () => {
        setLoadError("Location permission was not granted.");
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return jobs
      .map((job) => ({
        ...job,
        distanceFromUser: userLocation
          ? distanceMeters(userLocation.lat, userLocation.lng, job.lat, job.lng)
          : null,
      }))
      .filter((job) => {
        const matchesType = selectedType === "All jobs" || job.type === selectedType;
        const matchesRetailer = retailAccount === "All retailers" || job.chain === retailAccount;
        const matchesDistance =
          maxDistanceKm === null ||
          job.distanceFromUser === null ||
          job.distanceFromUser <= maxDistanceKm * 1000;
        const searchableText = [job.title, job.chain, job.type, job.address]
          .join(" ")
          .toLowerCase();
        const matchesSearch = normalizedQuery === "" || searchableText.includes(normalizedQuery);
        return matchesType && matchesRetailer && matchesDistance && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "distance") {
          if (a.distanceFromUser === null && b.distanceFromUser === null) return 0;
          if (a.distanceFromUser === null) return 1;
          if (b.distanceFromUser === null) return -1;
          return a.distanceFromUser - b.distanceFromUser;
        }
        return b.reward - a.reward;
      });
  }, [jobs, query, selectedType, retailAccount, maxDistanceKm, sortBy, userLocation]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, selectedType, retailAccount, maxDistanceKm, sortBy, userLocation]);

  const visibleJobs = filteredJobs.slice(0, visibleCount);

  const missionRunnerReservation: MissionRunnerReservation | null = activeReservation
    ? {
        id: activeReservation.id,
        expiresAt: activeReservation.expiresAt,
        job: {
          id: activeReservation.job.id,
          title: activeReservation.job.title,
          chain: activeReservation.job.chain,
          address: activeReservation.job.address,
          steps: activeReservation.job.steps,
        },
      }
    : null;

  return (
    <>
      <section className="sticky top-0 z-30 border-b border-black/5 bg-cream/95 px-5 pb-4 pt-5 backdrop-blur">
        <h1 className="text-3xl font-black">Earn</h1>

        <div className="mt-4 flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 shadow-sm">
            <Search size={18} />
            <input
              className="w-full bg-transparent py-3.5 outline-none"
              placeholder="Search shops or checks"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            className="rounded-2xl bg-ink p-4 text-white"
            aria-label="Filters"
          >
            <SlidersHorizontal size={19} />
          </button>
        </div>

        {filtersOpen && (
          <Card className="mt-4 max-h-[55vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black">Find what suits you</h3>
              <button
                type="button"
                className="text-xs font-bold text-ink/45"
                onClick={() => {
                  setSortBy("reward");
                  setRetailAccount("All retailers");
                  setMaxDistanceKm(null);
                }}
              >
                Reset
              </button>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase text-ink/40">Retail account</span>
              <select
                value={retailAccount}
                onChange={(event) => setRetailAccount(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none"
              >
                {retailAccounts.map((account) => (
                  <option key={account}>{account}</option>
                ))}
              </select>
            </label>

            <div className="mt-4">
              <span className="text-xs font-bold uppercase text-ink/40">Distance from me</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 3, 5, 10].map((km) => (
                  <button
                    type="button"
                    key={km}
                    onClick={() => {
                      setMaxDistanceKm(km);
                      if (!userLocation) useMyLocationForJobs();
                    }}
                    className={`rounded-full px-3 py-2 text-xs font-bold ${
                      maxDistanceKm === km ? "bg-ink text-white" : "bg-cream"
                    }`}
                  >
                    Within {km} km
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setMaxDistanceKm(null)}
                  className={`rounded-full px-3 py-2 text-xs font-bold ${
                    maxDistanceKm === null ? "bg-ink text-white" : "bg-cream"
                  }`}
                >
                  Any distance
                </button>
              </div>
              <Button
                type="button"
                className="mt-3 w-full bg-white text-ink shadow-sm"
                disabled={locatingUser}
                onClick={useMyLocationForJobs}
              >
                {locatingUser ? "Finding you…" : userLocation ? "Location ready ✓" : "Use my location"}
              </Button>
            </div>

            <div className="mt-4">
              <span className="text-xs font-bold uppercase text-ink/40">Sort by</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  ["distance", "Nearest"],
                  ["reward", "Highest €"],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => {
                      setSortBy(value as "distance" | "reward");
                      if (value === "distance" && !userLocation) useMyLocationForJobs();
                    }}
                    className={`rounded-2xl px-3 py-3 text-xs font-bold ${
                      sortBy === value ? "bg-mint text-ink" : "bg-cream"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {availableTypes.map((type) => (
            <button type="button" key={type} onClick={() => setSelectedType(type)}>
              <Chip className={selectedType === type ? "bg-ink text-white" : "bg-white"}>
                {type}
              </Chip>
            </button>
          ))}
        </div>
      </section>

      <section ref={listTopRef} className="min-h-[420px] rounded-t-[36px] bg-white px-5 pb-32 pt-5">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink/40">For you</p>
            <h2 className="text-2xl font-black">
              {loading
                ? "Loading jobs"
                : `${filteredJobs.length} ${filteredJobs.length === 1 ? "job" : "jobs"}`}
            </h2>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-xs font-bold"
          >
            <MapIcon size={15} /> Map
          </button>
        </div>

        {!loading && !loadError && (
          <ShoppingTripManager jobs={filteredJobs} onChanged={loadJobs} />
        )}

        {loading && (
          <Card className="p-6 text-center">
            <RefreshCw className="mx-auto animate-spin text-mint" size={26} />
            <p className="mt-3 font-bold">Loading available jobs…</p>
          </Card>
        )}

        {!loading && loadError && (
          <Card className="p-6 text-center">
            <p className="font-black">Jobs temporarily unavailable</p>
            <p className="mt-2 text-sm text-ink/50">{loadError}</p>
            <Button type="button" className="mt-4" onClick={() => void loadJobs()}>
              Try again
            </Button>
          </Card>
        )}

        {!loading && !loadError && filteredJobs.length === 0 && (
          <Card className="p-6 text-center">
            <p className="font-black">No matching jobs</p>
          </Card>
        )}

        <div className="space-y-4">
          {!loading &&
            !loadError &&
            visibleJobs.map((job, index) => (
              <motion.button
                type="button"
                key={job.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, PAGE_SIZE) * 0.04 }}
                onClick={() => {
                  setReservationError("");
                  setDetail(job);
                }}
                className="w-full text-left"
              >
                <Card className="p-4">
                  <div className="flex items-start gap-4">
                    {job.chain.toLowerCase().includes("konzum") ? (
                      <div className="h-14 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#e30613] shadow-sm">
                        <img
                          src="/retailers/konzum-logo.jpg"
                          alt="Konzum"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
                        style={{ background: `${job.color}2a` }}
                      >
                        <ShoppingBag style={{ color: job.color }} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase text-ink/45">
                            {job.chain} · {job.type}
                          </p>
                          <h3 className="mt-1 font-black">{job.title}</h3>
                        </div>
                        <p className="text-xl font-black">€{job.reward.toFixed(2)}</p>
                      </div>

                      <div className="mt-3 flex items-start gap-3 text-xs font-semibold text-ink/50">
                        <span className="flex min-w-0 gap-1">
                          <MapPin className="shrink-0" size={13} />
                          {job.address}
                        </span>
                        <span className="flex shrink-0 gap-1">
                          <Clock size={13} />
                          {job.minutes} min
                        </span>
                        {job.distanceFromUser !== null && (
                          <span className="shrink-0 font-black text-ink/55">
                            {(job.distanceFromUser / 1000).toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.button>
            ))}
        </div>

        {!loading && !loadError && filteredJobs.length > 0 && (
          <div className="mt-5">
            <p className="text-center text-xs font-semibold text-ink/40">
              Showing {Math.min(visibleCount, filteredJobs.length)} of {filteredJobs.length} checks
            </p>

            {visibleCount < filteredJobs.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                className="mt-3 w-full rounded-2xl bg-cream px-4 py-4 text-sm font-black"
              >
                Show {Math.min(PAGE_SIZE, filteredJobs.length - visibleCount)} more checks
              </button>
            )}

            {visibleCount > PAGE_SIZE && (
              <button
                type="button"
                onClick={() => {
                  setVisibleCount(PAGE_SIZE);
                  listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="mt-2 w-full py-3 text-xs font-bold text-ink/45"
              >
                Collapse to first {PAGE_SIZE}
              </button>
            )}
          </div>
        )}
      </section>

      {activeReservation && (
        <div className="fixed bottom-[77px] left-1/2 z-40 w-[calc(100%-24px)] max-w-[408px] -translate-x-1/2">
          <Card className="bg-ink p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-mint">
                  Saved for this trip · {formatCountdown(countdownSeconds)}
                </p>
                <p className="font-bold">
                  {activeReservation.job.chain}: {activeReservation.job.title}
                </p>
              </div>
              <CheckCircle2 className="text-mint" />
            </div>
            <Button
              type="button"
              className="mt-3 w-full bg-mint py-2.5 text-ink"
              onClick={() => setMissionOpen(true)}
            >
              <Play className="mr-2 inline" size={16} /> Start quick check
            </Button>
          </Card>
        </div>
      )}

      <AnimatePresence>
        {detail && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[36px] bg-white p-6"
            >
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="absolute right-5 top-5 rounded-full bg-cream p-2"
              >
                <X size={18} />
              </button>

              <Chip className="bg-mint/20">{detail.type}</Chip>
              <h2 className="mt-4 pr-10 text-3xl font-black">{detail.title}</h2>
              <p className="mt-2 text-sm text-ink/55">
                {detail.chain} · {detail.address}
              </p>

              <div className="my-6 grid grid-cols-3 gap-2">
                <Card className="p-3 text-center shadow-none">
                  <b>€{detail.reward.toFixed(2)}</b>
                  <p className="text-[10px] text-ink/45">REWARD</p>
                </Card>
                <Card className="p-3 text-center shadow-none">
                  <b>{detail.minutes} min</b>
                  <p className="text-[10px] text-ink/45">EXTRA TIME</p>
                </Card>
                <Card className="p-3 text-center shadow-none">
                  <b>{detail.stepsCount || 4}</b>
                  <p className="text-[10px] text-ink/45">STEPS</p>
                </Card>
              </div>

              <div className="rounded-2xl bg-mint/10 p-4">
                <p className="font-black">Easy to do while you shop</p>
                <p className="mt-1 text-sm text-ink/55">
                  This check is designed to add only about {detail.minutes} minutes to a normal store visit.
                </p>
              </div>

              {reservationError && (
                <div className="mt-4 rounded-2xl bg-coral/10 p-4 text-sm text-coral">
                  {reservationError}
                </div>
              )}

              <Button
                type="button"
                disabled={reservationLoading || Boolean(activeReservation)}
                className="mt-6 w-full bg-coral"
                onClick={() => void reserveJob(detail)}
              >
                {reservationLoading
                  ? "Reserving…"
                  : activeReservation
                    ? "Already added to your trip"
                    : "Add to my trip"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {missionOpen && missionRunnerReservation && (
          <motion.div
            key="mission-runner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MissionRunner
              reservation={missionRunnerReservation}
              countdownSeconds={countdownSeconds}
              onClose={() => setMissionOpen(false)}
              onSubmitted={() => {
                setMissionOpen(false);
                setActiveReservation(null);
                setCountdownSeconds(0);
                void loadJobs();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
