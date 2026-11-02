"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";

type LanguageSelectorProps = {
  currentLocale: "hr" | "en";
  title: string;
  croatianLabel: string;
  englishLabel: string;
};

export function LanguageSelector({
  currentLocale,
  title,
  croatianLabel,
  englishLabel,
}: LanguageSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function changeLanguage(nextLocale: "hr" | "en") {
    if (nextLocale === currentLocale) {
      return;
    }

    const segments = pathname.split("/");

    if (segments[1] === "hr" || segments[1] === "en") {
      segments[1] = nextLocale;
    } else {
      segments.splice(1, 0, nextLocale);
    }

    const query = searchParams.toString();
    const nextPath = `${segments.join("/")}${query ? `?${query}` : ""}`;

    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="mb-3 rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Languages size={20} className="shrink-0" />

        <div className="flex-1">
          <p className="font-bold">{title}</p>
          <p className="text-xs text-ink/45">
            {currentLocale === "hr" ? croatianLabel : englishLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => changeLanguage("hr")}
          aria-pressed={currentLocale === "hr"}
          className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
            currentLocale === "hr"
              ? "bg-ink text-white"
              : "bg-cream text-ink"
          }`}
        >
          🇭🇷 {croatianLabel}
        </button>

        <button
          type="button"
          onClick={() => changeLanguage("en")}
          aria-pressed={currentLocale === "en"}
          className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
            currentLocale === "en"
              ? "bg-ink text-white"
              : "bg-cream text-ink"
          }`}
        >
          🇬🇧 {englishLabel}
        </button>
      </div>
    </div>
  );
}
