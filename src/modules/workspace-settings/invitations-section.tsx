'use client'

import Typography from "@/components/ui/typography";

export function PeopleInvitationsSection() {
  return (
    <div className="rounded-[4px] border border-[#d9d7da] bg-white p-4 sm:p-6">
      <Typography as="h2" variant="h4" className="text-[20px] font-bold tracking-[-0.02em] text-[#1d1c1d] sm:text-[22px]">
        Invitations
      </Typography>
      <Typography variant="muted" className="mt-2 text-[13px] leading-5 text-[#616061] sm:text-[14px]">
        Invitation history is not connected in the current backend yet.
      </Typography>
    </div>
  );
}
