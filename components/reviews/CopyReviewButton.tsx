"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface CopyReviewButtonProps {
  content: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function CopyReviewButton({
  content,
  className = "",
  variant = "outline",
  size = "sm"
}: CopyReviewButtonProps) {
  const [copied, setCopied] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toastSuccess("Review copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toastError("Failed to copy. Please select and copy manually.");
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant={copied ? "default" : variant}
      size={size}
      className={`gap-2 ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span>Copy Review</span>
        </>
      )}
    </Button>
  );
}

export default CopyReviewButton;
