import Link from "next/link";

export default function CheckEmailPage({
  params,
}: {
  params: { locale: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-cream px-5 py-10">
      <div className="text-3xl font-black">
        polica<span className="text-mint">.</span>
      </div>

      <div className="mt-10 rounded-[28px] bg-white p-6 shadow-soft">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-mint/20 text-2xl">
          ✓
        </div>

        <h1 className="text-3xl font-black">
          Check your email
        </h1>

        <p className="mt-3 leading-relaxed text-ink/60">
          We've sent you a confirmation link. Open the email and confirm
          your account before logging in to Polica.
        </p>

        <Link
          href={`/${params.locale}/auth/login`}
          className="mt-6 block w-full rounded-2xl bg-ink px-5 py-4 text-center font-bold text-white"
        >
          Go to login
        </Link>
      </div>
    </main>
  );
}
