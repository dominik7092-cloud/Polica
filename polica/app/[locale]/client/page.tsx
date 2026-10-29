import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateJob from "@/components/create-job";

export default async function ClientPage({
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
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, first_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect(
      `/${params.locale}/jobs`
    );
  }

  const allowed =
    profile.role === "admin" ||
    profile.role === "client";

  if (!allowed) {
    redirect(
      `/${params.locale}/jobs`
    );
  }

  return (
    <section className="px-5 py-8">
      <p className="text-sm font-bold text-coral">
        Client workspace
      </p>

      <h1 className="text-4xl font-black">
        Create mission
      </h1>

      <p className="mt-2 text-sm leading-relaxed text-ink/55">
        Publish a new in-store mission directly to the
        Polica agent network.
      </p>

      <CreateJob />
    </section>
  );
}
