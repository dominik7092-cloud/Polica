import Link from "next/link";
import { signUp } from "../actions";

export default function SignupPage({
  params,
}: {
  params: { locale: string };
}) {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-cream px-5 py-10">
      <div className="text-3xl font-black">
        polica<span className="text-mint">.</span>
      </div>

      <h1 className="mt-10 text-4xl font-black">
        Create your account
      </h1>

      <p className="mt-2 text-ink/60">
        Complete store missions and earn money in euros.
      </p>

      <form action={signUp} className="mt-8 space-y-4">
        <input
          type="hidden"
          name="locale"
          value={params.locale}
        />

        <label className="block">
          <span className="text-sm font-bold">First name</span>

          <input
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold">Country</span>

          <select
            name="countryCode"
            required
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          >
            <option value="">Select country</option>
            <option value="HR">Croatia</option>
            <option value="SI">Slovenia</option>
            <option value="AT">Austria</option>
            <option value="DE">Germany</option>
            <option value="IT">Italy</option>
            <option value="FR">France</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold">Email</span>

          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold">Password</span>

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
            I accept the participation terms and acknowledge the
            privacy notice.
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
