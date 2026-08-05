/**
 * Skeleton loading states for cards and tables
 * Improves perceived performance during data fetches
 */

export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow-sm border border-zinc-200 dark:border-zinc-800 animate-pulse">
          <div className="space-y-3">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
          </div>
        </div>
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      {/* Header skeleton */}
      <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded flex-1 animate-pulse" />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 border-b border-zinc-100 dark:border-zinc-900 py-3">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="h-3 bg-zinc-100 dark:bg-zinc-900/50 rounded flex-1 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-800 rounded-lg p-3 sm:p-4 shadow-sm border border-zinc-200 dark:border-zinc-700 animate-pulse">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-full mb-2" />
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function ProfileCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 rounded-lg p-5 shadow border border-zinc-200 dark:border-zinc-800 animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
            </div>
            <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>

          <div className="space-y-2">
            <div className="h-3 bg-zinc-100 dark:bg-zinc-900/50 rounded w-full" />
            <div className="h-3 bg-zinc-100 dark:bg-zinc-900/50 rounded w-2/3" />
            <div className="h-3 bg-zinc-100 dark:bg-zinc-900/50 rounded w-1/2" />
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <div className="h-8 flex-1 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
