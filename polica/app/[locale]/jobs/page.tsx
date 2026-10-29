import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Jobs } from "@/components/jobs";

export default async function JobsPage({
  params,
}: {
  params: { locale: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${params.locale}/auth/login`);
  }

  return <Jobs />;
}
