"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "destructive";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions;
  onConfirm: (result: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    options: {
      title: "",
      message: "",
    },
    onConfirm: () => {},
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        onConfirm: (result: boolean) => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(result);
        },
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog state={confirmState} />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextType {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return context;
}

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function ConfirmDialog({ state }: { state: ConfirmState }) {
  const { t } = useTranslation("confirm");
  const { isOpen, options, onConfirm } = state;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onConfirm(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{options.title}</DialogTitle>
          <DialogDescription className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
            {options.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={() => onConfirm(false)} className="h-9">
            {options.cancelText || t("cancel")}
          </Button>
          <Button
            onClick={() => onConfirm(true)}
            className={
              options.confirmVariant === "destructive"
                ? "bg-red-600 hover:bg-red-700 text-white h-9"
                : "bg-[#168BB0] hover:bg-[#0F7493] text-white h-9"
            }
          >
            {options.confirmText || t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
