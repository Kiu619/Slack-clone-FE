"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ACTIVE_ITEM_STYLE } from "@/constants/styles";
import { cn } from "@/lib/utils";
import { useAppTranslation } from "@/hooks/use-translation";

type HuddlePaginationProps = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

function getPaginationPages(currentPage: number, totalPages: number): (number | "...")[] {
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  pages.push(1);

  if (currentPage > 3) pages.push("...");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (currentPage < totalPages - 2) pages.push("...");

  pages.push(totalPages);

  return pages;
}

export function HuddlePagination({
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
}: HuddlePaginationProps) {
  const t = useAppTranslation('huddle.pagination')
  const paginationPages = getPaginationPages(currentPage, totalPages);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 rounded-[4px] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
      <div className="text-[13px] text-[#616061]">
        {t('pageOf', { current: currentPage, total: totalPages, pageSize: pageSize })}
      </div>

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent className="flex-nowrap gap-1">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (currentPage > 1) onPageChange(currentPage - 1);
              }}
              className={cn(
                "h-8 rounded-md px-2 text-[13px] hover:bg-selection-hover hover:text-white",
                currentPage <= 1 && "pointer-events-none opacity-50",
              )}
            />
          </PaginationItem>

          {paginationPages.map((item, index) => {
            if (item === "...") {
              return (
                <PaginationItem key={`ellipsis-${index}`} className="shrink-0">
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            return (
              <PaginationItem key={item} className="shrink-0">
                <PaginationLink
                  href="#"
                  isActive={item === currentPage}
                  className={cn(
                    "h-8 min-w-8 rounded-md px-2 text-[13px] hover:bg-selection-hover hover:text-white",
                    item === currentPage && ACTIVE_ITEM_STYLE,
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(item);
                  }}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (currentPage < totalPages) onPageChange(currentPage + 1);
              }}
              className={cn(
                "h-8 rounded-md px-2 text-[13px] hover:bg-selection-hover hover:text-white",
                currentPage >= totalPages && "pointer-events-none opacity-50",
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
