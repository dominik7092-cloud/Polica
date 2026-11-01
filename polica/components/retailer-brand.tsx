import { ShoppingBag } from "lucide-react";

const RETAILERS = [
  {
    match: ["konzum"],
    name: "Konzum",
    logo: "/retailers/konzum-red-v2.png",
  },
  {
    match: ["kaufland"],
    name: "Kaufland",
    logo: "/retailers/kaufland.jpg",
  },
  {
    match: ["lidl"],
    name: "Lidl",
    logo: "/retailers/lidl.png",
  },
  {
    match: ["spar", "interspar"],
    name: "SPAR",
    logo: "/retailers/spar.png",
  },
  {
    match: ["studenac"],
    name: "Studenac",
    logo: "/retailers/studenac.png",
  },
  {
    match: ["plodine"],
    name: "Plodine",
    logo: "/retailers/plodine.png",
  },
  {
    match: ["tommy"],
    name: "Tommy",
    logo: "/retailers/tommy.png",
  },
  {
  match: ["dm"],
  name: "DM",
  logo: "/retailers/dm.png",
  },
  {
    match: ["ina"],
    name: "INA",
    logo: "/retailers/ina.png",
  },
  {
    match: ["petrol"],
    name: "Petrol",
    logo: "/retailers/petrol.png",
  },
  {
    match: ["tisak"],
    name: "Tisak",
    logo: "/retailers/tisak.png",
  },
] as const;

export function getRetailerBrand(
  value: string | null | undefined
) {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase();

  return (
    RETAILERS.find((retailer) =>
      retailer.match.some((token) =>
        normalized.includes(token)
      )
    ) ?? null
  );
}

export function RetailerBrand({
  retailer,
  className = "h-14 w-16",
}: {
  retailer: string | null | undefined;
  className?: string;
}) {
  const brand =
    getRetailerBrand(retailer);

  if (!brand) {
    return (
      <div
        className={`grid shrink-0 place-items-center rounded-2xl bg-mint/15 ${className}`}
      >
        <ShoppingBag
          className="text-mint"
          size={22}
        />
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ${className}`}
    >
      <img
        src={brand.logo}
        alt={brand.name}
        className="h-full w-full object-contain p-1"
      />
    </div>
  );
}
