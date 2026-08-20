"use client";

import { RiHeadphoneLine } from "react-icons/ri";
import { useAppTranslation } from "@/hooks/use-translation";

export function HuddleEmptyState() {
  const t = useAppTranslation('huddle.emptyState')

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <RiHeadphoneLine className="size-12 text-gray-500" />
      <div className="text-center">
        <p className="text-sm font-semibold text-white">{t('noHuddlesMatchFilters')}</p>
        <p className="mt-1 text-sm text-gray-400">{t('startHuddleInChannel')}</p>
      </div>
    </div>
  );
}
