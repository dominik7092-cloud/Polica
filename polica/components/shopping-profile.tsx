"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  ShoppingCart,
  Zap,
  Fuel,
  Plus,
  Trash2,
  CheckCircle2,
  Store,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { StoreMapPicker } from "./store-map-picker";
import { Button, Card, Chip } from "./ui";

type SavedStore = {
  id: string;
  store_name: string;
  chain: string;
  address: string;
  lat: number;
  lng: number;
  shopping_mission: string;
  visit_frequency: string;
};

const shoppingMissions = [
  {
    value: "main_shop",
    label: "Main shop",
    description: "Large grocery shopping",
    icon: ShoppingCart,
  },
  {
    value: "top_up",
    label: "Top-up",
    description: "Smaller grocery trips",
    icon: Plus,
  },
  {
    value: "quick_stop",
    label: "Quick stop",
    description: "Convenience purchases",
    icon: Zap,
  },
  {
    value: "fuel",
    label: "Fuel",
    description: "Fuel or petrol-station visit",
    icon: Fuel,
  },
  {
    value: "other",
    label: "Other",
    description: "Another regular visit",
    icon: Store,
  },
];

const frequencies = [
  {
    value: "several_times_week",
    label: "Several times/week",
  },
  {
    value: "weekly",
    label: "Weekly",
  },
  {
    value: "two_three_month",
    label: "2–3 times/month",
  },
  {
    value: "occasionally",
    label: "Occasionally",
  },
];

