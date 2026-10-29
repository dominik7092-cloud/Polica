import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AlertTriangle,
  Banknote,
  Users,
  ShieldBan,
} from "lucide-react";
import { Card, Button, Chip } from "@/components/ui";

export default async function AdminPage({
  params,
}: {
  params: { locale: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in
  if (!user) {
    redirect(`/${params.locale}/auth/login`);
  }

  // Check this user's Polica role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Logged in, but not an admin
  if (profile?.role !== "admin") {
    redirect(`/${params.locale}/jobs`);
  }

  // Admin dashboard
  return (
    <section className="px-5 py-8">
      <p className="text-sm font-bold text-coral">
        Admin console
      </p>

      <h1 className="text-4xl font-black">
        Operations
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <AlertTriangle size={20} />
          <p className="mt-3 text-2xl font-black">9</p>
          <p className="text-xs font-bold text-ink/45">
            Flagged
          </p>
        </Card>

        <Card className="p-4">
          <Banknote size={20} />
          <p className="mt-3 text-2xl font-black">14</p>
          <p className="text-xs font-bold text-ink/45">
            Payouts
          </p>
        </Card>

        <Card className="p-4">
          <Users size={20} />
          <p className="mt-3 text-2xl font-black">2,418</p>
          <p className="text-xs font-bold text-ink/45">
            Users
          </p>
        </Card>

        <Card className="p-4">
          <ShieldBan size={20} />
          <p className="mt-3 text-2xl font-black">7</p>
          <p className="text-xs font-bold text-ink/45">
            Banned
          </p>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-xl font-black">
        Flagged submissions
      </h2>

      <Card className="mb-3 p-4">
        <div className="flex justify-between">
          <div>
            <Chip className="bg-coral/10 text-coral">
              Needs review
            </Chip>

            <h3 className="mt-2 font-black">
              GPS 1.8 km from store
            </h3>

            <p className="text-xs text-ink/45">
              Submission #3024 · Zagreb
            </p>
          </div>

          <Button className="self-center px-4 py-2 text-xs">
            Review
          </Button>
        </div>
      </Card>

      <Card className="mb-3 p-4">
        <div className="flex justify-between">
          <div>
            <Chip className="bg-coral/10 text-coral">
              Needs review
            </Chip>

            <h3 className="mt-2 font-black">
              Duplicate shelf photo
            </h3>

            <p className="text-xs text-ink/45">
              Submission #3025 · Zagreb
            </p>
          </div>

          <Button className="self-center px-4 py-2 text-xs">
            Review
          </Button>
        </div>
      </Card>

      <Card className="mb-3 p-4">
        <div className="flex justify-between">
          <div>
            <Chip className="bg-coral/10 text-coral">
              Needs review
            </Chip>

            <h3 className="mt-2 font-black">
              Receipt total mismatch
            </h3>

            <p className="text-xs text-ink/45">
              Submission #3026 · Zagreb
            </p>
          </div>

          <Button className="self-center px-4 py-2 text-xs">
            Review
          </Button>
        </div>
      </Card>
    </section>
  );
}
