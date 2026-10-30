"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, Store, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Chip } from "./ui";

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

export function RetailLocationMultiPicker({
  value,
  onChange,
  maxSelected = 500,
}: {
  value: RetailLocation[];
  onChange: (locations: RetailLocation[]) => void;
  maxSelected?: number;
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

  const selectedIds = useMemo(() => new Set(value.map((item) => item.id)), [value]);

  function toggle(location: RetailLocation) {
    if (selectedIds.has(location.id)) {
      onChange(value.filter((item) => item.id !== location.id));
      return;
    }

    if (value.length >= maxSelected) return;
    onChange([...value, location]);
  }

  function selectFiltered() {
    const room = maxSelected - value.length;
    if (room <= 0) return;
    const additions = filtered.filter((item) => !selectedIds.has(item.id)).slice(0, room);
    onChange([...value, ...additions]);
  }

  if (loading) return <Card className="p-5 text-center font-bold">Loading Konzum locations…</Card>;
  if (error) return <Card className="p-5 text-sm text-coral">Could not load locations: {error}</Card>;

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
            {cities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label>
          <span className="text-sm font-bold">Find store</span>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, address or ID"
              className="w-full bg-transparent py-4 outline-none"
            />
          </div>
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-ink/40">{filtered.length} matching · {value.length} selected</p>
        <div className="flex gap-2">
          {value.length > 0 && (
            <Button type="button" className="bg-white px-3 py-2 text-xs text-ink shadow-sm" onClick={() => onChange([])}>
              Clear
            </Button>
          )}
          <Button type="button" className="px-3 py-2 text-xs" onClick={selectFiltered}>
            Select shown
          </Button>
        </div>
      </div>

      <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {filtered.map((location) => {
          const selected = selectedIds.has(location.id);
          return (
            <button
              type="button"
              key={location.id}
              onClick={() => toggle(location)}
              className={`w-full rounded-2xl border p-4 text-left ${selected ? "border-mint bg-mint/10" : "border-black/5 bg-white"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${selected ? "bg-mint text-ink" : "bg-cream"}`}>
                  {selected ? <Check size={18} /> : <Store size={18} />}
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

      {value.length > 0 && (
        <div className="mt-4 rounded-2xl bg-mint/10 p-4">
          <p className="font-black">{value.length} locations selected</p>
          <div className="mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
            {value.map((location) => (
              <button
                type="button"
                key={location.id}
                onClick={() => toggle(location)}
                className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-bold"
              >
                {location.store_name}
                <X size={12} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
