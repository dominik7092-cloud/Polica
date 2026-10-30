"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  Wallet,
  UserRound,
  Globe2,
} from "lucide-react";
import { usePathname } from "next/navigation";

export function Shell({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const nav = [
    ["jobs", BriefcaseBusiness],
    ["wallet", Wallet],
    ["profile", UserRound],
  ] as const;

  /*
   * Public/setup pages should not show
   * the Agent bottom navigation.
   */
  const hideBottomNavigation =
    pathname.includes("/auth/") ||
    pathname.includes("/onboarding");

  /*
   * Admin and Client areas also use
   * their own workspace rather than
   * the Agent navigation.
   */
  const isWorkspace =
    pathname.includes("/admin") ||
    pathname.includes("/client");

  const showBottomNavigation =
    !hideBottomNavigation &&
    !isWorkspace;

  const languagePath =
    `/${locale === "en" ? "hr" : "en"}` +
    pathname.replace(
      /^\/(en|hr)/,
      ""
    );

  return (
    <main
      className={`mx-auto min-h-screen max-w-md bg-cream ${
        showBottomNavigation
          ? "pb-28"
          : "pb-8"
      }`}
    >
      <div className="flex items-center justify-between px-5 pt-5">
        <Link
          href={`/${locale}`}
          className="text-2xl font-black tracking-tight"
        >
          polica
          <span className="text-mint">
            .
          </span>
        </Link>

        <Link
          aria-label="Change language"
          className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold shadow-sm"
          href={languagePath}
        >
          <Globe2 size={15} />

          {locale.toUpperCase()}
        </Link>
      </div>

      {children}

      {showBottomNavigation && (
        <nav className="glass safe-bottom fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-md justify-around border-t border-black/5 px-4 pt-3">
          {nav.map(
            ([route, Icon]) => {
              const active =
                pathname.includes(
                  `/${route}`
                );

              return (
                <Link
                  key={route}
                  href={`/${locale}/${route}`}
                  className={`flex min-w-20 flex-col items-center gap-1 text-[11px] font-bold ${
                    active
                      ? "text-ink"
                      : "text-ink/40"
                  }`}
                >
                  <Icon size={21} />

                  <span className="capitalize">
                    {route}
                  </span>
                </Link>
              );
            }
          )}
        </nav>
      )}
    </main>
  );
}
