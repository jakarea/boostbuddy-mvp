"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function EmployeeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 p-3 rounded-full bg-red-500/10 w-fit">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          We couldn&apos;t load your workspace. Please try again.
        </p>
        <Button
          onClick={reset}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
