"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, Chip } from "./ui";

export type RetailLocation = {
  id: string;
  retailer: string;
  external_store_id: string;
  store_name: string;
  store_format: string | null;
  address: string;
  postal_code: string | null;
  city: string;
  country_code: string;
  latitude: number;
  longitude: number;
  seasonal: boolean;
};

export function RetailLocationPicker({
  value,
  onChange,
}: {
  value: RetailLocation | null;
  onChange: (location: RetailLocation) => void;
}) {
  const [locations, setLocations] = useState<RetailLocation[]>([]);
  const [city, setCity] = useState("All cities");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const client = supabase();
      const { data, error: loadError } = await client
        .from("retail_locations")
        .select(`
          id,
          retailer,
          external_store_id,
          store_name,
          store_format,
          address,
          postal_code,
          city,
          country_code,
          latitude,
          longitude,
          seasonal
        `)
        .eq("retailer", "Konzum")
        .eq("active", true)
        .order("city", { ascending: true })
        .order("store_name", { ascending: true });

      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }

      setLocations((data ?? []) as RetailLocation[]);
      setLoading(false);
    }

    void load();
  }, []);

  const cities = useMemo(
    () => ["All cities", ...Array.from(new Set(locations.map((item) => item.city))).sort()],
    [locations]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return locations.filter((item) => {
      const matchesCity = city === "All cities" || item.city === city;
      const text = `${item.store_name} ${item.store_format ?? ""} ${item.address} ${item.city} ${item.external_store_id}`.toLowerCase();
      return matchesCity && (!q || text.includes(q));
    });
  }, [locations, city, query]);

  if (loading) {
    return <Card className="p-5 text-center font-bold">Loading Konzum locations…</Card>;
  }

  if (error) {
    return <Card className="p-5 text-sm text-coral">Could not load Konzum locations: {error}</Card>;
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="text-sm font-bold">City</span>
          <select
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-mint"
          >
            {cities.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-bold">Find store</span>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, address or store ID"
              className="w-full bg-transparent py-4 outline-none"
            />
          </div>
        </label>
      </div>

      <p className="mt-3 text-xs font-semibold text-ink/40">{filtered.length} Konzum locations</p>

      <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
        {filtered.map((location) => {
          const selected = value?.id === location.id;
          return (
            <button
              type="button"
              key={location.id}
              onClick={() => onChange(location)}
              className={`w-full rounded-2xl border p-4 text-left ${
                selected ? "border-mint bg-mint/10" : "border-black/5 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream">
                  <Store size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black">{location.store_name}</p>
                    {location.store_format && <Chip>{location.store_format}</Chip>}
                    {location.seasonal && <Chip className="bg-amber-100">Seasonal</Chip>}
                  </div>
                  <p className="mt-1 text-xs text-ink/50">{location.address}, {location.city}</p>
                  <p className="mt-1 text-[10px] text-ink/35">Store ID {location.external_store_id}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {value && (
        <div className="mt-4 rounded-2xl bg-mint/10 p-4">
          <p className="flex items-center gap-2 font-black">
            <MapPin className="text-mint" size={18} />
            Selected location
          </p>
          <p className="mt-2 text-sm">{value.store_name}</p>
          <p className="text-xs text-ink/50">{value.address}, {value.city}</p>
          <p className="mt-1 text-[10px] text-ink/35">
            {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
}
