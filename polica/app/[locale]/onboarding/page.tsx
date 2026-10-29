import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShoppingProfile } from "@/components/shopping-profile";

export default async function OnboardingPage({
  params,
}: {
  params: {
    locale: string;
  };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/${params.locale}/auth/login`
    );
  }

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select("role, first_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect(
      `/${params.locale}/auth/login`
    );
  }

  if (profile.role !== "agent") {
    redirect(
      `/${params.locale}/jobs`
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-cream px-5 pb-10 pt-8">
      <div className="text-3xl font-black">
        polica
        <span className="text-mint">
          .
        </span>
      </div>

      <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-mint">
        Step 2 of 2
      </p>

      <h1 className="mt-2 text-4xl font-black leading-tight">
        Make Polica work around you.
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-ink/55">
        Tell us which stores you already visit.
        We'll use these preferences to make
        mission discovery more relevant.
      </p>

      <ShoppingProfile
        locale={params.locale}
      />
    </main>
  );
}
