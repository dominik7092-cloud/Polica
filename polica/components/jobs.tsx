"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  MissionRunner,
  type MissionRunnerReservation,
  type MissionStep,
} from "./mission-runner";
import { RetailerBrand } from "./retailer-brand";
import { Button, Card, Chip } from "./ui";
import { NearbyJobAlerts } from "./nearby-job-alerts";

type RawJob = {
  id: string;
  store_id: string;
  title: string;
  job_type: string;
  reward_cents: number;
  refund_cents: number | null;
  estimated_minutes: number;
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
  reserved_at: string;
  expires_at: string;
};

type PolicaJob = {
  id: string;
  storeId: string;
  title: string;
  chain: string;
  address: string;
  type: string;
  reward: number;
  minutes: number;
  lat: number;
  lng: number;
  steps: MissionStep[];
  distanceFromUser: number | null;
};

type StoreOpportunity = {
  storeId: string;
  chain: string;
  address: string;
  lat: number;
  lng: number;
  distanceFromUser: number | null;
  jobs: PolicaJob[];
  totalReward: number;
  totalMinutes: number;
};

type ActiveReservation = {
  id: string;
  jobId: string;
  expiresAt: string;
  job: PolicaJob;
};

const PAGE_SIZE = 10;

function formatCountdown(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(
    safe % 60
  ).padStart(2, "0")}`;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371000;
  const toRadians = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRadians;
  const dLng = (lng2 - lng1) * toRadians;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRadians) *
      Math.cos(lat2 * toRadians) *
      Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function formatDistance(distance: number | null, hr: boolean) {
  if (distance === null) return null;
  if (distance < 1000) return hr ? `${Math.round(distance)} m udaljeno` : `${Math.round(distance)} m away`;
  return hr ? `${(distance / 1000).toFixed(1)} km udaljeno` : `${(distance / 1000).toFixed(1)} km away`;
}

function shopperType(type: string, hr = false) {
  const normalized = type.toLowerCase();
  if (normalized.includes("price")) return hr ? "Provjera cijene" : "Price check";
  if (normalized.includes("photo") || normalized.includes("eye")) return hr ? "Foto provjera" : "Photo check";
  if (normalized.includes("survey")) return hr ? "Brza provjera" : "Quick check";
  if (normalized.includes("audit")) return hr ? "Provjera dostupnosti" : "Availability check";
  if (normalized.includes("mystery")) return hr ? "Provjera trgovine" : "Store check";
  return hr ? "Brza provjera" : "Quick check";
}

function reservationMessage(message: string, hr: boolean) {
  if (message.includes("ONE_ACTIVE_JOB")) return hr ? "Već imaš aktivnu provjeru." : "You already have an active check.";
  if (message.includes("JOB_ALREADY_RESERVED") || message.includes("duplicate key value")) {
    return hr ? "Drugi korisnik već je preuzeo ovu provjeru." : "Another shopper has already taken this check.";
  }
  if (message.includes("JOB_NOT_AVAILABLE")) return hr ? "Ova provjera više nije dostupna." : "This check is no longer available.";
  if (message.includes("ACCOUNT_NOT_AVAILABLE")) return hr ? "Tvoj račun trenutačno ne može preuzimati provjere." : "Your account cannot take checks.";
  return hr ? "Provjeru nije moguće rezervirati. Pokušaj ponovno." : "The check could not be reserved. Please try again.";
}

export function Jobs() {
  const locale = useLocale();
  const hr = locale === "hr";
  const [jobs, setJobs] = useState<PolicaJob[]>([]);
  const [query, setQuery] = useState("");
  const [retailer, setRetailer] = useState("All retailers");
  const [sortBy, setSortBy] = useState<"distance" | "reward">("reward");
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedStore, setSelectedStore] = useState<StoreOpportunity | null>(null);
  const [activeReservation, setActiveReservation] = useState<ActiveReservation | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [missionOpen, setMissionOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reservationLoading, setReservationLoading] = useState<string | null>(null);
  const [reservationError, setReservationError] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const client = supabase();

    const { data: jobRows, error } = await client.rpc("get_available_jobs");

    if (error) {
      setLoadError(error.message);
      setJobs([]);
      setLoading(false);
      return;
    }

    const rawJobs = (jobRows ?? []) as RawJob[];
    const storeIds = Array.from(new Set(rawJobs.map((job) => job.store_id)));
    const { data: storeRows } = storeIds.length
      ? await client
          .from("stores")
          .select("id,chain,address,lat,lng")
          .in("id", storeIds)
      : { data: [] };

    const stores = (storeRows ?? []) as RawStore[];
    const storesById = new Map(stores.map((store) => [store.id, store]));

    setJobs(
      rawJobs.map((job) => {
        const store = storesById.get(job.store_id);
        return {
          id: job.id,
          storeId: job.store_id,
          title: job.title,
          chain: store?.chain || (hr ? "Trgovina" : "Store"),
          address: store?.address || (hr ? "Adresa nije dostupna" : "Address unavailable"),
          type: job.job_type,
          reward: job.reward_cents / 100,
          minutes: job.estimated_minutes,
          lat: store?.lat ?? 0,
          lng: store?.lng ?? 0,
          steps: Array.isArray(job.steps) ? (job.steps as MissionStep[]) : [],
          distanceFromUser: null,
        };
      })
    );
    setLoading(false);
  }, []);

  const loadReservation = useCallback(async (currentJobs: PolicaJob[]) => {
    const client = supabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    const { data } = await client
      .from("reservations")
      .select("id,job_id,reserved_at,expires_at")
      .eq("agent_id", user.id)
      .is("completed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("reserved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      setActiveReservation(null);
      return;
    }

    const reservation = data as RawReservation;
    const job = currentJobs.find((item) => item.id === reservation.job_id);
    if (job) {
      setActiveReservation({
        id: reservation.id,
        jobId: reservation.job_id,
        expiresAt: reservation.expires_at,
        job,
      });
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (jobs.length) void loadReservation(jobs);
  }, [jobs, loadReservation]);

  useEffect(() => {
    if (!activeReservation) return;
    const update = () => {
      const seconds = Math.max(
        0,
        Math.floor((new Date(activeReservation.expiresAt).getTime() - Date.now()) / 1000)
      );
      setCountdown(seconds);
      if (seconds === 0) {
        setActiveReservation(null);
        setMissionOpen(false);
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [activeReservation]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLoadError(hr ? "Lokacijske usluge nisu dostupne na ovom uređaju." : "Location services are not available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setUserLocation({ lat: result.coords.latitude, lng: result.coords.longitude });
        setSortBy("distance");
        setLocating(false);
      },
      () => {
        setLoadError(hr ? "Dopuštenje za lokaciju nije odobreno." : "Location permission was not granted.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  const retailers = useMemo(
    () => ["All retailers", ...Array.from(new Set(jobs.map((job) => job.chain))).sort()],
    [jobs]
  );

  const stores = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const grouped = new Map<string, StoreOpportunity>();

    for (const originalJob of jobs) {
      const distance = userLocation
        ? distanceMeters(userLocation.lat, userLocation.lng, originalJob.lat, originalJob.lng)
        : null;
      const job = { ...originalJob, distanceFromUser: distance };

      if (retailer !== "All retailers" && job.chain !== retailer) continue;
      if (maxDistanceKm !== null && distance !== null && distance > maxDistanceKm * 1000) continue;
      if (
        normalizedQuery &&
        ![job.chain, job.address, job.title, shopperType(job.type)]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      ) continue;

      // Jobs from different client campaigns can create different internal store IDs
      // for the same physical shop. Group by retailer + address so the shopper
      // sees one shop card with all available opportunities.
      const physicalStoreKey = `${job.chain.trim().toLowerCase()}::${job.address
        .trim()
        .toLowerCase()}`;
      const existing = grouped.get(physicalStoreKey);
      if (existing) {
        existing.jobs.push(job);
        existing.totalReward += job.reward;
        existing.totalMinutes += job.minutes;
      } else {
        grouped.set(physicalStoreKey, {
          storeId: physicalStoreKey,
          chain: job.chain,
          address: job.address,
          lat: job.lat,
          lng: job.lng,
          distanceFromUser: distance,
          jobs: [job],
          totalReward: job.reward,
          totalMinutes: job.minutes,
        });
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      if (sortBy === "distance") {
        if (a.distanceFromUser === null && b.distanceFromUser === null) return 0;
        if (a.distanceFromUser === null) return 1;
        if (b.distanceFromUser === null) return -1;
        return a.distanceFromUser - b.distanceFromUser;
      }
      return b.totalReward - a.totalReward;
    });
  }, [jobs, query, retailer, maxDistanceKm, sortBy, userLocation]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, retailer, maxDistanceKm, sortBy, userLocation]);

  async function takeCheck(job: PolicaJob) {
    setReservationLoading(job.id);
    setReservationError("");
    const client = supabase();
    const { data, error } = await client.rpc("reserve_job", { p_job: job.id });

    if (error) {
      setReservationError(reservationMessage(error.message, hr));
      setReservationLoading(null);
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as RawReservation | null;
    if (!row) {
      setReservationError(hr ? "Podaci o rezervaciji nisu vraćeni." : "Reservation data was not returned.");
      setReservationLoading(null);
      return;
    }

    setActiveReservation({
      id: row.id,
      jobId: row.job_id,
      expiresAt: row.expires_at,
      job,
    });
    setSelectedStore(null);
    setReservationLoading(null);
  }

  async function cancelActiveReservation() {
    if (!activeReservation || cancelLoading) return;
    if (!window.confirm(hr ? "Otkazati ovu provjeru? Ponovno će postati dostupna drugim korisnicima." : "Cancel this check? It will become available to other shoppers again.")) return;

    setCancelLoading(true);
    setReservationError("");
    const client = supabase();
    const { error } = await client.rpc("cancel_reservation", {
      p_reservation: activeReservation.id,
    });

    if (error) {
      setReservationError(hr ? "Provjeru nije moguće otkazati. Pokušaj ponovno." : "The check could not be cancelled. Please try again.");
      setCancelLoading(false);
      return;
    }

    setMissionOpen(false);
    setActiveReservation(null);
    setCountdown(0);
    setCancelLoading(false);
    await loadJobs();
  }

  const runnerReservation: MissionRunnerReservation | null = activeReservation
    ? {
        id: activeReservation.id,
        expiresAt: activeReservation.expiresAt,
        job: {
          id: activeReservation.job.id,
          title: activeReservation.job.title,
          chain: activeReservation.job.chain,
          address: activeReservation.job.address,
          reward: activeReservation.job.reward,
          steps: activeReservation.job.steps,
        },
      }
    : null;

  const visibleStores = stores.slice(0, visibleCount);

  return (
    <>
      <NearbyJobAlerts
        jobs={jobs.map((job) => ({
          id: job.id,
          storeId: job.storeId,
          chain: job.chain,
          address: job.address,
          reward: job.reward,
          lat: job.lat,
          lng: job.lng,
        }))}
        hr={hr}
      />
      <section className="sticky top-0 z-30 border-b border-black/5 bg-cream/95 px-5 pb-4 pt-5 backdrop-blur">
        <h1 className="text-3xl font-black">{hr ? "Zaradi" : "Earn"}</h1>
        <div className="mt-4 flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 shadow-sm">
            <Search size={18} />
            <input
              className="w-full bg-transparent py-3.5 outline-none"
              placeholder={hr ? "Pretraži trgovine u blizini" : "Search nearby stores"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            className="rounded-2xl bg-ink p-4 text-white"
            aria-label={hr ? "Filtri" : "Filters"}
          >
            <SlidersHorizontal size={19} />
          </button>
        </div>

        {filtersOpen && (
          <Card className="mt-4 max-h-[55vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black">{hr ? "Pronađi što ti odgovara" : "Find what suits you"}</h2>
              <button
                type="button"
                className="text-xs font-bold text-ink/45"
                onClick={() => {
                  setRetailer("All retailers");
                  setMaxDistanceKm(null);
                  setSortBy("reward");
                }}
              >
                Reset
              </button>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase text-ink/40">{hr ? "Trgovac" : "Retailer"}</span>
              <select
                value={retailer}
                onChange={(event) => setRetailer(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none"
              >
                {retailers.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              {[1, 3, 5, 10].map((km) => (
                <button
                  type="button"
                  key={km}
                  onClick={() => {
                    setMaxDistanceKm(km);
                    if (!userLocation) useMyLocation();
                  }}
                  className={`rounded-full px-3 py-2 text-xs font-bold ${
                    maxDistanceKm === km ? "bg-ink text-white" : "bg-cream"
                  }`}
                >
                  {hr ? `Unutar ${km} km` : `Within ${km} km`}
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
              disabled={locating}
              onClick={useMyLocation}
            >
              {locating ? (hr ? "Tražim tvoju lokaciju…" : "Finding you…") : userLocation ? (hr ? "Lokacija spremna ✓" : "Location ready ✓") : (hr ? "Koristi moju lokaciju" : "Use my location")}
            </Button>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSortBy("distance");
                  if (!userLocation) useMyLocation();
                }}
                className={`rounded-2xl px-3 py-3 text-xs font-bold ${
                  sortBy === "distance" ? "bg-mint" : "bg-cream"
                }`}
              >
                Nearest
              </button>
              <button
                type="button"
                onClick={() => setSortBy("reward")}
                className={`rounded-2xl px-3 py-3 text-xs font-bold ${
                  sortBy === "reward" ? "bg-mint" : "bg-cream"
                }`}
              >
                Highest €
              </button>
            </div>
          </Card>
        )}
      </section>

      <section ref={listTopRef} className="min-h-[420px] rounded-t-[36px] bg-white px-5 pb-32 pt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-ink/40">{hr ? "U blizini" : "Near you"}</p>
        <h2 className="text-2xl font-black">
          {loading ? (hr ? "Tražim trgovine" : "Finding stores") : `${stores.length} ${hr ? (stores.length === 1 ? "trgovina" : "trgovina") : (stores.length === 1 ? "store" : "stores")}`}
        </h2>

        {loading && (
          <Card className="mt-5 p-6 text-center">
            <RefreshCw className="mx-auto animate-spin text-mint" size={26} />
            <p className="mt-3 font-bold">{hr ? "Učitavanje prilika u blizini…" : "Loading nearby opportunities…"}</p>
          </Card>
        )}

        {!loading && loadError && (
          <Card className="mt-5 p-6 text-center">
            <p className="font-black">{hr ? "Prilike trenutačno nisu dostupne" : "Opportunities temporarily unavailable"}</p>
            <p className="mt-2 text-sm text-ink/50">{loadError}</p>
            <Button type="button" className="mt-4" onClick={() => void loadJobs()}>
              Try again
            </Button>
          </Card>
        )}

        {!loading && !loadError && stores.length === 0 && (
          <Card className="mt-5 p-6 text-center">
            <p className="font-black">{hr ? "Nema prilika u blizini" : "No nearby opportunities"}</p>
            <p className="mt-2 text-sm text-ink/45">{hr ? "Pokušaj s drugim trgovcem ili udaljenosti." : "Try a different retailer or distance."}</p>
          </Card>
        )}

        <div className="mt-5 space-y-4">
          {!loading && !loadError && visibleStores.map((store, index) => (
            <motion.button
              type="button"
              key={store.storeId}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, PAGE_SIZE) * 0.04 }}
              onClick={() => {
                setReservationError("");
                setSelectedStore(store);
              }}
              className="w-full text-left"
            >
              <Card className="p-4">
                <div className="flex items-start gap-4">
                  <RetailerBrand retailer={store.chain} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black">{store.chain}</h3>
                        {formatDistance(store.distanceFromUser, hr) && (
                          <p className="mt-1 text-sm font-black text-coral">
                            {formatDistance(store.distanceFromUser, hr)}
                          </p>
                        )}
                        <p className="mt-1 line-clamp-1 text-xs text-ink/45">{store.address}</p>
                      </div>
                      <ChevronRight className="shrink-0 text-ink/25" size={20} />
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">
                          {store.jobs.length} {hr ? (store.jobs.length === 1 ? "prilika" : "prilike") : (store.jobs.length === 1 ? "opportunity" : "opportunities")}
                        </p>
                        <p className="text-xs text-ink/45">~{store.totalMinutes} {hr ? "min ukupno" : "min total"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-ink/40">
                          {hr ? (store.jobs.length === 1 ? "Zaradi" : "Zaradi do") : (store.jobs.length === 1 ? "Earn" : "Earn up to")}
                        </p>
                        <p className="text-2xl font-black">€{store.totalReward.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.button>
          ))}
        </div>

        {!loading && !loadError && stores.length > 0 && (
          <div className="mt-5">
            <p className="text-center text-xs font-semibold text-ink/40">
              {hr ? `Prikazano ${Math.min(visibleCount, stores.length)} od ${stores.length} trgovina` : `Showing ${Math.min(visibleCount, stores.length)} of ${stores.length} stores`}
            </p>
            {visibleCount < stores.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                className="mt-3 w-full rounded-2xl bg-cream px-4 py-4 text-sm font-black"
              >
                {hr ? `Prikaži još ${Math.min(PAGE_SIZE, stores.length - visibleCount)} trgovina` : `Show ${Math.min(PAGE_SIZE, stores.length - visibleCount)} more stores`}
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
                {hr ? `Sažmi na prvih ${PAGE_SIZE}` : `Collapse to first ${PAGE_SIZE}`}
              </button>
            )}
          </div>
        )}
      </section>

      {activeReservation && (
        <div className="fixed bottom-[77px] left-1/2 z-40 w-[calc(100%-24px)] max-w-[408px] -translate-x-1/2">
          <Card className="bg-ink p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-mint">
                  {hr ? "Rezervirano" : "Reserved"} · {formatCountdown(countdown)}
                </p>
                <p className="font-bold">{activeReservation.job.chain}</p>
                <p className="text-xs text-white/55">{activeReservation.job.title}</p>
              </div>
              <CheckCircle2 className="text-mint" />
            </div>
            <Button
              type="button"
              className="mt-3 w-full bg-mint py-2.5 text-ink"
              onClick={() => setMissionOpen(true)}
            >
              <Play className="mr-2 inline" size={16} /> {hr ? "Započni provjeru" : "Start check"}
            </Button>
            <button
              type="button"
              disabled={cancelLoading}
              onClick={() => void cancelActiveReservation()}
              className="mt-2 w-full py-2 text-xs font-bold text-white/55 disabled:opacity-50"
            >
              {cancelLoading ? (hr ? "Otkazivanje…" : "Cancelling…") : (hr ? "Otkaži provjeru" : "Cancel check")}
            </button>
          </Card>
        </div>
      )}

      <AnimatePresence>
        {selectedStore && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] max-w-md overflow-y-auto rounded-t-[36px] bg-white p-6"
            >
              <button
                type="button"
                onClick={() => setSelectedStore(null)}
                className="absolute right-5 top-5 rounded-full bg-cream p-2"
              >
                <X size={18} />
              </button>

              <div className="flex items-start gap-4 pr-10">
                <RetailerBrand retailer={selectedStore.chain} />
                <div>
                  <h2 className="text-2xl font-black">{selectedStore.chain}</h2>
                  {formatDistance(selectedStore.distanceFromUser, hr) && (
                    <p className="mt-1 font-black text-coral">
                      {formatDistance(selectedStore.distanceFromUser, hr)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink/45">{selectedStore.address}</p>
                </div>
              </div>

              <h3 className="mt-7 text-xl font-black">
                {selectedStore.jobs.length}{" "}
                {hr
                  ? selectedStore.jobs.length === 1
                    ? "prilika"
                    : "prilike"
                  : selectedStore.jobs.length === 1
                    ? "opportunity"
                    : "opportunities"}
              </h3>

              <div className="mt-3 space-y-3">
                {selectedStore.jobs
                  .slice()
                  .sort((a, b) => b.reward - a.reward)
                  .map((job) => (
                    <Card key={job.id} className="p-4 shadow-none">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase text-ink/40">
                            {shopperType(job.type, hr)}
                          </p>
                          <p className="mt-1 font-black">{job.title}</p>
                          <p className="mt-2 flex items-center gap-1 text-xs text-ink/45">
                            <Clock size={13} /> ~{job.minutes} min
                          </p>
                        </div>
                        <p className="text-2xl font-black">€{job.reward.toFixed(2)}</p>
                      </div>
                      <Button
                        type="button"
                        disabled={Boolean(activeReservation) || reservationLoading === job.id}
                        className="mt-4 w-full bg-coral"
                        onClick={() => void takeCheck(job)}
                      >
                        {reservationLoading === job.id
                          ? hr
                            ? "Rezerviranje…"
                            : "Reserving…"
                          : activeReservation
                            ? hr
                              ? "Druga provjera je već rezervirana"
                              : "Another check is already reserved"
                            : hr
                              ? "Preuzmi ovu provjeru"
                              : "Take this check"}
                      </Button>
                    </Card>
                  ))}
              </div>

              {reservationError && (
                <p className="mt-4 rounded-2xl bg-coral/10 p-4 text-sm font-bold text-coral">
                  {reservationError}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {missionOpen && runnerReservation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MissionRunner
              reservation={runnerReservation}
              countdownSeconds={countdown}
              onClose={() => setMissionOpen(false)}
              onSubmitted={() => {
                setMissionOpen(false);
                setActiveReservation(null);
                setCountdown(0);
                void loadJobs();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
