"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <>
      <label className="block">
        <span className="text-sm font-bold">Password</span>

        <div className="relative mt-2">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 pr-14 outline-none focus:border-mint"
          />

          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-ink/45 transition hover:text-ink focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <p className="mt-2 text-xs text-ink/45">
          Use at least 8 characters.
        </p>
      </label>

      <label className="block">
        <span className="text-sm font-bold">Confirm password</span>

        <div className="relative mt-2">
          <input
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 pr-14 outline-none focus:border-mint"
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword((current) => !current)
            }
            className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-ink/45 transition hover:text-ink focus:outline-none"
            aria-label={
              showConfirmPassword ? "Hide password" : "Show password"
            }
            aria-pressed={showConfirmPassword}
          >
            {showConfirmPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>
        </div>
      </label>
    </>
  );
}
