"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  Map,
  Clock,
  ShoppingBag,
  CheckCircle2,
  X,
  Camera,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Chip } from "./ui";

type StoreData = {
  chain: string | null;
  address: string;
  lat: number;
  lng: number;
};

type RawJob = {
  id: string;
  title: string;
  job_type: string;
  reward_cents: number;
  refund_cents: number | null;
  estimated_minutes: number;
  starts_at: string | null;
  ends_at: string | null;
  steps: unknown;
  stores: StoreData | StoreData[] | null;
};

type PolicaJob = {
  id: string;
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
  color: string;
};

const jobColors: Record<string, string> = {
  Audit: "#1fd49a",
  Survey: "#4da3ff",
  "Buy & try": "#ff6b57",
  "Rating & review": "#ffb84d",
  "Eye spy": "#9667ff",
  "Scavenger hunt": "#14b8a6",
  "Mystery shop": "#f43f5e",
};

function normalizeStore(
  stores: StoreData | StoreData[] | null
): StoreData | null {
  if (!stores) {
    return null;
  }

  if (Array.isArray(stores)) {
    return stores[0] ?? null;
  }

  return stores;
}

export function Jobs() {
  const [jobs, setJobs] = useState<PolicaJob[]>([]);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All jobs");
  const [active, setActive] = useState<PolicaJob | null>(null);
  const [detail, setDetail] = useState<PolicaJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function loadJobs() {
    setLoading(true);
    setLoadError("");

    const client = supabase();

    const { data, error } = await client
      .from("jobs")
      .select(`
        id,
        title,
        job_type,
        reward_cents,
        refund_cents,
        estimated_minutes,
        starts_at,
        ends_at,
        steps,
        stores (
          chain,
          address,
          lat,
          lng
        )
      `)
      .eq("published", true)
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString())
      .order("reward_cents", { ascending: false });

    if (error) {
      console.error("Unable to load jobs:", error);
      setLoadError("We couldn't load available jobs.");
      setJobs([]);
      setLoading(false);
      return;
    }

    const rawJobs = (data ?? []) as unknown as RawJob[];

    const normalizedJobs: PolicaJob[] = rawJobs
      .map((job) => {
        const store = normalizeStore(job.stores);

        if (!store) {
          return null;
        }

        return {
          id: job.id,
          title: job.title,
          chain: store.chain || "Independent store",
          address: store.address,
          type: job.job_type,
          reward: job.reward_cents / 100,
          refund: (job.refund_cents ?? 0) / 100,
          minutes: job.estimated_minutes,
          lat: store.lat,
          lng: store.lng,
          stepsCount: Array.isArray(job.steps)
            ? job.steps.length
            : 0,
          color:
            jobColors[job.job_type] ||
            "#1fd49a",
        };
      })
      .filter(
        (job): job is PolicaJob =>
          job !== null
      );

    setJobs(normalizedJobs);
    setLoading(false);
  }

  useEffect(() => {
    void loadJobs();
  }, []);

  const availableTypes = useMemo(() => {
    const uniqueTypes = Array.from(
      new Set(jobs.map((job) => job.type))
    );

    return ["All jobs", ...uniqueTypes];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesType =
        selectedType === "All jobs" ||
        job.type === selectedType;

      const searchableText = [
        job.title,
        job.chain,
        job.type,
        job.address,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedQuery ||
        searchableText.includes(normalizedQuery);

      return matchesType && matchesSearch;
    });
  }, [jobs, query, selectedType]);

  return (
    <>
      <section className="px-5 pb-5 pt-8">
        <p className="text-sm font-semibold text-ink/50">
          Jobs available now
        </p>

        <h1 className="mt-1 text-4xl font-black leading-[1.05]">
          Earn nearby.
          <br />
          Make stores better.
        </h1>

        <div className="mt-6 flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 shadow-sm">
            <Search size={18} />

            <input
              className="w-full bg-transparent py-3.5 outline-none"
              placeholder="Search jobs or stores"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
            />
          </label>

          <button
            type="button"
            aria-label="Job filters"
            className="rounded-2xl bg-ink p-4 text-white"
          >
            <SlidersHorizontal size={19} />
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {availableTypes.map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => setSelectedType(type)}
            >
              <Chip
                className={
                  selectedType === type
                    ? "bg-ink text-white"
                    : "bg-white"
                }
              >
                {type}
              </Chip>
            </button>
          ))}
        </div>
      </section>

      <section className="min-h-[420px] rounded-t-[36px] bg-white px-5 pb-8 pt-5">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink/40">
              Available
            </p>

            <h2 className="text-2xl font-black">
              {loading
                ? "Loading jobs"
                : `${filteredJobs.length} ${
                    filteredJobs.length === 1
                      ? "job"
                      : "jobs"
                  }`}
            </h2>
          </div>

          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-xs font-bold"
          >
            <Map size={15} />
            Map
          </button>
        </div>

        {loading && (
          <Card className="p-6 text-center">
            <RefreshCw
              className="mx-auto animate-spin text-mint"
              size={26}
            />

            <p className="mt-3 font-bold">
              Loading available jobs…
            </p>
          </Card>
        )}

        {!loading && loadError && (
          <Card className="p-6 text-center">
            <p className="font-black">
              Jobs temporarily unavailable
            </p>

            <p className="mt-2 text-sm text-ink/50">
              {loadError}
            </p>

            <Button
              type="button"
              className="mt-4"
              onClick={() => void loadJobs()}
            >
              Try again
            </Button>
          </Card>
        )}

        {!loading &&
          !loadError &&
          filteredJobs.length === 0 && (
            <Card className="p-6 text-center">
              <p className="font-black">
                No matching jobs
              </p>

              <p className="mt-2 text-sm text-ink/50">
                Try another search or job type.
              </p>
            </Card>
          )}

        {!loading &&
          !loadError &&
          filteredJobs.length > 0 && (
            <div className="space-y-4">
              {filteredJobs.map((job, index) => (
                <motion.button
                  type="button"
                  initial={{
                    opacity: 0,
                    y: 16,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: index * 0.06,
                  }}
                  key={job.id}
                  onClick={() => setDetail(job)}
                  className="w-full text-left"
                >
                  <Card className="overflow-hidden p-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-xl"
                        style={{
                          background:
                            job.color + "2a",
                        }}
                      >
                        <ShoppingBag
                          style={{
                            color: job.color,
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                              {job.chain} · {job.type}
                            </p>

                            <h3 className="mt-1 font-black leading-tight">
                              {job.title}
                            </h3>
                          </div>

                          <div className="text-right">
                            <p className="text-xl font-black">
                              €{job.reward.toFixed(2)}
                            </p>

                            {job.refund > 0 && (
                              <p className="text-[10px] font-bold text-coral">
                                +€{job.refund.toFixed(2)} refund
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-3 text-xs font-semibold text-ink/50">
                          <span className="flex items-center gap-1">
                            <MapPin size={13} />
                            {job.address}
                          </span>

                          <span className="flex shrink-0 items-center gap-1">
                            <Clock size={13} />
                            {job.minutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.button>
              ))}
            </div>
          )}
      </section>

      {active && (
        <div className="fixed bottom-[77px] left-1/2 z-40 w-[calc(100%-24px)] max-w-[408px] -translate-x-1/2">
          <Card className="flex items-center justify-between bg-ink p-4 text-white">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-mint">
                Active job · reservation connection next
              </p>

              <p className="font-bold">
                {active.chain}: {active.title}
              </p>
            </div>

            <CheckCircle2 className="text-mint" />
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
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                damping: 28,
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
              className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[36px] bg-white p-6"
            >
              <button
                type="button"
                aria-label="Close job details"
                onClick={() => setDetail(null)}
                className="absolute right-5 top-5 rounded-full bg-cream p-2"
              >
                <X size={18} />
              </button>

              <Chip className="bg-mint/20 text-ink">
                {detail.type}
              </Chip>

              <h2 className="mt-4 pr-10 text-3xl font-black">
                {detail.title}
              </h2>

              <p className="mt-2 flex items-start gap-2 text-sm text-ink/55">
                <MapPin
                  className="mt-0.5 shrink-0"
                  size={16}
                />

                {detail.chain} · {detail.address}
              </p>

              <div className="my-6 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-cream p-3 text-center">
                  <p className="font-black">
                    €{detail.reward.toFixed(2)}
                  </p>

                  <p className="text-[10px] font-bold uppercase text-ink/45">
                    Reward
                  </p>
                </div>

                <div className="rounded-2xl bg-cream p-3 text-center">
                  <p className="font-black">
                    {detail.minutes} min
                  </p>

                  <p className="text-[10px] font-bold uppercase text-ink/45">
                    Est. time
                  </p>
                </div>

                <div className="rounded-2xl bg-cream p-3 text-center">
                  <p className="font-black">
                    {detail.stepsCount}
                  </p>

                  <p className="text-[10px] font-bold uppercase text-ink/45">
                    Steps
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-mint/30 bg-mint/10 p-4">
                <p className="flex items-center gap-2 font-bold">
                  <Camera size={18} />
                  What you will do
                </p>

                <p className="mt-2 text-sm leading-relaxed text-ink/65">
                  Visit the store and complete{" "}
                  {detail.stepsCount} guided task steps.
                  Complete the job while you are at the
                  assigned location.
                </p>
              </div>

              <Button
                type="button"
                className="mt-6 w-full bg-coral"
                onClick={() => {
                  setActive(detail);
                  setDetail(null);
                }}
              >
                Reserve for 60 minutes
              </Button>

              <p className="mt-3 text-center text-xs text-ink/40">
                Reservation database connection is the next step
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
