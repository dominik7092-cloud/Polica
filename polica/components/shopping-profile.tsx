"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Fuel,
  MapPin,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { RetailerBrand } from "./retailer-brand";
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

type RetailLocation = {
  id: string;
  retailer: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
};

const retailers = [
  "Konzum",
  "Kaufland",
  "Lidl",
  "SPAR",
  "Studenac",
  "Plodine",
  "Tommy",
  "INA",
  "Petrol",
  "Tisak",
]; as const;

const shoppingMissions = [
  { value: "main_shop", label: "Main shop", description: "Large grocery shopping", icon: ShoppingCart },
  { value: "top_up", label: "Top-up", description: "Smaller grocery trips", icon: Plus },
  { value: "quick_stop", label: "Quick stop", description: "Convenience purchases", icon: Zap },
  { value: "fuel", label: "Fuel", description: "Fuel or petrol-station visit", icon: Fuel },
  { value: "other", label: "Other", description: "Another regular visit", icon: Store },
];

const frequencies = [
  { value: "several_times_week", label: "Several times/week" },
  { value: "weekly", label: "Weekly" },
  { value: "two_three_month", label: "2–3 times/month" },
  { value: "occasionally", label: "Occasionally" },
];

export function ShoppingProfile({ locale }: { locale: string }) {
  const router = useRouter();
  const [savedStores, setSavedStores] = useState<SavedStore[]>([]);
  const [chain, setChain] = useState("");
  const [locations, setLocations] = useState<RetailLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [shoppingMission, setShoppingMission] = useState("main_shop");
  const [visitFrequency, setVisitFrequency] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function loadStores() {
    const client = supabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    const { data, error: loadError } = await client
      .from("agent_store_preferences")
      .select("id,store_name,chain,address,lat,lng,shopping_mission,visit_frequency")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: true });

    if (loadError) setError(loadError.message);
    else setSavedStores((data ?? []) as SavedStore[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadStores();
  }, []);

  useEffect(() => {
    setSelectedLocationId("");
    setLocationSearch("");
    setLocations([]);
    setError("");

    if (!chain) return;

    async function loadLocations() {
      setLocationsLoading(true);
      const client = supabase();
      const { data, error: locationError } = await client
        .from("retail_locations")
        .select("id,retailer,address,city,latitude,longitude")
        .eq("retailer", chain)
        .eq("active", true)
        .order("city", { ascending: true })
        .order("address", { ascending: true });

      if (locationError) {
        setError(locationError.message);
        setLocations([]);
      } else {
        setLocations((data ?? []) as RetailLocation[]);
      }
      setLocationsLoading(false);
    }

    void loadLocations();
  }, [chain]);

  const filteredLocations = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();
    if (!query) return locations.slice(0, 50);
    return locations
      .filter((location) =>
        `${location.city} ${location.address}`.toLowerCase().includes(query)
      )
      .slice(0, 50);
  }, [locations, locationSearch]);

  const selectedLocation = locations.find((location) => location.id === selectedLocationId) ?? null;

  async function addStore() {
    setError("");

    if (savedStores.length >= 5) {
      setError("You can save up to 5 stores.");
      return;
    }

    if (!chain || !selectedLocation) {
      setError("Choose a retailer and one of its stores.");
      return;
    }

    const duplicate = savedStores.some(
      (store) =>
        store.chain.trim().toLowerCase() === selectedLocation.retailer.trim().toLowerCase() &&
        store.address.trim().toLowerCase() ===
          `${selectedLocation.address}, ${selectedLocation.city}`.trim().toLowerCase()
    );

    if (duplicate) {
      setError("This store is already in your list.");
      return;
    }

    setSaving(true);
    const client = supabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    const fullAddress = `${selectedLocation.address}, ${selectedLocation.city}`;
    const storeName = `${selectedLocation.retailer} · ${selectedLocation.city}`;

    const { data, error: saveError } = await client
      .from("agent_store_preferences")
      .insert({
        agent_id: user.id,
        store_name: storeName,
        chain: selectedLocation.retailer,
        address: fullAddress,
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
        shopping_mission: shoppingMission,
        visit_frequency: visitFrequency,
      })
      .select("id,store_name,chain,address,lat,lng,shopping_mission,visit_frequency")
      .single();

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setSavedStores((current) => [...current, data as SavedStore]);
    setSelectedLocationId("");
    setLocationSearch("");
    setShoppingMission("main_shop");
    setVisitFrequency("weekly");
    setSaving(false);
  }

  async function removeStore(id: string) {
    setError("");
    const client = supabase();
    const { error: deleteError } = await client
      .from("agent_store_preferences")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSavedStores((current) => current.filter((store) => store.id !== id));
  }

  function finish() {
    setComplete(true);
    window.setTimeout(() => {
      router.push(`/${locale}/profile`);
      router.refresh();
    }, 500);
  }

  function missionLabel(value: string) {
    return shoppingMissions.find((item) => item.value === value)?.label ?? value;
  }

  function frequencyLabel(value: string) {
    return frequencies.find((item) => item.value === value)?.label ?? value;
  }

  if (loading) {
    return <Card className="mt-6 p-7 text-center"><p className="font-black">Loading your stores…</p></Card>;
  }

  if (complete) {
    return (
      <Card className="mt-6 p-8 text-center">
        <CheckCircle2 className="mx-auto text-mint" size={54} />
        <h2 className="mt-4 text-3xl font-black">Stores updated</h2>
        <p className="mt-2 text-sm text-ink/55">Polica will use these stores to keep nearby opportunities relevant.</p>
      </Card>
    );
  }

  return (
    <div className="mt-6">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-mint">Stores I shop at</p>
            <h2 className="mt-1 text-2xl font-black">Choose up to 5 stores</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/55">
              Choose the retailer first, then select one of its loaded store locations. No map or manual address entry is needed.
            </p>
          </div>
          <Chip>{savedStores.length}/5</Chip>
        </div>
      </Card>

      {savedStores.length > 0 && (
        <div className="mt-4 space-y-3">
          {savedStores.map((store) => (
            <Card key={store.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <RetailerBrand retailer={store.chain} className="h-11 w-12" />
                  <div className="min-w-0">
                    <p className="font-black">{store.store_name}</p>
                    <p className="mt-1 text-xs text-ink/40">{store.address}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remove store"
                  onClick={() => void removeStore(store.id)}
                  className="rounded-full bg-coral/10 p-2 text-coral"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip className="bg-mint/15">{missionLabel(store.shopping_mission)}</Chip>
                <Chip>{frequencyLabel(store.visit_frequency)}</Chip>
              </div>
            </Card>
          ))}
        </div>
      )}

      {savedStores.length < 5 && (
        <>
          <Card className="mt-4 p-5">
            <h3 className="text-xl font-black">Add a store</h3>

            <label className="mt-5 block">
              <span className="text-sm font-bold">1. Choose retailer</span>
              <select
                value={chain}
                onChange={(event) => setChain(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
              >
                <option value="">Select retailer</option>
                {RETAILERS.map((retailer) => <option key={retailer} value={retailer}>{retailer}</option>)}
              </select>
            </label>

            {chain && (
              <div className="mt-5">
                <span className="text-sm font-bold">2. Choose store</span>

                {locationsLoading ? (
                  <div className="mt-2 rounded-2xl bg-cream p-4 text-sm font-bold">Loading {chain} stores…</div>
                ) : locations.length === 0 ? (
                  <div className="mt-2 rounded-2xl bg-cream p-4">
                    <p className="font-black">No {chain} stores loaded yet</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink/45">
                      Once a {chain} location master is imported into retail_locations, its stores will automatically appear here.
                    </p>
                  </div>
                ) : (
                  <>
                    <label className="mt-2 flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4">
                      <Search size={17} className="text-ink/40" />
                      <input
                        value={locationSearch}
                        onChange={(event) => setLocationSearch(event.target.value)}
                        placeholder={`Search ${chain} by city or address`}
                        className="w-full bg-transparent py-4 outline-none"
                      />
                    </label>

                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-cream p-2">
                      {filteredLocations.map((location) => {
                        const selected = selectedLocationId === location.id;
                        return (
                          <button
                            type="button"
                            key={location.id}
                            onClick={() => setSelectedLocationId(location.id)}
                            className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left ${
                              selected ? "bg-mint/20 ring-1 ring-mint" : "bg-white"
                            }`}
                          >
                            <MapPin className="mt-0.5 shrink-0 text-mint" size={17} />
                            <div>
                              <p className="font-black">{location.city}</p>
                              <p className="mt-0.5 text-xs text-ink/45">{location.address}</p>
                            </div>
                          </button>
                        );
                      })}

                      {filteredLocations.length === 0 && (
                        <p className="p-4 text-center text-sm text-ink/45">No matching stores.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>

          {selectedLocation && (
            <Card className="mt-4 p-5">
              <h3 className="text-xl font-black">Your routine</h3>

              <p className="mt-4 text-sm font-bold">Why do you visit this store?</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {shoppingMissions.map((mission) => {
                  const Icon = mission.icon;
                  const selected = shoppingMission === mission.value;
                  return (
                    <button
                      type="button"
                      key={mission.value}
                      onClick={() => setShoppingMission(mission.value)}
                      className={`rounded-2xl border p-4 text-left ${
                        selected ? "border-mint bg-mint/15" : "border-black/10 bg-white"
                      }`}
                    >
                      <Icon size={20} />
                      <p className="mt-3 font-black">{mission.label}</p>
                      <p className="mt-1 text-xs text-ink/45">{mission.description}</p>
                    </button>
                  );
                })}
              </div>

              <p className="mt-6 text-sm font-bold">How often?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {frequencies.map((frequency) => (
                  <button
                    type="button"
                    key={frequency.value}
                    onClick={() => setVisitFrequency(frequency.value)}
                  >
                    <Chip className={visitFrequency === frequency.value ? "bg-ink text-white" : "bg-cream"}>
                      {frequency.label}
                    </Chip>
                  </button>
                ))}
              </div>

              <Button type="button" disabled={saving} className="mt-6 w-full" onClick={() => void addStore()}>
                <Plus className="mr-2 inline" size={18} />
                {saving ? "Saving…" : "Add to my stores"}
              </Button>
            </Card>
          )}
        </>
      )}

      {error && <div className="mt-4 rounded-2xl bg-coral/10 p-4 text-sm font-semibold text-coral">{error}</div>}

      <Button type="button" className="mt-5 w-full bg-coral py-4" onClick={finish}>
        Done
      </Button>

      <p className="mt-3 text-center text-xs leading-relaxed text-ink/40">
        Store choices are saved only when you add them. Polica does not continuously track your location.
      </p>
    </div>
  );
}