export function ShoppingProfile({
  locale,
}: {
  locale: string;
}) {
  const router = useRouter();

  const [savedStores, setSavedStores] =
    useState<SavedStore[]>([]);

  const [chain, setChain] =
    useState("");

  const [storeName, setStoreName] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [latitude, setLatitude] =
    useState<number | null>(null);

  const [longitude, setLongitude] =
    useState<number | null>(null);

  const [
    shoppingMission,
    setShoppingMission,
  ] = useState("main_shop");

  const [
    visitFrequency,
    setVisitFrequency,
  ] = useState("weekly");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [complete, setComplete] =
    useState(false);

  async function loadStores() {
    const client = supabase();

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      router.push(
        `/${locale}/auth/login`
      );
      return;
    }

    const {
      data,
      error: loadError,
    } = await client
      .from(
        "agent_store_preferences"
      )
      .select(`
        id,
        store_name,
        chain,
        address,
        lat,
        lng,
        shopping_mission,
        visit_frequency
      `)
      .eq("agent_id", user.id)
      .order("created_at", {
        ascending: true,
      });

    if (loadError) {
      setError(
        loadError.message
      );
    } else {
      setSavedStores(
        (data ?? []) as SavedStore[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadStores();
  }, []);

  async function addStore() {
    setError("");

    if (
      savedStores.length >= 5
    ) {
      setError(
        "You can select up to 5 regular stores."
      );
      return;
    }

    if (
      !chain.trim() ||
      !storeName.trim() ||
      !address.trim()
    ) {
      setError(
        "Store name, chain and address are required."
      );
      return;
    }

    if (
      latitude === null ||
      longitude === null
    ) {
      setError(
        "Select the store location on the map."
      );
      return;
    }

    setSaving(true);

    const client = supabase();

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      router.push(
        `/${locale}/auth/login`
      );
      return;
    }

    const {
      data,
      error: saveError,
    } = await client
      .from(
        "agent_store_preferences"
      )
      .insert({
        agent_id: user.id,
        store_name:
          storeName.trim(),
        chain: chain.trim(),
        address:
          address.trim(),
        lat: latitude,
        lng: longitude,
        shopping_mission:
          shoppingMission,
        visit_frequency:
          visitFrequency,
      })
      .select(`
        id,
        store_name,
        chain,
        address,
        lat,
        lng,
        shopping_mission,
        visit_frequency
      `)
      .single();

    if (saveError) {
      setError(
        saveError.message
      );
      setSaving(false);
      return;
    }

    setSavedStores(
      (current) => [
        ...current,
        data as SavedStore,
      ]
    );

    setChain("");
    setStoreName("");
    setAddress("");
    setLatitude(null);
    setLongitude(null);
    setShoppingMission(
      "main_shop"
    );
    setVisitFrequency(
      "weekly"
    );

    setSaving(false);
  }

  async function removeStore(
    id: string
  ) {
    setError("");

    const client = supabase();

    const {
      error: deleteError,
    } = await client
      .from(
        "agent_store_preferences"
      )
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(
        deleteError.message
      );
      return;
    }

    setSavedStores(
      (current) =>
        current.filter(
          (store) =>
            store.id !== id
        )
    );
  }

  function finishOnboarding() {
    if (
      savedStores.length === 0
    ) {
      setError(
        "Add at least one regular store before continuing."
      );
      return;
    }

    setComplete(true);

    window.setTimeout(() => {
      router.push(
        `/${locale}/jobs`
      );

      router.refresh();
    }, 800);
  }

  function missionLabel(
    value: string
  ) {
    return (
      shoppingMissions.find(
        (item) =>
          item.value === value
      )?.label ?? value
    );
  }

  function frequencyLabel(
    value: string
  ) {
    return (
      frequencies.find(
        (item) =>
          item.value === value
      )?.label ?? value
    );
  }

  if (loading) {
    return (
      <Card className="mt-6 p-7 text-center">
        <p className="font-black">
          Loading your stores…
        </p>
      </Card>
    );
  }

  if (complete) {
    return (
      <Card className="mt-6 p-8 text-center">
        <CheckCircle2
          className="mx-auto text-mint"
          size={54}
        />

        <h2 className="mt-4 text-3xl font-black">
          You're ready.
        </h2>

        <p className="mt-2 text-sm text-ink/55">
          Polica can now prioritize missions around
          stores you already visit.
        </p>
      </Card>
    );
  }

  return (
    <div className="mt-6">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-mint">
              Your routine
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Where do you shop?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-ink/55">
              Select stores you already visit. Polica
              will eventually use these preferences to
              prioritize missions that fit into your
              normal routine.
            </p>
          </div>

          <Chip>
            {savedStores.length}/5
          </Chip>
        </div>
      </Card>

      {savedStores.length > 0 && (
        <div className="mt-4 space-y-3">
          {savedStores.map(
            (store) => (
              <Card
                key={store.id}
                className="p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
                      <MapPin
                        size={20}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="font-black">
                        {
                          store.store_name
                        }
                      </p>

                      <p className="mt-1 text-xs font-semibold text-ink/45">
                        {store.chain}
                      </p>

                      <p className="mt-1 text-xs text-ink/40">
                        {
                          store.address
                        }
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Remove store"
                    onClick={() =>
                      void removeStore(
                        store.id
                      )
                    }
                    className="rounded-full bg-coral/10 p-2 text-coral"
                  >
                    <Trash2
                      size={16}
                    />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip className="bg-mint/15">
                    {missionLabel(
                      store.shopping_mission
                    )}
                  </Chip>

                  <Chip>
                    {frequencyLabel(
                      store.visit_frequency
                    )}
                  </Chip>
                </div>
              </Card>
            )
          )}
        </div>
      )}

      {savedStores.length < 5 && (
        <>
          <Card className="mt-4 p-5">
            <h3 className="text-xl font-black">
              Add a regular store
            </h3>

            <label className="mt-5 block">
              <span className="text-sm font-bold">
                Chain
              </span>

              <input
                value={chain}
                onChange={(
                  event
                ) =>
                  setChain(
                    event.target
                      .value
                  )
                }
                placeholder="Konzum"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold">
                Store name
              </span>

              <input
                value={
                  storeName
                }
                onChange={(
                  event
                ) =>
                  setStoreName(
                    event.target
                      .value
                  )
                }
                placeholder="Konzum Radnička"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold">
                Address
              </span>

              <input
                value={
                  address
                }
                onChange={(
                  event
                ) =>
                  setAddress(
                    event.target
                      .value
                  )
                }
                placeholder="Radnička cesta 49, Zagreb"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
              />
            </label>

            <div className="mt-5">
              <p className="mb-3 text-sm font-bold">
                Tap the store on the map
              </p>

              <StoreMapPicker
                latitude={
                  latitude
                }
                longitude={
                  longitude
                }
                onChange={(
                  newLatitude,
                  newLongitude
                ) => {
                  setLatitude(
                    newLatitude
                  );

                  setLongitude(
                    newLongitude
                  );
                }}
              />
            </div>
          </Card>

          <Card className="mt-4 p-5">
            <h3 className="text-xl font-black">
              Why do you visit this store?
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {shoppingMissions.map(
                (mission) => {
                  const Icon =
                    mission.icon;

                  const selected =
                    shoppingMission ===
                    mission.value;

                  return (
                    <button
                      type="button"
                      key={
                        mission.value
                      }
                      onClick={() =>
                        setShoppingMission(
                          mission.value
                        )
                      }
                      className={`rounded-2xl border p-4 text-left ${
                        selected
                          ? "border-mint bg-mint/15"
                          : "border-black/10 bg-white"
                      }`}
                    >
                      <Icon
                        size={20}
                      />

                      <p className="mt-3 font-black">
                        {
                          mission.label
                        }
                      </p>

                      <p className="mt-1 text-xs text-ink/45">
                        {
                          mission.description
                        }
                      </p>
                    </button>
                  );
                }
              )}
            </div>

            <h3 className="mt-6 text-xl font-black">
              How often?
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {frequencies.map(
                (frequency) => (
                  <button
                    type="button"
                    key={
                      frequency.value
                    }
                    onClick={() =>
                      setVisitFrequency(
                        frequency.value
                      )
                    }
                  >
                    <Chip
                      className={
                        visitFrequency ===
                        frequency.value
                          ? "bg-ink text-white"
                          : "bg-cream"
                      }
                    >
                      {
                        frequency.label
                      }
                    </Chip>
                  </button>
                )
              )}
            </div>

            <Button
              type="button"
              disabled={saving}
              className="mt-6 w-full"
              onClick={() =>
                void addStore()
              }
            >
              <Plus
                className="mr-2 inline"
                size={18}
              />

              {saving
                ? "Saving…"
                : "Add regular store"}
            </Button>
          </Card>
        </>
      )}

      {error && (
        <div className="mt-4 rounded-2xl bg-coral/10 p-4 text-sm font-semibold text-coral">
          {error}
        </div>
      )}

      <Button
        type="button"
        disabled={
          savedStores.length ===
          0
        }
        className="mt-5 w-full bg-coral py-4"
        onClick={
          finishOnboarding
        }
      >
        Continue to jobs
      </Button>

      <p className="mt-3 text-center text-xs leading-relaxed text-ink/40">
        Polica stores only the shops you explicitly
        select here. This does not enable continuous
        background location tracking.
      </p>
    </div>
  );
}
