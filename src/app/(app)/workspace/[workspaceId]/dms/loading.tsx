import { SearchResultsSkeleton } from "@/components/loading-skeletons"

export default function Loading() {
  return <SearchResultsSkeleton titleWidth="w-28" resultCount={5} />
}
