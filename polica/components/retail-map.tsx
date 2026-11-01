"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { RetailerBrand } from "./retailer-brand";
import { Card } from "./ui";
import "maplibre-gl/dist/maplibre-gl.css";

type RetailLocation = {
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
};

const PAGE_SIZE = 1000;

export function RetailMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const [locations, setLocations] = useState<RetailLocation[]>([]);
  const [selected, setSelected] = useState<RetailLocation | null>(null);
  const [retailer, setRetailer] = useState("All retailers");
  const [city, setCity] = useState("All cities");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAllLocations() {
      try {
        const client = supabase();
        const all: RetailLocation[] = [];
        let from = 0;

        while (true) {
          const { data, error: loadError } = await client
            .from("retail_locations")
            .select(
              "id,retailer,external_store_id,store_name,store_format,address,postal_code,city,country_code,latitude,longitude"
            )
            .eq("active", true)
            .eq("country_code", "HR")
            .order("retailer", { ascending: true })
            .order("city", { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

          if (loadError) throw loadError;

          const batch = (data ?? []) as RetailLocation[];
          all.push(...batch);

          if (batch.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        setLocations(
          all.filter(
            (item) =>
              Number.isFinite(Number(item.latitude)) &&
              Number.isFinite(Number(item.longitude))
          )
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Could not load retail locations."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadAllLocations();
  }, []);

  const retailers = useMemo(
    () => [
      "All retailers",
      ...Array.from(
        new Set(
          locations
            .map((item) => item.retailer)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "hr")),
    ],
    [locations]
  );

  const cities = useMemo(() => {
    const scoped =
      retailer === "All retailers"
        ? locations
        : locations.filter(
            (item) => item.retailer === retailer
          );

    return [
      "All cities",
      ...Array.from(
        new Set(
          scoped.map((item) => item.city).filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "hr")),
    ];
  }, [locations, retailer]);

  useEffect(() => {
    if (
      city !== "All cities" &&
      !cities.includes(city)
    ) {
      setCity("All cities");
    }
  }, [cities, city]);

  const filtered = useMemo(() => {
    const q = query
      .trim()
      .toLocaleLowerCase("hr-HR");

    return locations.filter((item) => {
      if (
        retailer !== "All retailers" &&
        item.retailer !== retailer
      ) {
        return false;
      }

      if (
        city !== "All cities" &&
        item.city !== city
      ) {
        return false;
      }

      if (!q) return true;

      const text = `${item.retailer} ${item.store_name} ${item.store_format ?? ""} ${item.address} ${item.city} ${item.external_store_id}`.toLocaleLowerCase(
        "hr-HR"
      );

      return text.includes(q);
    });
  }, [locations, retailer, city, query]);

  useEffect(() => {
    if (
      !containerRef.current ||
      mapRef.current
    ) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [16.2, 45.2],
      zoom: 6.2,
    });

    map.addControl(
      new maplibregl.NavigationControl(),
      "top-right"
    );

    mapRef.current = map;

    return () => {
      markerRefs.current.forEach((marker) =>
        marker.remove()
      );
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) =>
      marker.remove()
    );
    markerRefs.current = [];

    for (const location of filtered) {
      const button =
        document.createElement("button");

      button.type = "button";
      button.title = `${location.store_name} · ${location.address}`;
      button.style.width = "18px";
      button.style.height = "18px";
      button.style.borderRadius = "9999px";
      button.style.border = "2px solid white";
      button.style.background = "#ff6b5f";
      button.style.boxShadow =
        "0 2px 7px rgba(0,0,0,.25)";
      button.style.cursor = "pointer";

      button.addEventListener("click", () => {
        setSelected(location);
        map.flyTo({
          center: [
            Number(location.longitude),
            Number(location.latitude),
          ],
          zoom: Math.max(map.getZoom(), 12),
        });
      });

      const marker = new maplibregl.Marker({
        element: button,
      })
        .setLngLat([
          Number(location.longitude),
          Number(location.latitude),
        ])
        .addTo(map);

      markerRefs.current.push(marker);
    }
  }, [filtered]);

  function resetFilters() {
    setRetailer("All retailers");
    setCity("All cities");
    setQuery("");
    setSelected(null);

    mapRef.current?.flyTo({
      center: [16.2, 45.2],
      zoom: 6.2,
    });
  }

  if (loading) {
    return (
      <Card className="p-6 text-center font-bold">
        Loading retail map…
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-sm font-semibold text-coral">
        Could not load retail map: {error}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label>
            <span className="text-sm font-bold">
              Retailer
            </span>

            <select
              value={retailer}
              onChange={(e) =>
                setRetailer(e.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-mint"
            >
              {retailers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-bold">
              City
            </span>

            <select
              value={city}
              onChange={(e) =>
                setCity(e.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-mint"
            >
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-bold">
              Find store
            </span>

            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4">
              <Search size={17} />

              <input
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                placeholder="Retailer, city, address or ID"
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </label>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-ink/45">
            {filtered.length} of {locations.length} active HR locations
          </p>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full bg-cream px-3 py-2 text-xs font-bold"
          >
            Reset
          </button>
        </div>
      </Card>

      <div
        ref={containerRef}
        className="h-[65vh] min-h-[480px] w-full overflow-hidden rounded-3xl border border-black/10 bg-cream shadow-sm"
      />

      {selected && (
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <RetailerBrand
              retailer={selected.retailer}
              className="h-14 w-16"
            />

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-mint">
                {selected.retailer}
              </p>

              <h2 className="mt-1 text-xl font-black">
                {selected.store_name}
              </h2>

              <p className="mt-1 text-sm text-ink/55">
                {selected.address}
                {selected.postal_code
                  ? `, ${selected.postal_code}`
                  : ""} {selected.city}
              </p>

              <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink/45">
                {selected.store_format && (
                  <span>
                    Format: {selected.store_format}
                  </span>
                )}

                <span>
                  Store ID: {selected.external_store_id}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
