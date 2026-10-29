"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import maplibregl, {
  Map as MapLibreMap,
  Marker,
} from "maplibre-gl";
import {
  LocateFixed,
  MapPin,
} from "lucide-react";
import { Button } from "./ui";

type StoreMapPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onChange: (
    latitude: number,
    longitude: number
  ) => void;
};

export function StoreMapPicker({
  latitude,
  longitude,
  onChange,
}: StoreMapPickerProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const mapRef =
    useRef<MapLibreMap | null>(
      null
    );

  const markerRef =
    useRef<Marker | null>(
      null
    );

  const [
    locating,
    setLocating,
  ] = useState(false);

  const [
    locationError,
    setLocationError,
  ] = useState("");

  useEffect(() => {
    if (
      !containerRef.current ||
      mapRef.current
    ) {
      return;
    }

    const initialLng =
      longitude ?? 15.9819;

    const initialLat =
      latitude ?? 45.815;

    const map =
      new maplibregl.Map({
        container:
          containerRef.current,

        center: [
          initialLng,
          initialLat,
        ],

        zoom:
          latitude !== null &&
          longitude !== null
            ? 15
            : 11,

        style: {
          version: 8,

          sources: {
            osm: {
              type: "raster",

              tiles: [
                "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],

              tileSize: 256,

              attribution:
                "© OpenStreetMap contributors",
            },
          },

          layers: [
            {
              id: "osm",

              type: "raster",

              source: "osm",
            },
          ],
        },
      });

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
      }),
      "top-right"
    );

    map.on(
      "click",
      (event) => {
        const {
          lng,
          lat,
        } = event.lngLat;

        onChange(
          Number(
            lat.toFixed(6)
          ),
          Number(
            lng.toFixed(6)
          )
        );
      }
    );

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map =
      mapRef.current;

    if (
      !map ||
      latitude === null ||
      longitude === null
    ) {
      return;
    }

    markerRef.current?.remove();

    const marker =
      new maplibregl.Marker({
        color: "#ff6b57",
      })
        .setLngLat([
          longitude,
          latitude,
        ])
        .addTo(map);

    markerRef.current =
      marker;

    map.flyTo({
      center: [
        longitude,
        latitude,
      ],

      zoom: Math.max(
        map.getZoom(),
        15
      ),

      essential: true,
    });
  }, [
    latitude,
    longitude,
  ]);

  function useMyLocation() {
    setLocationError("");

    if (
      !navigator.geolocation
    ) {
      setLocationError(
        "Location services are not available on this device."
      );

      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat =
          Number(
            position.coords.latitude.toFixed(
              6
            )
          );

        const newLng =
          Number(
            position.coords.longitude.toFixed(
              6
            )
          );

        onChange(
          newLat,
          newLng
        );

        setLocating(false);
      },

      () => {
        setLocationError(
          "Location permission was not granted."
        );

        setLocating(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white">
        <div
          ref={containerRef}
          className="h-[330px] w-full"
        />
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          className="flex-1 bg-white text-ink shadow-sm"
          onClick={
            useMyLocation
          }
          disabled={locating}
        >
          <LocateFixed
            className="mr-2 inline"
            size={17}
          />

          {locating
            ? "Locating…"
            : "Use my location"}
        </Button>
      </div>

      {latitude !== null &&
        longitude !== null && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-mint/10 p-3 text-sm">
            <MapPin
              className="mt-0.5 shrink-0 text-mint"
              size={18}
            />

            <div>
              <p className="font-bold">
                Store location selected
              </p>

              <p className="mt-1 text-xs text-ink/45">
                {latitude.toFixed(
                  6
                )}
                ,{" "}
                {longitude.toFixed(
                  6
                )}
              </p>
            </div>
          </div>
        )}

      {locationError && (
        <p className="mt-3 text-sm text-coral">
          {locationError}
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink/40">
        Tap the exact store
        location on the map. This
        pin is used for mission GPS
        verification.
      </p>
    </div>
  );
}
