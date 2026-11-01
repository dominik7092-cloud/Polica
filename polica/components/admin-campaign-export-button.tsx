"use client";

import { Download } from "lucide-react";

export function AdminCampaignExportButton({ campaignId, locale }: { campaignId: string; locale: string }) {
  return (
    <a href={`/${locale}/admin/campaigns/${campaignId}/export`} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-4 text-sm font-black text-white">
      <Download size={16} /> Export results + pictures
    </a>
  );
}
