"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Navigation,
  RotateCcw,
  Send,
  Star,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Chip } from "./ui";

export type MissionStep = {
  id: string;
  type: "single_choice" | "price" | "photo" | "text" | "rating";
  question: string;
  required?: boolean;
  options?: string[];
  minimum_length?: number;
  currency?: string;
};

export type MissionRunnerReservation = {
  id: string;
  expiresAt: string;
  job: {
    id: string;
    title: string;
    chain: string;
    address: string;
    steps: MissionStep[];
  };
};

type PositionData = {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: string;
};

type AnswerValue = string | number;
type Answers = Record<string, AnswerValue>;

function formatCountdown(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function submissionMessage(message: string) {
  if (message.includes("RESERVATION_EXPIRED")) return "Your reservation has expired.";
  if (message.includes("RESERVATION_NOT_FOUND")) return "Your active reservation could not be found.";
  if (message.includes("PHOTO_REQUIRED")) return "A live evidence photo is required.";
  if (message.includes("GPS_REQUIRED")) return "Location verification is required.";
  return "The mission could not be submitted. Please try again.";
}

function normalizeSteps(steps: MissionStep[]) {
  return steps.filter(
    (step) =>
      step &&
      typeof step.id === "string" &&
      typeof step.question === "string" &&
      ["single_choice", "price", "photo", "text", "rating"].includes(step.type)
  );
}

export function MissionRunner({
  reservation,
  countdownSeconds,
  onClose,
  onSubmitted,
}: {
  reservation: MissionRunnerReservation;
  countdownSeconds: number;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const steps = useMemo(() => normalizeSteps(reservation.job.steps), [reservation.job.steps]);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [position, setPosition] = useState<PositionData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview, stopCamera]);

  const currentStep = steps[stepIndex];
  const reviewStep = stepIndex === steps.length;

  function setAnswer(stepId: string, value: AnswerValue) {
    setAnswers((current) => ({ ...current, [stepId]: value }));
  }

  function isValid(step: MissionStep) {
    if (!step.required) return true;
    if (step.type === "photo") return Boolean(photoBlob);
    const value = answers[step.id];
    if (step.type === "price") return typeof value === "number" && Number.isFinite(value) && value >= 0;
    if (step.type === "rating") return typeof value === "number" && value >= 1 && value <= 5;
    if (step.type === "text") return typeof value === "string" && value.trim().length >= (step.minimum_length ?? 1);
    return typeof value === "string" && value.trim().length > 0;
  }

  async function openCamera() {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Live camera is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 50);
    } catch {
      setCameraError("Camera permission was not granted. Enable camera access and try again.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    const scale = Math.min(1, 1600 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Photo capture failed. Please try again.");
          return;
        }
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoBlob(blob);
        setPhotoPreview(URL.createObjectURL(blob));
        stopCamera();
      },
      "image/jpeg",
      0.8
    );
  }

  function retakePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoBlob(null);
    setPhotoPreview("");
    void openCamera();
  }

  function captureLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Location services are not available.");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracy: result.coords.accuracy,
          capturedAt: new Date().toISOString(),
        });
        setLocationLoading(false);
      },
      () => {
        setError("Location permission was not granted. Enable location access and try again.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function submit() {
    if (!position) {
      setError("Location check is required to finish.");
      return;
    }
    const requiredPhoto = steps.some((step) => step.type === "photo" && step.required);
    if (requiredPhoto && !photoBlob) {
      setError("A live evidence photo is required.");
      return;
    }

    setSubmitting(true);
    setError("");
    const client = supabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      setError("Your session expired. Please log in again.");
      setSubmitting(false);
      return;
    }

    let photoPath = "";
    if (photoBlob) {
      photoPath = `${user.id}/${reservation.id}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await client.storage
        .from("job-evidence")
        .upload(photoPath, photoBlob, { contentType: "image/jpeg", upsert: false });
      if (uploadError) {
        setError(`Photo upload failed: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }
    }

    const answerPayload = {
      responses: steps.map((step) => ({
        step_id: step.id,
        type: step.type,
        question: step.question,
        answer: step.type === "photo" ? "live_camera" : answers[step.id] ?? null,
      })),
      photo_capture_method: photoBlob ? "live_camera" : null,
      camera_captured_at: photoBlob ? new Date().toISOString() : null,
      gps_accuracy_m: Math.round(position.accuracy),
    };

    const { error: submitError } = await client.rpc("submit_reserved_job", {
      p_reservation: reservation.id,
      p_answers: answerPayload,
      p_photo_path: photoPath,
      p_lat: position.lat,
      p_lng: position.lng,
      p_captured_at: position.capturedAt,
    });

    if (submitError) {
      if (photoPath) await client.storage.from("job-evidence").remove([photoPath]);
      setError(submissionMessage(submitError.message));
      setSubmitting(false);
      return;
    }

    setComplete(true);
    setSubmitting(false);
    window.setTimeout(onSubmitted, 1200);
  }

  useEffect(() => {
    if (reviewStep && !position && !locationLoading && !complete) {
      captureLocation();
    }
  }, [reviewStep, position, locationLoading, complete]);

  function renderStep(step: MissionStep) {
    if (step.type === "single_choice") {
      const options = step.options?.length ? step.options : ["Yes", "No"];
      return (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {options.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setAnswer(step.id, option)}
              className={`rounded-2xl border p-5 font-black ${
                answers[step.id] === option
                  ? "border-mint bg-mint/20"
                  : "border-black/10 bg-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    if (step.type === "price") {
      return (
        <label className="mt-6 flex items-center rounded-2xl border border-black/10 bg-white px-4">
          <span className="text-2xl font-black">{step.currency === "EUR" ? "€" : step.currency || "€"}</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={typeof answers[step.id] === "number" ? String(answers[step.id]) : ""}
            onChange={(event) => setAnswer(step.id, Number(event.target.value))}
            placeholder="0.00"
            className="w-full bg-transparent px-3 py-5 text-3xl font-black outline-none"
          />
        </label>
      );
    }

    if (step.type === "rating") {
      return (
        <div className="mt-6 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              type="button"
              key={rating}
              onClick={() => setAnswer(step.id, rating)}
              className={`rounded-2xl border py-4 ${
                answers[step.id] === rating ? "border-mint bg-mint/20" : "border-black/10 bg-white"
              }`}
              aria-label={`Rating ${rating}`}
            >
              <Star
                className={`mx-auto ${answers[step.id] === rating ? "fill-mint text-mint" : "text-ink/25"}`}
                size={22}
              />
            </button>
          ))}
        </div>
      );
    }

    if (step.type === "text") {
      const value = typeof answers[step.id] === "string" ? String(answers[step.id]) : "";
      return (
        <div className="mt-6">
          <textarea
            value={value}
            onChange={(event) => setAnswer(step.id, event.target.value)}
            rows={6}
            placeholder={`Minimum ${step.minimum_length ?? 1} characters`}
            className="w-full resize-none rounded-2xl border border-black/10 bg-white p-4 outline-none focus:border-mint"
          />
          <p className="mt-2 text-right text-xs text-ink/45">{value.trim().length} characters</p>
        </div>
      );
    }

    return (
      <div className="mt-6">
        {!cameraOpen && !photoPreview && (
          <Button type="button" className="w-full" onClick={() => void openCamera()}>
            <Camera className="mr-2 inline" size={18} />
            Open live camera
          </Button>
        )}

        {cameraOpen && (
          <div className="overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="aspect-[3/4] w-full object-cover" />
            <div className="bg-black p-4">
              <Button type="button" className="w-full bg-white text-ink" onClick={capturePhoto}>
                <Camera className="mr-2 inline" size={18} />
                Take photo
              </Button>
            </div>
          </div>
        )}

        {photoPreview && (
          <div>
            <img src={photoPreview} alt="Captured mission evidence" className="aspect-[3/4] w-full rounded-2xl object-cover" />
            <Button type="button" className="mt-3 w-full bg-white text-ink shadow-sm" onClick={retakePhoto}>
              <RotateCcw className="mr-2 inline" size={18} />
              Retake photo
            </Button>
          </div>
        )}

        {cameraError && (
          <div className="mt-4 flex gap-2 rounded-2xl bg-coral/10 p-4 text-sm text-coral">
            <AlertCircle size={18} />
            {cameraError}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-cream">
      <div className="mx-auto min-h-screen max-w-md px-5 pb-10 pt-5">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} className="rounded-full bg-white p-3" aria-label="Close mission">
            <X size={20} />
          </button>
          <div className="text-center">
            <p className="text-xs font-bold text-ink/45">QUICK CHECK</p>
            <p className="font-black">{formatCountdown(countdownSeconds)}</p>
          </div>
          <div className="w-11" />
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-mint transition-all"
            style={{ width: `${((stepIndex + 1) / Math.max(steps.length + 1, 1)) * 100}%` }}
          />
        </div>

        <p className="mt-3 text-xs font-bold text-ink/45">
          {reviewStep ? "ALMOST DONE" : `STEP ${stepIndex + 1} OF ${steps.length}`}
        </p>

        {complete ? (
          <Card className="mt-8 p-8 text-center">
            <CheckCircle2 className="mx-auto text-mint" size={54} />
            <h2 className="mt-4 text-3xl font-black">Done ✓</h2>
            <p className="mt-3 text-sm text-ink/55">Nice. Your check is finished and has been sent for review.</p>
          </Card>
        ) : reviewStep ? (
          <Card className="mt-5 p-6">
            <h2 className="text-2xl font-black">One last check</h2>
            <div className="mt-5 space-y-3">
              {steps.map((step) => (
                <div key={step.id} className="rounded-2xl bg-cream p-4">
                  <p className="text-xs font-bold text-ink/45">{step.question}</p>
                  <p className="mt-1 font-black">
                    {step.type === "photo" ? (photoBlob ? "Live photo captured" : "Missing") : String(answers[step.id] ?? "Not provided")}
                  </p>
                </div>
              ))}
              <div className="rounded-2xl bg-cream p-4">
                <p className="text-xs font-bold text-ink/45">LOCATION</p>
                {position ? (
                  <div>
                    <p className="font-black text-mint">Location checked</p>
                    <p className="mt-1 text-xs text-ink/45">Accuracy: {Math.round(position.accuracy)} m</p>
                  </div>
                ) : (
                  <Button type="button" disabled={locationLoading} className="mt-2 w-full" onClick={captureLocation}>
                    <Navigation className="mr-2 inline" size={18} />
                    {locationLoading ? "Checking location…" : "Check location"}
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 flex gap-2 rounded-2xl bg-coral/10 p-4 text-sm text-coral">
                <AlertCircle className="shrink-0" size={18} />
                {error}
              </div>
            )}

            <Button type="button" disabled={!position || submitting} className="mt-6 w-full bg-coral" onClick={() => void submit()}>
              <Send className="mr-2 inline" size={18} />
              {submitting ? "Finishing…" : "Finish"}
            </Button>
          </Card>
        ) : currentStep ? (
          <Card className="mt-5 p-6">
            <div className="flex flex-wrap gap-2">
              <Chip>{currentStep.type.replace("_", " ")}</Chip>
              {currentStep.required && <Chip className="bg-coral/10 text-coral">Required</Chip>}
            </div>
            {stepIndex === 0 && (
              <p className="mb-3 text-sm font-semibold text-ink/50">
                Keep shopping normally. Polica will guide you through only what is needed.
              </p>
            )}
            <h2 className="mt-4 text-2xl font-black">{currentStep.question}</h2>
            {renderStep(currentStep)}
          </Card>
        ) : (
          <Card className="mt-5 p-6 text-center">
            <AlertCircle className="mx-auto text-coral" size={36} />
            <h2 className="mt-3 text-xl font-black">Mission has no valid steps</h2>
          </Card>
        )}

        {!complete && (
          <div className="mt-5 flex gap-3">
            {stepIndex > 0 && (
              <Button type="button" className="flex-1 bg-white text-ink shadow-sm" onClick={() => setStepIndex((step) => step - 1)}>
                <ArrowLeft className="mr-2 inline" size={17} />
                Back
              </Button>
            )}
            {!reviewStep && currentStep && (
              <Button
                type="button"
                disabled={!isValid(currentStep)}
                className="flex-1"
                onClick={() => setStepIndex((step) => step + 1)}
              >
                Next
                <ArrowRight className="ml-2 inline" size={17} />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
