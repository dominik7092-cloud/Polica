import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNewCampaignForm } from "@/components/admin-new-campaign-form";

export default async function NewCampaignPage({ params }: { params: { locale: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/auth/login`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect(`/${params.locale}/jobs`);
  return <AdminNewCampaignForm locale={params.locale} />;
}
