"use client";

import { RiHeadphoneLine } from "react-icons/ri";

export function HuddleEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <RiHeadphoneLine className="size-12 text-gray-500" />
      <div className="text-center">
        <p className="text-sm font-semibold text-white">No huddles match your filters</p>
        <p className="mt-1 text-sm text-gray-400">Start a huddle in a channel to see it here.</p>
      </div>
    </div>
  );
}
