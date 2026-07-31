'use client'

import { ChevronRight, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Typography from "@/components/ui/typography";
import type { User } from "@/lib/types";

import { accountSections, footerLinks } from "./constants";
import { getDisplayName } from "./helpers";
import { SettingsRow } from "./settings-row";

export function AccountSection({
  greetingName,
  displayUser,
}: {
  greetingName: string;
  displayUser: User | null;
}) {
  const currentUserInitial = getDisplayName(
    displayUser?.displayName ?? displayUser?.name,
    displayUser?.email,
  )
    .slice(0, 1)
    .toUpperCase();

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-sm bg-[#f7d71e]" />
        <Typography
          as="h1"
          variant="h3"
          className="text-[28px] font-bold tracking-[-0.03em] text-[#1d1c1d] md:text-[36px]"
        >
          Hello {greetingName}!
        </Typography>
      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden rounded-[4px] border-[#d9d7da] bg-white py-0 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
          <div className="px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] bg-[#1d76b8] text-white">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <Typography
                  as="h3"
                  variant="h6"
                  className="text-[18px] leading-none tracking-[-0.02em] text-[#1d1c1d] md:text-[20px]"
                >
                  Account Settings
                </Typography>
                <Typography
                  variant="muted"
                  className="mt-1.5 max-w-[780px] text-[13px] leading-5 text-[#616061] md:text-[14px]"
                >
                  Edit your profile, update your username and password, and manage other account settings.
                </Typography>
              </div>
              <ChevronRight className="hidden h-5 w-5 shrink-0 text-[#d8d3d8] sm:mt-2.5 sm:block" />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-[4px] border-[#d9d7da] bg-white py-0 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
          <div className="px-4 py-3 md:px-6 md:py-4">
            <SettingsRow item={accountSections[0]} />
            <SettingsRow item={accountSections[1]} />

            <Separator className="my-2 bg-[#ece8ec]" />

            <SettingsRow item={accountSections[2]} />
            <SettingsRow item={accountSections[3]} />
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-8 pt-6 text-[13px] text-[#616061] md:gap-x-6">
          {footerLinks.map((link) => (
            <a key={link} href="#" className="hover:text-[#1d1c1d] hover:underline">
              {link}
            </a>
          ))}
        </div>

        <div className="hidden border-t border-[#efecf0] p-4 xl:block">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 rounded-sm bg-[#f7d71e]">
              <AvatarImage src={displayUser?.avatar ?? ""} alt={greetingName} />
              <AvatarFallback className="rounded-sm bg-[#f7d71e] text-[13px] font-semibold text-[#1d1c1d]">
                {currentUserInitial}
              </AvatarFallback>
            </Avatar>
            <Typography variant="small" className="text-[14px] font-semibold text-[#1d1c1d]">
              {greetingName}
            </Typography>
          </div>
        </div>
      </div>
    </>
  );
}
