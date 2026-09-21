"use client";

import { useState, useTransition, useCallback } from "react";
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { adminSetPasswordAction } from "@/app/actions/employee";
import { invalidateCaches, CACHE_KEYS } from "@/lib/cache/cacheContext";

// ─── Password strength ────────────────────────────────────────────────
type Strength = 0 | 1 | 2 | 3 | 4;

function getStrength(pw: string): Strength {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4) as Strength;
}

const STRENGTH_LABEL: Record<Strength, string> = {
  0: "",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

const STRENGTH_COLOR: Record<Strength, string> = {
  0: "bg-zinc-200 dark:bg-zinc-700",
  1: "bg-red-500",
  2: "bg-orange-400",
  3: "bg-yellow-400",
  4: "bg-emerald-500",
};

function StrengthBar({ strength }: { strength: Strength }) {
  if (!strength) return null;
  return (
    <div className="space-y-1 mt-1.5">
      <div className="flex gap-1 h-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-300 ${
              i <= strength ? STRENGTH_COLOR[strength] : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-[10px] font-semibold transition-colors ${
          strength === 4
            ? "text-emerald-600 dark:text-emerald-400"
            : strength === 3
            ? "text-yellow-600 dark:text-yellow-400"
            : strength === 2
            ? "text-orange-500"
            : "text-red-500"
        }`}
      >
        {STRENGTH_LABEL[strength]}
      </p>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────
interface SetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string;
}

// ─── Component ───────────────────────────────────────────────────────
export function SetPasswordDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
}: SetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const strength = getStrength(password);

  const reset = useCallback(() => {
    setPassword("");
    setShowPassword(false);
    setError("");
    setDone(false);
  }, []);

  const handleOpenChange = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password.length > 128) {
      setError("Password must not exceed 128 characters.");
      return;
    }

    startTransition(async () => {
      const result = await adminSetPasswordAction(userId, password);
      if (result.success) {
        setDone(true);
        // Invalidate admin employees cache so list reflects any changes
        invalidateCaches([CACHE_KEYS.ADMIN_EMPLOYEES]);
        setTimeout(() => {
          handleOpenChange(false);
        }, 1800);
      } else {
        setError(result.error || "Failed to set password. Please try again.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isPending}
        className="sm:max-w-sm"
      >
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-lg bg-[#168BB0]/10 text-[#168BB0]">
              <KeyRound className="h-4 w-4" />
            </div>
            <DialogTitle className="text-sm font-bold">
              Set Password
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs leading-relaxed">
            Set a new password for{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {userName}
            </span>{" "}
            <span className="text-zinc-400">({userEmail})</span>. The user can
            log in immediately with this password.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-3 py-5 text-center">
            <div className="p-3 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-bounce">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Password Updated
              </p>
              <p className="text-xs text-zinc-500">
                {userName}&apos;s password has been changed successfully.
              </p>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Password field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="admin-set-password"
                className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="admin-set-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  disabled={isPending}
                  className="h-9 text-xs pr-9 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                  autoFocus
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Strength meter */}
              <StrengthBar strength={strength} />

              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Minimum 8 characters. Stronger passwords include uppercase,
                numbers &amp; symbols.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || password.length < 8}
                className="flex-1 h-8 text-xs bg-[#168BB0] hover:bg-[#0F7493] text-white font-semibold shadow-sm transition-all"
              >
                {isPending ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  "Set Password"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
