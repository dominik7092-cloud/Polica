import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RetailMap } from "@/components/retail-map";

export default async function AdminRetailMapPage({ params }: { params: { locale: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/auth/login`);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect(`/${params.locale}/jobs`);

  return (
    <section className="px-5 py-8">
      <Link href={`/${params.locale}/admin`} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
        <ArrowLeft size={16} /> Admin
      </Link>
      <p className="mt-7 text-sm font-bold text-coral">Polica Admin</p>
      <h1 className="text-4xl font-black">Retail map</h1>
      <p className="mt-2 text-sm text-ink/50">Explore active Croatian retail locations by retailer, city and store.</p>
      <div className="mt-6">
        <RetailMap />
      </div>
    </section>
  );
}
