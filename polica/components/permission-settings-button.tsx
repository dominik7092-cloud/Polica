"use client";

import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SettingsLauncher } from "@capawesome/capacitor-settings-launcher";
import {
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

type PermissionSettingsButtonProps = {
  title: string;
  description: string;
};

export function PermissionSettingsButton({
  title,
  description,
}: PermissionSettingsButtonProps) {
  const [error, setError] = useState("");

  async function openPermissionSettings() {
    setError("");

    if (!Capacitor.isNativePlatform()) {
      setError(
        "Permission settings are available in the Polica mobile app."
      );
      return;
    }

    try {
      await SettingsLauncher.openAppSettings();
    } catch (error) {
      console.error(
        "Unable to open Polica settings:",
        error
      );

      setError(
        "Polica could not open the device settings."
      );
    }
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={openPermissionSettings}
        className="flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
        aria-label={title}
      >
        <ShieldCheck
          size={20}
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <p className="font-bold">
            {title}
          </p>

          <p className="text-xs text-ink/45">
            {description}
          </p>
        </div>

        <ChevronRight
          size={18}
          className="shrink-0 text-ink/40"
        />
      </button>

      {error && (
        <p
          className="mt-2 px-2 text-xs font-semibold text-coral"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
