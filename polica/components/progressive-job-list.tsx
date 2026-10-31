"use client";

import { ReactNode, useEffect, useState } from "react";

export function ProgressiveJobList({ total, children, pageSize = 10 }: { total: number; children: (visibleCount: number) => ReactNode; pageSize?: number }) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  useEffect(() => setVisibleCount(pageSize), [total, pageSize]);
  const shown = Math.min(visibleCount, total);
  return (
    <>
      {children(shown)}
      {total > 0 && <p className="mt-4 text-center text-xs font-semibold text-ink/40">Showing {shown} of {total} checks</p>}
      {shown < total && (
        <button type="button" onClick={() => setVisibleCount((current) => Math.min(current + pageSize, total))} className="mt-3 w-full rounded-2xl bg-white px-4 py-4 text-sm font-black text-ink shadow-sm">
          Show {Math.min(pageSize, total - shown)} more checks
        </button>
      )}
      {shown > pageSize && (
        <button type="button" onClick={() => { setVisibleCount(pageSize); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-3 w-full py-3 text-xs font-bold text-ink/45">Collapse list</button>
      )}
    </>
  );
}
