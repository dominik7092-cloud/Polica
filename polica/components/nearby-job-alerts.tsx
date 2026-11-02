"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { BackgroundGeolocation } from "@capgo/background-geolocation";
import { LocalNotifications } from "@capacitor/local-notifications";

type NearbyJob = { id: string; storeId: string; chain: string; address: string; reward: number; lat: number; lng: number };
type Props = { jobs: NearbyJob[]; hr: boolean };

const RADIUS_METERS = 200;

function notificationId(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash % 2147483647) || 1;
}

export function NearbyJobAlerts({ jobs, hr }: Props) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listener: { remove: () => Promise<void> } | null = null;
    let cancelled = false;

    async function configure() {
      const valid = jobs.filter((j) => Number.isFinite(j.lat) && Number.isFinite(j.lng) && (j.lat !== 0 || j.lng !== 0));
      if (!valid.length) return;

      let notificationPermission = await LocalNotifications.checkPermissions();
      if (notificationPermission.display !== "granted") notificationPermission = await LocalNotifications.requestPermissions();
      if (notificationPermission.display !== "granted") return;

      await BackgroundGeolocation.requestPermissions({ permissions: ["location", "backgroundLocation", "notification"] });
      await BackgroundGeolocation.setupGeofencing({ backgroundLocation: true, notifyOnEntry: true, notifyOnExit: false });
      await BackgroundGeolocation.removeAllGeofences();

      const grouped = new Map<string, NearbyJob[]>();
      for (const job of valid) {
        const key = `${job.chain.trim().toLowerCase()}::${job.address.trim().toLowerCase()}`;
        grouped.set(key, [...(grouped.get(key) ?? []), job]);
      }

      const lookup = new Map<string, NearbyJob[]>();
      let index = 0;
      for (const storeJobs of Array.from(grouped.values())) {
        const first = storeJobs[0];
        const identifier = `polica-store-${index}-${first.storeId}`;
        index += 1;
        lookup.set(identifier, storeJobs);
        await BackgroundGeolocation.addGeofence({ identifier, latitude: first.lat, longitude: first.lng, radius: RADIUS_METERS });
      }

      if (cancelled) return;
      listener = await BackgroundGeolocation.addListener("geofenceTransition", async (event) => {
        if (event.transition !== "enter") return;
        const storeJobs = lookup.get(event.identifier);
        if (!storeJobs?.length) return;
        const first = storeJobs[0];
        const reward = Math.max(...storeJobs.map((job) => job.reward));
        await LocalNotifications.schedule({ notifications: [{
          id: notificationId(event.identifier),
          title: hr ? "Polica prilika u blizini" : "Polica job nearby",
          body: hr ? `U blizini si ${first.chain} trgovine. Dostupna je provjera do €${reward.toFixed(2)}.` : `You're near ${first.chain}. A check worth up to €${reward.toFixed(2)} is available.`,
          extra: { storeId: first.storeId }
        }] });
      });
    }

    void configure().catch((error) => console.error("Nearby job alerts setup failed", error));
    return () => { cancelled = true; if (listener) void listener.remove(); };
  }, [jobs, hr]);

  return null;
}
