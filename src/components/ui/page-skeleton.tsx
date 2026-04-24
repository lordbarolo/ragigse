import { Skeleton } from "@/components/ui/skeleton";

/**
 * Återanvändbara skeleton-mönster som speglar layouten på huvudvyer.
 * Snabbare upplevd laddning än centrerad spinner.
 */

export function ProfilePageSkeleton() {
  return (
    <div className="relative min-h-screen bg-[#F2F1F8] overflow-hidden">
      <div className="h-16 border-b border-border/50 bg-background" />
      <div className="relative pt-20 pb-12 px-4 max-w-5xl mx-auto space-y-5">
        {/* Hero */}
        <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        {/* Tabs */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function RadarPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2 flex-1 max-w-xl">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReferencesPageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="h-16 border-b border-border/50 bg-background" />
      <div className="pt-20 px-4 max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-56 rounded-2xl" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
