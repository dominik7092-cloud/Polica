import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ShoppingProfile } from "@/components/shopping-profile";

export default async function ManageStoresPage({
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

  return (
    <main className="mx-auto min-h-screen max-w-md bg-cream px-5 pb-10 pt-8">
      <Link
        href={`/${params.locale}/profile`}
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm"
      >
        <ArrowLeft size={16} />
        Back to Profile
      </Link>

      <p className="mt-7 text-sm font-bold text-ink/45">
        My shopping
      </p>

      <h1 className="mt-1 text-4xl font-black">
        Manage stores
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-ink/55">
        Add or remove stores you regularly visit so
        Polica can keep nearby checks relevant to your
        normal shopping.
      </p>

      <ShoppingProfile
        locale={params.locale}
      />
    </main>
  );
}
