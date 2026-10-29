export type StorePreference = {
  id: string;
  store_name: string;
  chain: string;
  address: string;
  lat: number;
  lng: number;
  shopping_mission: string;
  visit_frequency: string;
};

export type RoutineMatch = {
  isRoutineMatch: boolean;
  matchType: "exact" | "nearby" | null;
  distanceMeters: number | null;
  shoppingMission: string | null;
  visitFrequency: string | null;
  regularStoreName: string | null;
  routineScore: number;
};

const frequencyScore: Record<string, number> = {
  several_times_week: 40,
  weekly: 30,
  two_three_month: 20,
  occasionally: 10,
};

export function distanceInMeters(
  firstLat: number,
  firstLng: number,
  secondLat: number,
  secondLng: number
) {
  const earthRadius = 6371000;
  const radians = Math.PI / 180;

  const latitudeDifference =
    (secondLat - firstLat) * radians;

  const longitudeDifference =
    (secondLng - firstLng) * radians;

  const calculation =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLat * radians) *
      Math.cos(secondLat * radians) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    2 *
    earthRadius *
    Math.asin(Math.sqrt(calculation))
  );
}

export function findRoutineMatch(
  jobLat: number,
  jobLng: number,
  preferences: StorePreference[]
): RoutineMatch {
  if (
    !Number.isFinite(jobLat) ||
    !Number.isFinite(jobLng) ||
    preferences.length === 0
  ) {
    return {
      isRoutineMatch: false,
      matchType: null,
      distanceMeters: null,
      shoppingMission: null,
      visitFrequency: null,
      regularStoreName: null,
      routineScore: 0,
    };
  }

  const matches = preferences
    .map((preference) => {
      const distance = distanceInMeters(
        jobLat,
        jobLng,
        preference.lat,
        preference.lng
      );

      let locationScore = 0;
      let matchType: "exact" | "nearby" | null =
        null;

      if (distance <= 150) {
        locationScore = 100;
        matchType = "exact";
      } else if (distance <= 500) {
        locationScore = 60;
        matchType = "nearby";
      }

      const score =
        locationScore +
        (frequencyScore[
          preference.visit_frequency
        ] ?? 0);

      return {
        preference,
        distance,
        score,
        matchType,
      };
    })
    .filter((match) => match.matchType !== null)
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.distance - second.distance;
    });

  const bestMatch = matches[0];

  if (!bestMatch) {
    return {
      isRoutineMatch: false,
      matchType: null,
      distanceMeters: null,
      shoppingMission: null,
      visitFrequency: null,
      regularStoreName: null,
      routineScore: 0,
    };
  }

  return {
    isRoutineMatch: true,
    matchType: bestMatch.matchType,
    distanceMeters: Math.round(bestMatch.distance),
    shoppingMission:
      bestMatch.preference.shopping_mission,
    visitFrequency:
      bestMatch.preference.visit_frequency,
    regularStoreName:
      bestMatch.preference.store_name,
    routineScore: bestMatch.score,
  };
}

export function shoppingMissionLabel(
  value: string | null
) {
  switch (value) {
    case "main_shop":
      return "Main shop";

    case "top_up":
      return "Top-up";

    case "quick_stop":
      return "Quick stop";

    case "fuel":
      return "Fuel stop";

    case "other":
      return "Regular visit";

    default:
      return "";
  }
}

export function visitFrequencyLabel(
  value: string | null
) {
  switch (value) {
    case "several_times_week":
      return "Several times/week";

    case "weekly":
      return "Weekly";

    case "two_three_month":
      return "2–3 times/month";

    case "occasionally":
      return "Occasionally";

    default:
      return "";
  }
}
