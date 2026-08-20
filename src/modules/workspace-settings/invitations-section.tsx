'use client'

import Typography from "@/components/ui/typography";
import { useAppTranslation } from "@/hooks/use-translation";

export function PeopleInvitationsSection() {
  const t = useAppTranslation("workspaceSettings");
  return (
    <div className="rounded-[4px] border border-[#d9d7da] bg-white p-4 sm:p-6">
      <Typography as="h2" variant="h4" className="text-[20px] font-bold tracking-[-0.02em] text-[#1d1c1d] sm:text-[22px]">
        {t("invitationsSection.invitations")}
      </Typography>
      <Typography variant="muted" className="mt-2 text-[13px] leading-5 text-[#616061] sm:text-[14px]">
        {t("invitationsSection.invitationHistoryNotConnected")}
      </Typography>
    </div>
  );
}
