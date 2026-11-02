"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "./ui";

export function ProfilePreferences({
  initialDistance,
}: {
  initialDistance: number;
}) {
  const t = useTranslations("profilePreferences");

  const [distance, setDistance] = useState(initialDistance);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function changeDistance(value: number) {
    setDistance(value);
    setSaving(true);
    setSaved(false);
    setError("");

    const client = supabase();

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      setError(t("loginAgain"));
      setSaving(false);
      return;
    }

    const { error: updateError } = await client
      .from("profiles")
      .update({ nearby_distance_km: value })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to save nearby distance:", updateError);
      setError(t("saveError"));
    } else {
      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 1600);
    }

    setSaving(false);
  }

  return (
    <Card className="mt-3 p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
          <MapPin size={19} />
        </div>

        <div className="flex-1">
          <p className="font-black">{t("title")}</p>

          <p className="mt-1 text-xs leading-relaxed text-ink/45">
            {t("description")}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {[1, 3, 5, 10].map((km) => (
          <button
            type="button"
            key={km}
            disabled={saving}
            onClick={() => void changeDistance(km)}
            className={`rounded-2xl py-3 text-sm font-black transition ${
              distance === km
                ? "bg-ink text-white"
                : "bg-cream text-ink"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {km} km
          </button>
        ))}
      </div>

      {saved && (
        <p className="mt-3 flex items-center gap-1 text-xs font-bold text-mint">
          <Check size={14} />
          {t("saved")}
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs font-semibold text-coral">
          {error}
        </p>
      )}
    </Card>
  );
}
