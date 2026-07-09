"use client";

import React from "react";
import { useToast, type ToastType } from "@/context/ToastContext";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
      default:
        return <Info className="h-5 w-5 text-[#168BB0] shrink-0" />;
    }
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100";
      case "error":
        return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100";
      default:
        return "bg-[#168BB0]/10 dark:bg-[#168BB0]/20 border-[#168BB0]/20 dark:border-[#168BB0]/30 text-[#0F7493] dark:text-[#45B0D2]";
    }
  };

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-3 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg pointer-events-auto animate-in fade-in slide-in-from-right-4 ${getStyles(
            toast.type
          )}`}
        >
          {getIcon(toast.type)}
          <p className="flex-1 text-sm font-medium leading-tight">{toast.message}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 -mr-1"
            onClick={() => removeToast(toast.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
