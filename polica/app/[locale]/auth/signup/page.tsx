import Link from "next/link";
import {
  MapPin,
  Zap,
  Banknote,
} from "lucide-react";
import { signUp } from "../actions";

export default function SignupPage({
  params,
}: {
  params: {
    locale: string;
  };
}) {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-cream px-5 py-10">
      <div className="text-3xl font-black">
        polica
        <span className="text-mint">
          .
        </span>
      </div>

      <section className="mt-10">
        <h1 className="text-4xl font-black leading-[1.05]">
          Earn a little extra
          while you shop.
        </h1>

        <p className="mt-4 text-base leading-relaxed text-ink/60">
          Polica shows you simple checks at nearby stores.
          Pick one, complete it while you&apos;re there,
          and earn money when it&apos;s approved.
        </p>

        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
              <MapPin size={19} />
            </div>

            <div>
              <p className="font-bold">
                Checks at stores near you
              </p>

              <p className="text-xs text-ink/45">
                Find opportunities that fit your normal shopping.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
              <Zap size={19} />
            </div>

            <div>
              <p className="font-bold">
                Quick and simple
              </p>

              <p className="text-xs text-ink/45">
                Most checks only add a few minutes to your visit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
              <Banknote size={19} />
            </div>

            <div>
              <p className="font-bold">
                Earn real money
              </p>

              <p className="text-xs text-ink/45">
                Approved checks are added to your earnings.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10 border-t border-black/5 pt-8">
        <h2 className="text-2xl font-black">
          Create your account
        </h2>

        <p className="mt-2 text-sm text-ink/50">
          It only takes a minute to get started.
        </p>
      </div>

      <form
        action={signUp}
        className="mt-6 space-y-4"
      >
        <input
          type="hidden"
          name="locale"
          value={params.locale}
        />

        <label className="block">
          <span className="text-sm font-bold">
            First name
          </span>

          <input
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold">
            Country
          </span>

          <select
            name="countryCode"
            required
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          >
            <option value="">
              Select country
            </option>

            <option value="HR">
              Croatia
            </option>

            <option value="SI">
              Slovenia
            </option>

            <option value="AT">
              Austria
            </option>

            <option value="DE">
              Germany
            </option>

            <option value="IT">
              Italy
            </option>

            <option value="FR">
              France
            </option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold">
            Email
          </span>

          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold">
            Password
          </span>

          <input
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />

          <span className="mt-2 block text-xs text-ink/50">
            Use at least 8 characters.
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm">
          <input
            type="checkbox"
            name="terms"
            required
            className="mt-1"
          />

          <span>
            I accept the participation terms and acknowledge
            the privacy notice.
          </span>
        </label>

        <button
          type="submit"
          className="w-full rounded-2xl bg-ink py-4 font-bold text-white"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link
          href={`/${params.locale}/auth/login`}
          className="font-bold underline"
        >
          Log in
        </Link>
      </p>
    </main>
  );
}
