import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ShieldCheck,
  Download,
  Trash2,
  ChevronRight,
  Award,
} from "lucide-react";
import { Card, Chip } from "@/components/ui";

export default async function ProfilePage({
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

  return (
    <section className="px-5 py-8">
      <p className="text-sm font-bold text-ink/45">
        Account
      </p>

      <h1 className="text-4xl font-black">
        Profile
      </h1>

      <Card className="mt-6 p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-mint text-xl font-black">
            DK
          </div>

          <div>
            <h2 className="text-xl font-black">
              Dominik
            </h2>

            <Chip className="mt-1 bg-amber-100">
              <Award size={13} className="mr-1" />
              Regular agent
            </Chip>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-cream">
          <div className="h-full w-3/5 bg-mint" />
        </div>

        <p className="mt-2 text-xs text-ink/50">
          12 approved jobs · 8 more to Senior
        </p>
      </Card>

      <h2 className="mb-3 mt-8 font-black">
        Privacy & safety
      </h2>

      <Card className="mb-3 flex items-center gap-3 p-4">
        <ShieldCheck size={20} />

        <div className="flex-1">
          <p className="font-bold">
            Privacy controls
          </p>

          <p className="text-xs text-ink/45">
            Manage photo and location consent
          </p>
        </div>

        <ChevronRight size={18} />
      </Card>

      <Card className="mb-3 flex items-center gap-3 p-4">
        <Download size={20} />

        <div className="flex-1">
          <p className="font-bold">
            Export my data
          </p>

          <p className="text-xs text-ink/45">
            Download a portable copy
          </p>
        </div>

        <ChevronRight size={18} />
      </Card>

      <Card className="mb-3 flex items-center gap-3 p-4">
        <Trash2 size={20} />

        <div className="flex-1">
          <p className="font-bold">
            Delete account
          </p>

          <p className="text-xs text-ink/45">
            Permanently remove your account
          </p>
        </div>

        <ChevronRight size={18} />
      </Card>

      <div className="mt-5 rounded-2xl bg-coral/10 p-4 text-xs leading-relaxed">
        <b>Stay scam-aware.</b> Polica will never ask you to pay to
        access a job. Earnings may be taxable; check your national
        tax authority.
      </div>
    </section>
  );
}
