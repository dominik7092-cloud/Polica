"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  Map as MapIcon,
  Clock,
  ShoppingBag,
  CheckCircle2,
  X,
  Camera,
  MapPin,
  RefreshCw,
  AlertCircle,
  Play,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Navigation,
  Send,
  Star,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  findRoutineMatch,
  shoppingMissionLabel,
  visitFrequencyLabel,
  type StorePreference,
} from "@/lib/routine-matching";
import {
  Button,
  Card,
  Chip,
} from "./ui";

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
  steps: unknown;
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
  isRoutineMatch: boolean;
  routineMatchType: "exact" | "nearby" | null;
  routineDistanceMeters: number | null;
  routineShoppingMission: string | null;
  routineVisitFrequency: string | null;
  routineStoreName: string | null;
  routineScore: number;
};

type ActiveReservation = {
  id: string;
  jobId: string;
  reservedAt: string;
  expiresAt: string;
  job: PolicaJob;
};

type PositionData = {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: string;
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

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds =
    safeSeconds % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function getReservationMessage(
  message: string
) {
  if (
    message.includes(
      "ONE_ACTIVE_JOB"
    )
  ) {
    return "You already have an active job.";
  }

  if (
    message.includes(
      "JOB_ALREADY_RESERVED"
    ) ||
    message.includes(
      "duplicate key value"
    )
  ) {
    return "Another agent has already reserved this job.";
  }

  if (
    message.includes(
      "JOB_NOT_AVAILABLE"
    )
  ) {
    return "This job is no longer available.";
  }

  if (
    message.includes(
      "ACCOUNT_NOT_AVAILABLE"
    )
  ) {
    return "Your account cannot reserve jobs.";
  }

  return "The job could not be reserved. Please try again.";
}

function getSubmissionMessage(
  message: string
) {
  if (
    message.includes(
      "RESERVATION_EXPIRED"
    )
  ) {
    return "Your reservation has expired.";
  }

  if (
    message.includes(
      "RESERVATION_NOT_FOUND"
    )
  ) {
    return "Your active reservation could not be found.";
  }

  if (
    message.includes(
      "PHOTO_REQUIRED"
    )
  ) {
    return "A live evidence photo is required.";
  }

  if (
    message.includes(
      "GPS_REQUIRED"
    )
  ) {
    return "Location verification is required.";
  }

  return "The mission could not be submitted. Please try again.";
}

export function Jobs() {
  const [jobs, setJobs] =
    useState<PolicaJob[]>([]);

  const [query, setQuery] =
    useState("");

  const [
    selectedType,
    setSelectedType,
  ] = useState("All jobs");

  const [detail, setDetail] =
    useState<PolicaJob | null>(
      null
    );

  const [
    activeReservation,
    setActiveReservation,
  ] =
    useState<ActiveReservation | null>(
      null
    );

  const [
    countdownSeconds,
    setCountdownSeconds,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [
    reservationLoading,
    setReservationLoading,
  ] = useState(false);

  const [
    reservationError,
    setReservationError,
  ] = useState("");

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    missionOpen,
    setMissionOpen,
  ] = useState(false);

  const [
    currentStep,
    setCurrentStep,
  ] = useState(0);

  const [
    availability,
    setAvailability,
  ] = useState("");

  const [price, setPrice] =
    useState("");

  const [
    observation,
    setObservation,
  ] = useState("");

  const [
    photoBlob,
    setPhotoBlob,
  ] = useState<Blob | null>(
    null
  );

  const [
    photoPreview,
    setPhotoPreview,
  ] = useState("");

  const [
    cameraOpen,
    setCameraOpen,
  ] = useState(false);

  const [
    cameraError,
    setCameraError,
  ] = useState("");

  const [
    position,
    setPosition,
  ] =
    useState<PositionData | null>(
      null
    );

  const [
    locationLoading,
    setLocationLoading,
  ] = useState(false);

  const [
    submissionLoading,
    setSubmissionLoading,
  ] = useState(false);

  const [
    submissionError,
    setSubmissionError,
  ] = useState("");

  const [
    submissionComplete,
    setSubmissionComplete,
  ] = useState(false);

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const cameraStreamRef =
    useRef<MediaStream | null>(
      null
    );

  const stopCamera =
    useCallback(() => {
      cameraStreamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop()
        );

      cameraStreamRef.current =
        null;

      if (videoRef.current) {
        videoRef.current.srcObject =
          null;
      }

      setCameraOpen(false);
    }, []);

  const loadJobs =
    useCallback(async () => {
      setLoading(true);
      setLoadError("");

      const client = supabase();
      const { data: { user } } = await client.auth.getUser();

      const jobsResult = await client
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

      if (jobsResult.error) {
        setLoadError(jobsResult.error.message);
        setJobs([]);
        setLoading(false);
        return;
      }

      let preferences: StorePreference[] = [];

      if (user) {
        const preferencesResult = await client
          .from("agent_store_preferences")
          .select(`
            id,
            store_name,
            chain,
            address,
            lat,
            lng,
            shopping_mission,
            visit_frequency
          `)
          .eq("agent_id", user.id);

        if (!preferencesResult.error) {
          preferences = (preferencesResult.data ?? []) as StorePreference[];
        }
      }

      const rawJobs = (jobsResult.data ?? []) as RawJob[];

      if (rawJobs.length === 0) {
        setJobs([]);
        setLoading(false);
        return;
      }

      const storeIds = Array.from(
        new Set(rawJobs.map((job) => job.store_id).filter(Boolean))
      );

      let stores: RawStore[] = [];

      if (storeIds.length > 0) {
        const { data: storesData } = await client
          .from("stores")
          .select(`
            id,
            chain,
            address,
            lat,
            lng
          `)
          .in("id", storeIds);

        stores = (storesData ?? []) as RawStore[];
      }

      const storesById = new globalThis.Map<string, RawStore>(
        stores.map((store) => [store.id, store])
      );

      const normalizedJobs: PolicaJob[] = rawJobs
        .map((job) => {
          const store = storesById.get(job.store_id);
          const latitude = store?.lat ?? 0;
          const longitude = store?.lng ?? 0;
          const routine = findRoutineMatch(latitude, longitude, preferences);

          return {
            id: job.id,
            title: job.title,
            chain: store?.chain || "Store",
            address: store?.address || "Address unavailable",
            type: job.job_type,
            reward: job.reward_cents / 100,
            refund: (job.refund_cents ?? 0) / 100,
            minutes: job.estimated_minutes,
            lat: latitude,
            lng: longitude,
            stepsCount: Array.isArray(job.steps) ? job.steps.length : 4,
            color: jobColors[job.job_type] || "#1fd49a",
            isRoutineMatch: routine.isRoutineMatch,
            routineMatchType: routine.matchType,
            routineDistanceMeters: routine.distanceMeters,
            routineShoppingMission: routine.shoppingMission,
            routineVisitFrequency: routine.visitFrequency,
            routineStoreName: routine.regularStoreName,
            routineScore: routine.routineScore,
          };
        })
        .sort((first, second) => {
          if (second.routineScore !== first.routineScore) {
            return second.routineScore - first.routineScore;
          }
          return second.reward - first.reward;
        });

      setJobs(normalizedJobs);
      setLoading(false);
    }, []);

  const loadActiveReservation =
    useCallback(
      async (
        currentJobs: PolicaJob[]
      ) => {
        const client =
          supabase();

        const {
          data: { user },
        } =
          await client.auth.getUser();

        if (!user) {
          return;
        }

        const {
          data,
          error,
        } = await client
          .from("reservations")
          .select(`
            id,
            job_id,
            agent_id,
            reserved_at,
            expires_at,
            completed_at
          `)
          .eq(
            "agent_id",
            user.id
          )
          .is(
            "completed_at",
            null
          )
          .gt(
            "expires_at",
            new Date().toISOString()
          )
          .order(
            "reserved_at",
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle();

        if (error || !data) {
          setActiveReservation(
            null
          );
          return;
        }

        const reservation =
          data as RawReservation;

        const matchingJob =
          currentJobs.find(
            (job) =>
              job.id ===
              reservation.job_id
          );

        if (!matchingJob) {
          return;
        }

        setActiveReservation({
          id: reservation.id,
          jobId:
            reservation.job_id,
          reservedAt:
            reservation.reserved_at,
          expiresAt:
            reservation.expires_at,
          job: matchingJob,
        });
      },
      []
    );

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (jobs.length > 0) {
      void loadActiveReservation(
        jobs
      );
    }
  }, [
    jobs,
    loadActiveReservation,
  ]);

  useEffect(() => {
    if (!activeReservation) {
      return;
    }

    const updateCountdown =
      () => {
        const remaining =
          Math.max(
            0,
            Math.floor(
              (new Date(
                activeReservation.expiresAt
              ).getTime() -
                Date.now()) /
                1000
            )
          );

        setCountdownSeconds(
          remaining
        );

        if (remaining === 0) {
          stopCamera();
          setMissionOpen(false);
          setActiveReservation(
            null
          );
        }
      };

    updateCountdown();

    const timer =
      window.setInterval(
        updateCountdown,
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    activeReservation,
    stopCamera,
  ]);

  useEffect(() => {
    return () => {
      stopCamera();

      if (photoPreview) {
        URL.revokeObjectURL(
          photoPreview
        );
      }
    };
  }, [
    photoPreview,
    stopCamera,
  ]);

  async function reserveJob(
    job: PolicaJob
  ) {
    setReservationLoading(true);
    setReservationError("");

    const client = supabase();

    const {
      data,
      error,
    } = await client.rpc(
      "reserve_job",
      {
        p_job: job.id,
      }
    );

    if (error) {
      setReservationError(
        getReservationMessage(
          error.message
        )
      );
      setReservationLoading(
        false
      );
      return;
    }

    const reservation =
      (Array.isArray(data)
        ? data[0]
        : data) as
        | RawReservation
        | null;

    if (!reservation) {
      setReservationError(
        "Reservation data was not returned."
      );
      setReservationLoading(
        false
      );
      return;
    }

    setActiveReservation({
      id: reservation.id,
      jobId:
        reservation.job_id,
      reservedAt:
        reservation.reserved_at,
      expiresAt:
        reservation.expires_at,
      job,
    });

    setDetail(null);
    setReservationLoading(false);
  }

  function openMission() {
    setCurrentStep(0);
    setSubmissionError("");
    setSubmissionComplete(false);
    setMissionOpen(true);
  }

  function closeMission() {
    stopCamera();
    setMissionOpen(false);
  }

  async function openCamera() {
    setCameraError("");

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices
        .getUserMedia
    ) {
      setCameraError(
        "Live camera is not available in this browser."
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: {
                ideal:
                  "environment",
              },
            },
            audio: false,
          }
        );

      cameraStreamRef.current =
        stream;

      setCameraOpen(true);

      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject =
            stream;

          void videoRef.current.play();
        }
      }, 50);
    } catch {
      setCameraError(
        "Camera permission was not granted. Enable camera access and try again."
      );
    }
  }

  function capturePhoto() {
    const video =
      videoRef.current;

    const canvas =
      canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const maxWidth = 1600;

    const scale = Math.min(
      1,
      maxWidth /
        video.videoWidth
    );

    canvas.width = Math.round(
      video.videoWidth * scale
    );

    canvas.height = Math.round(
      video.videoHeight * scale
    );

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError(
            "Photo capture failed. Please try again."
          );
          return;
        }

        if (photoPreview) {
          URL.revokeObjectURL(
            photoPreview
          );
        }

        setPhotoBlob(blob);

        setPhotoPreview(
          URL.createObjectURL(blob)
        );

        stopCamera();
      },
      "image/jpeg",
      0.8
    );
  }

  function retakePhoto() {
    if (photoPreview) {
      URL.revokeObjectURL(
        photoPreview
      );
    }

    setPhotoBlob(null);
    setPhotoPreview("");
    void openCamera();
  }

  function captureLocation() {
    setSubmissionError("");

    if (!navigator.geolocation) {
      setSubmissionError(
        "Location services are not available."
      );
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({
          lat:
            result.coords
              .latitude,
          lng:
            result.coords
              .longitude,
          accuracy:
            result.coords
              .accuracy,
          capturedAt:
            new Date().toISOString(),
        });

        setLocationLoading(
          false
        );
      },
      () => {
        setSubmissionError(
          "Location permission was not granted. Enable location access and try again."
        );

        setLocationLoading(
          false
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  function canContinue() {
    if (currentStep === 0) {
      return (
        availability === "Yes" ||
        availability === "No"
      );
    }

    if (currentStep === 1) {
      const amount =
        Number(price);

      return (
        Number.isFinite(amount) &&
        amount >= 0
      );
    }

    if (currentStep === 2) {
      return Boolean(photoBlob);
    }

    if (currentStep === 3) {
      return (
        observation.trim()
          .length >= 10
      );
    }

    return true;
  }

  function nextStep() {
    if (!canContinue()) {
      return;
    }

    setCurrentStep((step) =>
      Math.min(step + 1, 4)
    );
  }

  async function submitMission() {
    if (
      !activeReservation ||
      !photoBlob ||
      !position
    ) {
      setSubmissionError(
        "Photo and GPS verification are required."
      );
      return;
    }

    setSubmissionLoading(true);
    setSubmissionError("");

    const client = supabase();

    const {
      data: { user },
    } =
      await client.auth.getUser();

    if (!user) {
      setSubmissionError(
        "Your session expired. Please log in again."
      );
      setSubmissionLoading(
        false
      );
      return;
    }

    const photoPath = `${
      user.id
    }/${
      activeReservation.id
    }/${crypto.randomUUID()}.jpg`;

    const {
      error: uploadError,
    } = await client.storage
      .from("job-evidence")
      .upload(
        photoPath,
        photoBlob,
        {
          contentType:
            "image/jpeg",
          upsert: false,
        }
      );

    if (uploadError) {
      setSubmissionError(
        `Photo upload failed: ${uploadError.message}`
      );
      setSubmissionLoading(
        false
      );
      return;
    }

    const answers = {
      availability,
      price_eur:
        Number(price),
      observation:
        observation.trim(),
      photo_capture_method:
        "live_camera",
      camera_captured_at:
        new Date().toISOString(),
      gps_accuracy_m:
        Math.round(
          position.accuracy
        ),
    };

    const {
      error: submitError,
    } = await client.rpc(
      "submit_reserved_job",
      {
        p_reservation:
          activeReservation.id,
        p_answers: answers,
        p_photo_path:
          photoPath,
        p_lat: position.lat,
        p_lng: position.lng,
        p_captured_at:
          position.capturedAt,
      }
    );

    if (submitError) {
      await client.storage
        .from("job-evidence")
        .remove([photoPath]);

      setSubmissionError(
        getSubmissionMessage(
          submitError.message
        )
      );

      setSubmissionLoading(
        false
      );
      return;
    }

    setSubmissionComplete(true);
    setSubmissionLoading(false);
    setActiveReservation(null);
    setCountdownSeconds(0);

    window.setTimeout(() => {
      closeMission();
      setAvailability("");
      setPrice("");
      setObservation("");
      setPosition(null);
      setPhotoBlob(null);

      if (photoPreview) {
        URL.revokeObjectURL(
          photoPreview
        );
      }

      setPhotoPreview("");
      void loadJobs();
    }, 1800);
  }

  const availableTypes =
    useMemo(() => {
      const uniqueTypes =
        Array.from(
          new Set(
            jobs.map(
              (job) => job.type
            )
          )
        );

      return [
        "All jobs",
        ...uniqueTypes,
      ];
    }, [jobs]);

  const filteredJobs =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase();

      return jobs.filter(
        (job) => {
          const matchesType =
            selectedType ===
              "All jobs" ||
            job.type ===
              selectedType;

          const searchableText =
            [
              job.title,
              job.chain,
              job.type,
              job.address,
            ]
              .join(" ")
              .toLowerCase();

          return (
            matchesType &&
            (normalizedQuery ===
              "" ||
              searchableText.includes(
                normalizedQuery
              ))
          );
        }
      );
    }, [
      jobs,
      query,
      selectedType,
    ]);

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
                setQuery(
                  event.target.value
                )
              }
            />
          </label>

          <button
            type="button"
            className="rounded-2xl bg-ink p-4 text-white"
            aria-label="Filters"
          >
            <SlidersHorizontal
              size={19}
            />
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {availableTypes.map(
            (type) => (
              <button
                type="button"
                key={type}
                onClick={() =>
                  setSelectedType(
                    type
                  )
                }
              >
                <Chip
                  className={
                    selectedType ===
                    type
                      ? "bg-ink text-white"
                      : "bg-white"
                  }
                >
                  {type}
                </Chip>
              </button>
            )
          )}
        </div>
      </section>

      <section className="min-h-[420px] rounded-t-[36px] bg-white px-5 pb-32 pt-5">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink/40">
              Available
            </p>

            <h2 className="text-2xl font-black">
              {loading
                ? "Loading jobs"
                : `${filteredJobs.length} ${
                    filteredJobs.length ===
                    1
                      ? "job"
                      : "jobs"
                  }`}
            </h2>
          </div>

          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-xs font-bold"
          >
            <MapIcon size={15} />
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
              Loading available
              jobs…
            </p>
          </Card>
        )}

        {!loading &&
          loadError && (
            <Card className="p-6 text-center">
              <p className="font-black">
                Jobs temporarily
                unavailable
              </p>

              <p className="mt-2 text-sm text-ink/50">
                {loadError}
              </p>

              <Button
                type="button"
                className="mt-4"
                onClick={() =>
                  void loadJobs()
                }
              >
                Try again
              </Button>
            </Card>
          )}

        {!loading &&
          !loadError &&
          filteredJobs.length ===
            0 && (
            <Card className="p-6 text-center">
              <p className="font-black">
                No matching jobs
              </p>
            </Card>
          )}

        <div className="space-y-4">
          {!loading &&
            !loadError &&
            filteredJobs.map(
              (job, index) => (
                <motion.button
                  type="button"
                  key={job.id}
                  initial={{
                    opacity: 0,
                    y: 16,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      index * 0.06,
                  }}
                  onClick={() => {
                    setReservationError(
                      ""
                    );
                    setDetail(job);
                  }}
                  className="w-full text-left"
                >
                  <Card className="p-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
                        style={{
                          background:
                            job.color +
                            "2a",
                        }}
                      >
                        <ShoppingBag
                          style={{
                            color:
                              job.color,
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3">
                          <div>
                            {job.isRoutineMatch && (
                              <div className="mb-2">
                                <Chip className="bg-mint/20 text-ink">
                                  <Star className="mr-1 fill-mint text-mint" size={13} />
                                  {job.routineMatchType === "exact"
                                    ? "Fits your routine"
                                    : "Near your regular store"}
                                </Chip>
                              </div>
                            )}

                            <p className="text-xs font-bold uppercase text-ink/45">
                              {
                                job.chain
                              }{" "}
                              ·{" "}
                              {job.type}
                            </p>

                            <h3 className="mt-1 font-black">
                              {
                                job.title
                              }
                            </h3>
                          </div>

                          <p className="text-xl font-black">
                            €
                            {job.reward.toFixed(
                              2
                            )}
                          </p>
                        </div>

                        <div className="mt-3 flex items-start gap-3 text-xs font-semibold text-ink/50">
                          <span className="flex min-w-0 gap-1">
                            <MapPin
                              className="shrink-0"
                              size={
                                13
                              }
                            />
                            {
                              job.address
                            }
                          </span>

                        {job.isRoutineMatch && (
                          <div className="mt-3 rounded-2xl bg-mint/10 px-3 py-2">
                            <p className="text-xs font-bold text-ink">
                              {shoppingMissionLabel(job.routineShoppingMission)}{" · "}
                              {visitFrequencyLabel(job.routineVisitFrequency)}
                            </p>
                            <p className="mt-1 text-[10px] text-ink/45">
                              {job.routineStoreName}
                              {job.routineDistanceMeters !== null &&
                                ` · ${job.routineDistanceMeters} m from mission`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.button>
              )
            )}
        </div>
      </section>

      {activeReservation && (
        <div className="fixed bottom-[77px] left-1/2 z-40 w-[calc(100%-24px)] max-w-[408px] -translate-x-1/2">
          <Card className="bg-ink p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-mint">
                  Active job ·{" "}
                  {formatCountdown(
                    countdownSeconds
                  )}
                </p>

                <p className="font-bold">
                  {
                    activeReservation
                      .job.chain
                  }
                  :{" "}
                  {
                    activeReservation
                      .job.title
                  }
                </p>
              </div>

              <CheckCircle2 className="text-mint" />
            </div>

            <Button
              type="button"
              className="mt-3 w-full bg-mint py-2.5 text-ink"
              onClick={
                openMission
              }
            >
              <Play
                className="mr-2 inline"
                size={16}
              />
              Start job
            </Button>
          </Card>
        </div>
      )}

      <AnimatePresence>
        {detail && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/30"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
          >
            <motion.div
              initial={{
                y: "100%",
              }}
              animate={{
                y: 0,
              }}
              exit={{
                y: "100%",
              }}
              className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[36px] bg-white p-6"
            >
              <button
                type="button"
                onClick={() =>
                  setDetail(null)
                }
                className="absolute right-5 top-5 rounded-full bg-cream p-2"
              >
                <X size={18} />
              </button>

              <Chip className="bg-mint/20">
                {detail.type}
              </Chip>

              <h2 className="mt-4 pr-10 text-3xl font-black">
                {detail.title}
              </h2>

                {detail.isRoutineMatch && (
                  <div className="mt-4 rounded-2xl border border-mint/30 bg-mint/10 p-4">
                    <p className="flex items-center gap-2 font-black">
                      <Star className="fill-mint text-mint" size={18} />
                      Fits your shopping routine
                    </p>
                    <p className="mt-2 text-sm text-ink/60">
                      You marked {detail.routineStoreName} as a{" "}
                      {shoppingMissionLabel(detail.routineShoppingMission).toLowerCase()} location that you visit{" "}
                      {visitFrequencyLabel(detail.routineVisitFrequency).toLowerCase()}.
                    </p>
                  </div>
                )}

              <div className="my-6 grid grid-cols-3 gap-2">
                <Card className="p-3 text-center shadow-none">
                  <b>
                    €
                    {detail.reward.toFixed(
                      2
                    )}
                  </b>
                  <p className="text-[10px] text-ink/45">
                    REWARD
                  </p>
                </Card>

                <Card className="p-3 text-center shadow-none">
                  <b>
                    {detail.minutes}{" "}
                    min
                  </b>
                  <p className="text-[10px] text-ink/45">
                    TIME
                  </p>
                </Card>

                <Card className="p-3 text-center shadow-none">
                  <b>4</b>
                  <p className="text-[10px] text-ink/45">
                    STEPS
                  </p>
                </Card>
              </div>

              {reservationError && (
                <div className="rounded-2xl bg-coral/10 p-4 text-sm text-coral">
                  {
                    reservationError
                  }
                </div>
              )}

              <Button
                type="button"
                disabled={
                  reservationLoading ||
                  Boolean(
                    activeReservation
                  )
                }
                className="mt-6 w-full bg-coral"
                onClick={() =>
                  void reserveJob(
                    detail
                  )
                }
              >
                {reservationLoading
                  ? "Reserving…"
                  : activeReservation
                    ? "Active job already reserved"
                    : "Reserve for 60 minutes"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {missionOpen &&
          activeReservation && (
            <motion.div
              className="fixed inset-0 z-[80] overflow-y-auto bg-cream"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
            >
              <div className="mx-auto min-h-screen max-w-md px-5 pb-10 pt-5">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={
                      closeMission
                    }
                    className="rounded-full bg-white p-3"
                  >
                    <X size={20} />
                  </button>

                  <div className="text-center">
                    <p className="text-xs font-bold text-ink/45">
                      ACTIVE MISSION
                    </p>

                    <p className="font-black">
                      {formatCountdown(
                        countdownSeconds
                      )}
                    </p>
                  </div>

                  <div className="w-11" />
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-mint transition-all"
                    style={{
                      width: `${
                        ((currentStep +
                          1) /
                          5) *
                        100
                      }%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-xs font-bold text-ink/45">
                  STEP{" "}
                  {currentStep + 1}{" "}
                  OF 5
                </p>

                {submissionComplete ? (
                  <Card className="mt-8 p-8 text-center">
                    <CheckCircle2
                      className="mx-auto text-mint"
                      size={54}
                    />

                    <h2 className="mt-4 text-3xl font-black">
                      Mission
                      submitted
                    </h2>

                    <p className="mt-3 text-sm text-ink/55">
                      The submission
                      has been sent for
                      review.
                    </p>
                  </Card>
                ) : (
                  <>
                    {currentStep ===
                      0 && (
                      <Card className="mt-5 p-6">
                        <h2 className="text-2xl font-black">
                          Is the cold
                          drinks display
                          available?
                        </h2>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                          {[
                            "Yes",
                            "No",
                          ].map(
                            (
                              option
                            ) => (
                              <button
                                type="button"
                                key={
                                  option
                                }
                                onClick={() =>
                                  setAvailability(
                                    option
                                  )
                                }
                                className={`rounded-2xl border p-5 font-black ${
                                  availability ===
                                  option
                                    ? "border-mint bg-mint/20"
                                    : "border-black/10 bg-white"
                                }`}
                              >
                                {
                                  option
                                }
                              </button>
                            )
                          )}
                        </div>
                      </Card>
                    )}

                    {currentStep ===
                      1 && (
                      <Card className="mt-5 p-6">
                        <h2 className="text-2xl font-black">
                          Enter the
                          displayed price
                        </h2>

                        <label className="mt-6 flex items-center rounded-2xl border border-black/10 bg-white px-4">
                          <span className="text-2xl font-black">
                            €
                          </span>

                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={price}
                            onChange={(
                              event
                            ) =>
                              setPrice(
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="0.00"
                            className="w-full bg-transparent px-3 py-5 text-3xl font-black outline-none"
                          />
                        </label>
                      </Card>
                    )}

                    {currentStep ===
                      2 && (
                      <Card className="mt-5 p-5">
                        <h2 className="text-2xl font-black">
                          Take a live
                          display photo
                        </h2>

                        <p className="mt-2 text-sm text-ink/55">
                          Use the rear
                          camera and
                          include the
                          full display.
                        </p>

                        {!cameraOpen &&
                          !photoPreview && (
                            <Button
                              type="button"
                              className="mt-6 w-full"
                              onClick={() =>
                                void openCamera()
                              }
                            >
                              <Camera
                                className="mr-2 inline"
                                size={
                                  18
                                }
                              />
                              Open live
                              camera
                            </Button>
                          )}

                        {cameraOpen && (
                          <div className="mt-5 overflow-hidden rounded-2xl bg-black">
                            <video
                              ref={
                                videoRef
                              }
                              autoPlay
                              playsInline
                              muted
                              className="aspect-[3/4] w-full object-cover"
                            />

                            <div className="bg-black p-4">
                              <Button
                                type="button"
                                className="w-full bg-white text-ink"
                                onClick={
                                  capturePhoto
                                }
                              >
                                <Camera
                                  className="mr-2 inline"
                                  size={
                                    18
                                  }
                                />
                                Take photo
                              </Button>
                            </div>
                          </div>
                        )}

                        {photoPreview && (
                          <div className="mt-5">
                            <img
                              src={
                                photoPreview
                              }
                              alt="Captured mission evidence"
                              className="aspect-[3/4] w-full rounded-2xl object-cover"
                            />

                            <Button
                              type="button"
                              className="mt-3 w-full bg-white text-ink shadow-sm"
                              onClick={
                                retakePhoto
                              }
                            >
                              <RotateCcw
                                className="mr-2 inline"
                                size={
                                  18
                                }
                              />
                              Retake photo
                            </Button>
                          </div>
                        )}

                        {cameraError && (
                          <div className="mt-4 flex gap-2 rounded-2xl bg-coral/10 p-4 text-sm text-coral">
                            <AlertCircle
                              size={18}
                            />
                            {
                              cameraError
                            }
                          </div>
                        )}

                        <canvas
                          ref={
                            canvasRef
                          }
                          className="hidden"
                        />
                      </Card>
                    )}

                    {currentStep ===
                      3 && (
                      <Card className="mt-5 p-6">
                        <h2 className="text-2xl font-black">
                          Describe any
                          visibility or
                          availability
                          issue
                        </h2>

                        <textarea
                          value={
                            observation
                          }
                          onChange={(
                            event
                          ) =>
                            setObservation(
                              event
                                .target
                                .value
                            )
                          }
                          rows={6}
                          placeholder="Minimum 10 characters"
                          className="mt-6 w-full resize-none rounded-2xl border border-black/10 bg-white p-4 outline-none focus:border-mint"
                        />

                        <p className="mt-2 text-right text-xs text-ink/45">
                          {
                            observation
                              .trim()
                              .length
                          }{" "}
                          characters
                        </p>
                      </Card>
                    )}

                    {currentStep ===
                      4 && (
                      <Card className="mt-5 p-6">
                        <h2 className="text-2xl font-black">
                          Verify and
                          submit
                        </h2>

                        <div className="mt-5 space-y-3">
                          <div className="rounded-2xl bg-cream p-4">
                            <p className="text-xs font-bold text-ink/45">
                              AVAILABILITY
                            </p>
                            <p className="font-black">
                              {
                                availability
                              }
                            </p>
                          </div>

                          <div className="rounded-2xl bg-cream p-4">
                            <p className="text-xs font-bold text-ink/45">
                              PRICE
                            </p>
                            <p className="font-black">
                              €
                              {Number(
                                price
                              ).toFixed(
                                2
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-cream p-4">
                            <p className="text-xs font-bold text-ink/45">
                              PHOTO
                            </p>
                            <p className="font-black">
                              Live photo
                              captured
                            </p>
                          </div>

                          <div className="rounded-2xl bg-cream p-4">
                            <p className="text-xs font-bold text-ink/45">
                              LOCATION
                            </p>

                            {position ? (
                              <div>
                                <p className="font-black text-mint">
                                  GPS
                                  captured
                                </p>

                                <p className="mt-1 text-xs text-ink/45">
                                  Accuracy:{" "}
                                  {Math.round(
                                    position.accuracy
                                  )}{" "}
                                  m
                                </p>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                disabled={
                                  locationLoading
                                }
                                className="mt-2 w-full"
                                onClick={
                                  captureLocation
                                }
                              >
                                <Navigation
                                  className="mr-2 inline"
                                  size={
                                    18
                                  }
                                />
                                {locationLoading
                                  ? "Capturing location…"
                                  : "Capture GPS"}
                              </Button>
                            )}
                          </div>
                        </div>

                        {submissionError && (
                          <div className="mt-4 flex gap-2 rounded-2xl bg-coral/10 p-4 text-sm text-coral">
                            <AlertCircle
                              className="shrink-0"
                              size={18}
                            />
                            {
                              submissionError
                            }
                          </div>
                        )}

                        <Button
                          type="button"
                          disabled={
                            !position ||
                            submissionLoading
                          }
                          className="mt-6 w-full bg-coral"
                          onClick={() =>
                            void submitMission()
                          }
                        >
                          <Send
                            className="mr-2 inline"
                            size={18}
                          />

                          {submissionLoading
                            ? "Submitting…"
                            : "Submit mission"}
                        </Button>
                      </Card>
                    )}

                    <div className="mt-5 flex gap-3">
                      {currentStep >
                        0 && (
                        <Button
                          type="button"
                          className="flex-1 bg-white text-ink shadow-sm"
                          onClick={() =>
                            setCurrentStep(
                              (
                                step
                              ) =>
                                step -
                                1
                            )
                          }
                        >
                          <ArrowLeft
                            className="mr-2 inline"
                            size={17}
                          />
                          Back
                        </Button>
                      )}

                      {currentStep <
                        4 && (
                        <Button
                          type="button"
                          disabled={
                            !canContinue()
                          }
                          className="flex-1"
                          onClick={
                            nextStep
                          }
                        >
                          Next
                          <ArrowRight
                            className="ml-2 inline"
                            size={17}
                          />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </>
  );
}
