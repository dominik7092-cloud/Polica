import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShoppingProfile } from "@/components/shopping-profile";

export default async function ManageStoresPage({
  params,
}: {
  params: { locale: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${params.locale}/auth/login`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-cream px-5 pb-10 pt-8">
      <p className="text-sm font-bold text-ink/45">My shopping</p>
      <h1 className="text-4xl font-black">Manage stores</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/55">
        Add or remove the stores you visit regularly. These choices help keep nearby checks relevant to your normal shopping.
      </p>

      <ShoppingProfile
        locale={params.locale}
        mode="manage"
      />
    </main>
  );
}
