import { Skeleton } from "@/components/ui/skeleton";

export default function LaterLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white dark:bg-[#1A1D21]">
      <div className="flex flex-col items-center space-y-4">
        {/* Skeleton for the empty state image */}
        <Skeleton className="w-[360px] h-[360px] rounded-full opacity-20" />
        {/* Optional text skeletons */}
        <Skeleton className="h-4 w-48 opacity-20" />
        <Skeleton className="h-3 w-32 opacity-10" />
      </div>
    </div>
  );
}
