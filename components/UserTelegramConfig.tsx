"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Send, Trash2, Check, HelpCircle, Loader2, BotMessageSquare, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  getUserTelegramConfigAction,
  saveUserTelegramConfigAction,
  deleteUserTelegramConfigAction,
  sendUserTelegramTestAction,
  getTelegramBotUsernameAction,
} from "@/app/actions/user-telegram";

export default function UserTelegramConfig() {
  const { t } = useTranslation("notifications");
  const [chatId, setChatId] = useState("");
  const [savedChatId, setSavedChatId] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const [configRes, botRes] = await Promise.all([
        getUserTelegramConfigAction(),
        getTelegramBotUsernameAction(),
      ]);
      if (configRes.success && configRes.config) {
        setSavedChatId(configRes.config.chat_id);
        setChatId(configRes.config.chat_id);
      }
      if (botRes.success && botRes.username) {
        setBotUsername(botRes.username);
      }
    });
  }, []);

  const handleSave = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveUserTelegramConfigAction(chatId);
      if (res.success) {
        setSavedChatId(chatId);
        setIsEditing(false);
        setFeedback({ ok: true, msg: t("telegram_save_success", { defaultValue: "Settings saved successfully." }) });
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Failed to save settings" });
      }
    });
  };

  const handleDelete = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteUserTelegramConfigAction();
      if (res.success) {
        setSavedChatId(null);
        setChatId("");
        setIsEditing(true);
        setFeedback({ ok: true, msg: t("telegram_delete_success", { defaultValue: "Settings removed successfully." }) });
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Failed to remove settings" });
      }
    });
  };

  const handleTest = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await sendUserTelegramTestAction();
      setFeedback({
        ok: res.success,
        msg: res.success
          ? t("telegram_test_success", { defaultValue: "Test message sent! Check your Telegram." })
          : res.error ?? "Test send failed.",
      });
    });
  };

  const isConfigured = savedChatId !== null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3 p-4 flex-1">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0 mt-0.5">
            <BotMessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{t("telegram_title")}</span>
              {isConfigured ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0">
                  <Check className="h-2.5 w-2.5 mr-0.5" /> {t("telegram_status_connected")}
                </Badge>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[#168BB0] hover:text-[#0F7493] text-[10px] font-extrabold hover:underline cursor-pointer"
                >
                  {t("telegram_configure", { defaultValue: "Configure" })}
                </button>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed truncate">
              {isConfigured ? `${t("telegram_chat_id")}: ${savedChatId}` : t("telegram_desc")}
            </p>
            <button onClick={() => setShowGuide(true)} className="flex items-center gap-1 text-[10px] text-[#168BB0] hover:text-[#0F7493] font-semibold mt-1 transition-colors">
              <HelpCircle className="h-3 w-3" />
              {t("telegram_guide_btn")}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isConfigured && !isEditing && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={handleTest} disabled={isPending}>
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                {t("telegram_test")}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => setIsEditing(true)}>
                <Pencil className="h-3 w-3" /> {t("edit", { defaultValue: "Edit" })}
              </Button>
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/40",
          isEditing
            ? "max-h-[300px] opacity-100 p-4 pt-0 border-t"
            : "max-h-0 opacity-0 p-0 border-t-0"
        )}
      >
        <div className="space-y-3 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("telegram_chat_id")}</Label>
            <div className="flex items-center gap-2">
              <Input
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="e.g. 123456789"
                className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs flex-1"
              />
              <Button size="sm" className="bg-[#168BB0] hover:bg-[#0F7493] text-white h-9 px-3 text-xs" onClick={handleSave} disabled={isPending || !chatId.trim()}>
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("telegram_save")}
              </Button>
              <Button size="sm" variant="ghost" className="h-9 px-2 text-zinc-400 hover:text-red-500 cursor-pointer" onClick={() => setIsEditing(false)}>
                {t("cancel", { defaultValue: "Cancel" })}
              </Button>
            </div>
          </div>
          {isConfigured && (
            <Button size="sm" variant="outline" className="w-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs h-8" onClick={handleDelete} disabled={isPending}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {t("telegram_remove")}
            </Button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`mx-4 mb-4 p-2 rounded text-[11px] leading-relaxed font-medium ${feedback.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/15" : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/15"}`}>
          {feedback.msg}
        </div>
      )}

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">{t("telegram_guide_title")}</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 leading-relaxed mt-1">
              Follow these simple steps to start receiving updates on Telegram.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 text-xs text-zinc-600 dark:text-zinc-400 mt-2">
            <p className="leading-relaxed">
              {botUsername ? (
                <span>
                  {t("telegram_guide_step1", { username: botUsername })}{" "}
                  <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer" className="text-[#168BB0] font-bold hover:underline inline-flex items-center gap-0.5">
                    t.me/{botUsername}
                  </a>
                </span>
              ) : (
                t("telegram_guide_step1", { username: "your_admin_bot" })
              )}
            </p>
            <p className="leading-relaxed">{t("telegram_guide_step2")}</p>
            <p className="leading-relaxed">{t("telegram_guide_step3")}</p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" className="bg-[#168BB0] hover:bg-[#0F7493] text-white" onClick={() => setShowGuide(false)}>
              {t("close", { defaultValue: "Got it" })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
