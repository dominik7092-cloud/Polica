"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  Coins,
  CreditCard,
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
  const canCashOut = available >= minimumCashOut;

  return (
    <section className="px-5 py-8">
      <p className="text-sm font-bold text-ink/45">Your money</p>
      <h1 className="text-4xl font-black">Earnings</h1>

      <Card className="mt-6 bg-ink p-6 text-white">
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/55">Available</p>
          <Coins className="text-mint" size={23} />
        </div>

        <p className="mt-1 text-5xl font-black">€{available.toFixed(2)}</p>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-sm text-white/65">Pending review</span>
          <b>€{pending.toFixed(2)}</b>
        </div>

        <Button
          type="button"
          disabled={!canCashOut}
          className="mt-5 w-full bg-mint text-ink"
          onClick={() => setCashOutOpen(true)}
        >
          <ArrowDownToLine className="mr-2 inline" size={18} />
          Cash out
        </Button>

        <p className="mt-3 text-center text-[11px] text-white/45">
          {canCashOut
            ? "Choose Revolut or PayPal"
            : `€${Math.max(0, minimumCashOut - available).toFixed(2)} more until cash out`}
        </p>
      </Card>

      <div className="mb-3 mt-8 flex items-end justify-between">
        <h2 className="text-xl font-black">Recent earnings</h2>
        <span className="text-xs font-bold text-ink/40">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {entries.length === 0 ? (
        <Card className="p-7 text-center">
          <Coins className="mx-auto text-ink/20" size={40} />
          <h3 className="mt-3 font-black">No earnings yet</h3>
          <p className="mt-2 text-sm text-ink/50">
            Approved quick checks will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const availableEntry = entry.status === "available";
            return (
              <Card key={entry.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 gap-3">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                      availableEntry
                        ? "bg-mint/20 text-mint"
                        : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    {availableEntry ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-bold">{entry.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Chip className={availableEntry ? "bg-mint/15 px-2 py-1" : "bg-amber-100 px-2 py-1"}>
                        {availableEntry ? "Available" : "Pending"}
                      </Chip>
                      <span className="text-[10px] text-ink/35">{entry.date}</span>
                    </div>
                  </div>
                </div>

                <p className="shrink-0 text-lg font-black text-mint">
                  +€{entry.amount.toFixed(2)}
                </p>
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
            <h2 className="mt-2 pr-10 text-3xl font-black">€{available.toFixed(2)}</h2>
            <p className="mt-2 text-sm text-ink/50">Where should Polica send your earnings?</p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => setMethod("revolut")}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left ${
                  method === "revolut" ? "border-mint bg-mint/10" : "border-black/10"
                }`}
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-ink text-sm font-black text-white">R</div>
                <div>
                  <p className="font-black">Revolut</p>
                  <p className="text-xs text-ink/45">Cash out to Revolut</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod("paypal")}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left ${
                  method === "paypal" ? "border-mint bg-mint/10" : "border-black/10"
                }`}
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#0070ba] text-sm font-black text-white">P</div>
                <div>
                  <p className="font-black">PayPal</p>
                  <p className="text-xs text-ink/45">Cash out to PayPal</p>
                </div>
              </button>
            </div>

            <Button type="button" disabled={!method} className="mt-5 w-full bg-coral">
              <CreditCard className="mr-2 inline" size={18} />
              Continue
            </Button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-ink/40">
              Payout setup is not connected yet. For now, this screen only prepares the simple user experience.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
