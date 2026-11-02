"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="block">
      <span className="text-sm font-bold">
        Password
      </span>

      <div className="relative mt-2">
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          minLength={8}
          autoComplete="new-password"
          required
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 pr-14 outline-none focus:border-mint"
        />

        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-ink/45"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff size={20} />
          ) : (
            <Eye size={20} />
          )}
        </button>
      </div>

      <span className="mt-2 block text-xs text-ink/50">
        Use at least 8 characters.
      </span>
    </label>
  );
}
