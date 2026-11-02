"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  Landmark,
  LockKeyhole,
  X,
} from "lucide-react";
import { Button, Card, Chip } from "./ui";

type EarningsEntry = {
  id: string;
  title: string;
  amount: number;
  status: string;
  date: string;
};

export function EarningsClient({
  available,
  pending,
  entries,
}: {
  available: number;
  pending: number;
  entries: EarningsEntry[];
}) {
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [method, setMethod] = useState<"revolut" | "paypal" | null>(null);

  const minimumCashOut = 10;
  const amountUntilCashOut = Math.max(0, minimumCashOut - available);
  const canCashOut = available >= minimumCashOut;

  return (
    <section className="px-5 py-8">
      <p className="text-sm font-bold text-ink/45">Your money</p>
      <h1 className="text-4xl font-black">Earnings</h1>

      <Card className="mt-6 bg-ink p-6 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-white/45">
          Available to cash out
        </p>

        <p className="mt-2 text-5xl font-black tracking-tight">
          €{available.toFixed(2)}
        </p>

        <Button
          type="button"
          disabled={!canCashOut}
          className="mt-6 w-full bg-mint py-4 text-ink"
          onClick={() => {
            setMethod(null);
            setCashOutOpen(true);
          }}
        >
          <ArrowDownToLine className="mr-2 inline" size={18} />
          Cash out
        </Button>

        <p className="mt-3 text-center text-[11px] text-white/45">
          {canCashOut
            ? "Minimum cash out reached"
            : `€${amountUntilCashOut.toFixed(2)} more until the €${minimumCashOut.toFixed(2)} minimum`}
        </p>
      </Card>

      <Card className="mt-3 p-4 shadow-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink/40">
              Pending review
            </p>
            <p className="mt-1 text-2xl font-black">€{pending.toFixed(2)}</p>
          </div>

          <div className="grid h-11 w-11 place-items-center rounded-full bg-amber-100 text-amber-600">
            <Clock3 size={21} />
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ink/45">
          Pending earnings are not available to cash out until the related checks are approved.
        </p>
      </Card>

      <div className="mb-3 mt-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink/40">
            Activity
          </p>
          <h2 className="text-xl font-black">Recent earnings</h2>
        </div>
        <span className="text-xs font-bold text-ink/40">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {entries.length === 0 ? (
        <Card className="p-7 text-center">
          <Landmark className="mx-auto text-ink/20" size={40} />
          <h3 className="mt-3 font-black">Nothing here yet</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/50">
            Finish a nearby check. Approved rewards will appear here and move into Available earnings.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const availableEntry = entry.status === "available";
            return (
              <Card key={entry.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                        availableEntry
                          ? "bg-mint/15 text-mint"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {availableEntry ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}
                    </div>

                    <div className="min-w-0">
                      <p className="font-black leading-tight">{entry.title}</p>
                      <p className="mt-1 text-xs text-ink/40">{entry.date}</p>
                    </div>
                  </div>

                  <p className={`shrink-0 text-xl font-black ${availableEntry ? "text-mint" : "text-ink/55"}`}>
                    +€{entry.amount.toFixed(2)}
                  </p>
                </div>

                <div className="mt-3 pl-[52px]">
                  <Chip className={availableEntry ? "bg-mint/15 px-2 py-1" : "bg-amber-100 px-2 py-1"}>
                    {availableEntry ? "Available" : "Pending review"}
                  </Chip>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {cashOutOpen && (
        <div className="fixed inset-0 z-[90] bg-black/35" onClick={() => setCashOutOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[36px] bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-5 top-5 rounded-full bg-cream p-2"
              onClick={() => setCashOutOpen(false)}
              aria-label="Close cash out"
            >
              <X size={18} />
            </button>

            <p className="text-xs font-bold uppercase tracking-widest text-mint">Cash out</p>
            <h2 className="mt-2 pr-10 text-4xl font-black">€{available.toFixed(2)}</h2>
            <p className="mt-2 text-sm text-ink/50">
              Choose where you would like Polica to send your available earnings once payouts are enabled.
            </p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => setMethod("revolut")}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left ${
                  method === "revolut" ? "border-mint bg-mint/10" : "border-black/10"
                }`}
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-ink text-sm font-black text-white">R</div>
                <div className="flex-1">
                  <p className="font-black">Revolut</p>
                  <p className="text-xs text-ink/45">Payout option</p>
                </div>
                {method === "revolut" && <CheckCircle2 className="text-mint" size={20} />}
              </button>

              <button
                type="button"
                onClick={() => setMethod("paypal")}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left ${
                  method === "paypal" ? "border-mint bg-mint/10" : "border-black/10"
                }`}
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#0070ba] text-sm font-black text-white">P</div>
                <div className="flex-1">
                  <p className="font-black">PayPal</p>
                  <p className="text-xs text-ink/45">Payout option</p>
                </div>
                {method === "paypal" && <CheckCircle2 className="text-mint" size={20} />}
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-cream p-4">
              <div className="flex gap-3">
                <LockKeyhole className="mt-0.5 shrink-0 text-ink/45" size={18} />
                <div>
                  <p className="font-black">Payouts are not enabled yet</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink/45">
                    Your earnings remain in Polica. No money will be sent from this screen until the payout service is connected.
                  </p>
                </div>
              </div>
            </div>

            <Button type="button" disabled className="mt-5 w-full bg-ink text-white opacity-45">
              Payout coming soon
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
