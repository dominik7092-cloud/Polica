import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowDownToLine,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { Button, Card, Chip } from "@/components/ui";

export default async function WalletPage({
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
        Your money
      </p>

      <h1 className="text-4xl font-black">
        Wallet
      </h1>

      <Card className="mt-6 bg-ink p-6 text-white">
        <p className="text-sm text-white/55">
          Available balance
        </p>

        <p className="mt-1 text-5xl font-black">
          €42.50
        </p>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-sm">
            Pending
          </span>

          <b>€16.00</b>
        </div>

        <Button className="mt-5 w-full bg-mint text-ink">
          <ArrowDownToLine
            className="mr-2 inline"
            size={18}
          />

          Withdraw to IBAN
        </Button>

        <p className="mt-3 text-center text-[11px] text-white/45">
          Minimum withdrawal €10
        </p>
      </Card>

      <h2 className="mb-3 mt-8 text-xl font-black">
        Activity
      </h2>

      <Card className="mb-3 flex items-center justify-between p-4">
        <div className="flex gap-3">
          <CheckCircle2 className="text-mint" />

          <div>
            <p className="font-bold">
              Check cold drinks display
            </p>

            <Chip className="mt-1 px-2 py-1">
              Approved
            </Chip>
          </div>
        </div>

        <b>€7.50</b>
      </Card>

      <Card className="mb-3 flex items-center justify-between p-4">
        <div className="flex gap-3">
          <Clock3 className="text-amber-500" />

          <div>
            <p className="font-bold">
              Mystery shop service check
            </p>

            <Chip className="mt-1 px-2 py-1">
              Pending
            </Chip>
          </div>
        </div>

        <b>€14.00</b>
      </Card>
    </section>
  );
}
