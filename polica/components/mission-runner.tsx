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
import { Button, Card } from "./ui";

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
    reward?: number;
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
  if (message.includes("GPS_REQUIRED")) return "Please verify your location before finishing.";
  return "The check could not be submitted. Please try again.";
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
  const totalScreens = Math.max(steps.length + 1, 1);
  const progressScreen = Math.min(stepIndex + 1, totalScreens);

  function setAnswer(stepId: string, value: AnswerValue) {
    setAnswers((current) => ({ ...current, [stepId]: value }));
  }

  function isValid(step: MissionStep) {
    if (!step.required) return true;
    if (step.type === "photo") return Boolean(photoBlob);
    const value = answers[step.id];
    if (step.type === "price") return typeof value === "number" && Number.isFinite(value) && value >= 0;
    if (step.type === "rating") return typeof value === "number" && value >= 1 && value <= 5;
    if (step.type === "text") {
      return typeof value === "string" && value.trim().length >= (step.minimum_length ?? 1);
    }
    return typeof value === "string" && value.trim().length > 0;
  }

  async function openCamera() {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Live camera is not available on this device.");
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
      setCameraError("Camera access is off. Enable camera permission and try again.");
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
      setError("Location services are not available on this device.");
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
        setError("Move closer to the store, enable location access, and try again.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function submit() {
    if (!position) {
      setError("Please verify your location before finishing.");
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
  }

  useEffect(() => {
    if (reviewStep && !position && !locationLoading && !complete) captureLocation();
  }, [reviewStep, position, locationLoading, complete]);

  function renderStep(step: MissionStep) {
    if (step.type === "single_choice") {
      const options = step.options?.length ? step.options : ["Yes", "No"];
      return (
        <div className="mt-7 grid gap-3">
          {options.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setAnswer(step.id, option)}
              className={`min-h-16 rounded-2xl border px-5 py-4 text-lg font-black ${
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
        <label className="mt-7 flex items-center rounded-2xl border border-black/10 bg-white px-5">
          <span className="text-3xl font-black">
            {step.currency === "EUR" ? "€" : step.currency || "€"}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={typeof answers[step.id] === "number" ? String(answers[step.id]) : ""}
            onChange={(event) => setAnswer(step.id, Number(event.target.value))}
            placeholder="0.00"
            className="w-full bg-transparent px-4 py-6 text-4xl font-black outline-none"
          />
        </label>
      );
    }

    if (step.type === "rating") {
      return (
        <div className="mt-7 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              type="button"
              key={rating}
              onClick={() => setAnswer(step.id, rating)}
              className={`rounded-2xl border py-5 ${
                answers[step.id] === rating ? "border-mint bg-mint/20" : "border-black/10 bg-white"
              }`}
              aria-label={`Rating ${rating}`}
            >
              <Star
                className={`mx-auto ${
                  answers[step.id] === rating ? "fill-mint text-mint" : "text-ink/25"
                }`}
                size={24}
              />
            </button>
          ))}
        </div>
      );
    }

    if (step.type === "text") {
      const value = typeof answers[step.id] === "string" ? String(answers[step.id]) : "";
      return (
        <div className="mt-7">
          <textarea
            value={value}
            onChange={(event) => setAnswer(step.id, event.target.value)}
            rows={6}
            placeholder="Add a short, clear observation"
            className="w-full resize-none rounded-2xl border border-black/10 bg-white p-4 text-lg outline-none focus:border-mint"
          />
          <p className="mt-2 text-right text-xs text-ink/45">
            {value.trim().length} / {step.minimum_length ?? 1} characters
          </p>
        </div>
      );
    }

    return (
      <div className="mt-7">
        <div className="mb-4 rounded-2xl bg-mint/10 p-4">
          <p className="font-black">Take one clear photo</p>
          <p className="mt-1 text-sm leading-relaxed text-ink/55">
            Show the requested product or display together with the surrounding shelf.
          </p>
        </div>

        {!cameraOpen && !photoPreview && (
          <Button type="button" className="w-full py-4" onClick={() => void openCamera()}>
            <Camera className="mr-2 inline" size={19} /> Open camera
          </Button>
        )}

        {cameraOpen && (
          <div className="overflow-hidden rounded-3xl bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="aspect-[3/4] w-full object-cover" />
            <div className="bg-black p-4">
              <Button type="button" className="w-full bg-white py-4 text-ink" onClick={capturePhoto}>
                <Camera className="mr-2 inline" size={19} /> Take photo
              </Button>
            </div>
          </div>
        )}

        {photoPreview && (
          <div>
            <img
              src={photoPreview}
              alt="Captured check evidence"
              className="aspect-[3/4] w-full rounded-3xl object-cover"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button type="button" className="bg-white text-ink shadow-sm" onClick={retakePhoto}>
                <RotateCcw className="mr-2 inline" size={17} /> Retake
              </Button>
              <Button type="button" disabled className="bg-mint text-ink opacity-100">
                <CheckCircle2 className="mr-2 inline" size={17} /> Use photo
              </Button>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="mt-4 flex gap-2 rounded-2xl bg-coral/10 p-4 text-sm text-coral">
            <AlertCircle className="shrink-0" size={18} /> {cameraError}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-cream">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-5">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} className="rounded-full bg-white p-3" aria-label="Close check">
            <X size={20} />
          </button>
          <div className="text-center">
            <p className="text-xs font-bold text-ink/45">RESERVED</p>
            <p className="font-black">{formatCountdown(countdownSeconds)}</p>
          </div>
          <div className="w-11" />
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-mint transition-all"
            style={{ width: `${(progressScreen / totalScreens) * 100}%` }}
          />
        </div>

        {!complete && (
          <p className="mt-3 text-xs font-bold text-ink/45">
            {reviewStep ? "FINAL CHECK" : `${stepIndex + 1} OF ${steps.length}`}
          </p>
        )}

        {complete ? (
          <Card className="mt-8 p-8 text-center">
            <CheckCircle2 className="mx-auto text-mint" size={58} />
            <h2 className="mt-4 text-4xl font-black">Done ✓</h2>
            {typeof reservation.job.reward === "number" && (
              <p className="mt-5 text-3xl font-black">€{reservation.job.reward.toFixed(2)}</p>
            )}
            <p className="mt-1 font-bold text-ink/55">Pending review</p>
            <p className="mt-4 text-sm leading-relaxed text-ink/50">
              We’ll move the reward to Available earnings once this check is approved.
            </p>
            <Button type="button" className="mt-7 w-full bg-ink text-white" onClick={onSubmitted}>
              Find another check
            </Button>
          </Card>
        ) : reviewStep ? (
          <Card className="mt-5 p-6">
            <h2 className="text-3xl font-black">Ready to finish</h2>
            <p className="mt-2 text-sm text-ink/50">Polica is verifying that the check was completed at the store.</p>

            <div className="mt-6 rounded-2xl bg-white p-4">
              {position ? (
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-mint/15 text-mint">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <p className="font-black">Location verified ✓</p>
                    <p className="text-xs text-ink/45">You can finish the check.</p>
                  </div>
                </div>
              ) : (
                <Button type="button" disabled={locationLoading} className="w-full" onClick={captureLocation}>
                  <Navigation className="mr-2 inline" size={18} />
                  {locationLoading ? "Verifying location…" : "Verify location"}
                </Button>
              )}
            </div>

            {error && (
              <div className="mt-4 flex gap-2 rounded-2xl bg-coral/10 p-4 text-sm text-coral">
                <AlertCircle className="shrink-0" size={18} /> {error}
              </div>
            )}

            <Button
              type="button"
              disabled={!position || submitting}
              className="mt-6 w-full bg-coral py-4"
              onClick={() => void submit()}
            >
              <Send className="mr-2 inline" size={18} />
              {submitting ? "Finishing…" : "Finish check"}
            </Button>
          </Card>
        ) : currentStep ? (
          <Card className="mt-5 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-ink/40">
              {currentStep.required ? "Required" : "Optional"}
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight">{currentStep.question}</h2>
            {renderStep(currentStep)}
          </Card>
        ) : (
          <Card className="mt-5 p-6 text-center">
            <AlertCircle className="mx-auto text-coral" size={36} />
            <h2 className="mt-3 text-xl font-black">This check has no valid questions</h2>
          </Card>
        )}

        {!complete && (
          <div className="mt-auto flex gap-3 pt-5">
            {stepIndex > 0 && (
              <Button
                type="button"
                className="flex-1 bg-white text-ink shadow-sm"
                onClick={() => setStepIndex((step) => step - 1)}
              >
                <ArrowLeft className="mr-2 inline" size={17} /> Back
              </Button>
            )}
            {!reviewStep && currentStep && (
              <Button
                type="button"
                disabled={!isValid(currentStep)}
                className="flex-1 py-4"
                onClick={() => setStepIndex((step) => step + 1)}
              >
                Continue <ArrowRight className="ml-2 inline" size={17} />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
