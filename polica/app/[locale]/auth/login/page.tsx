import Link from "next/link";
import { logIn } from "../actions";

export default function LoginPage({
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
        Welcome back
      </h1>

      <p className="mt-2 text-ink/60">
        Log in to find available jobs near you.
      </p>

      <form action={logIn} className="mt-8 space-y-4">
        <input
          type="hidden"
          name="locale"
          value={params.locale}
        />

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
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-2xl bg-ink py-4 font-bold text-white"
        >
          Log in
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        Don't have an account?{" "}
        <Link
          href={`/${params.locale}/auth/signup`}
          className="font-bold underline"
        >
          Create account
        </Link>
      </p>
    </main>
  );
}
