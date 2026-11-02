"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function LoginPasswordField() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="block">
      <span className="text-sm font-bold">Password</span>

      <div className="relative mt-2">
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 pr-14 outline-none focus:border-mint"
        />

        <button
          type="button"
          onClick={() =>
            setShowPassword((current) => !current)
          }
          className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-ink/45 transition hover:text-ink focus:outline-none"
          aria-label={
            showPassword
              ? "Hide password"
              : "Show password"
          }
          aria-pressed={showPassword}
        >
          {showPassword ? (
            <EyeOff size={20} />
          ) : (
            <Eye size={20} />
          )}
        </button>
      </div>
    </label>
  );
}
