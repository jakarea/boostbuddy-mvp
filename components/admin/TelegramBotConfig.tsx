"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  BotMessageSquare, Pencil, Send, Trash2, Check, X, Loader2,
  ChevronDown, ChevronUp, HelpCircle, ExternalLink,
} from "lucide-react";
import {
  saveTelegramConfigAction,
  deleteTelegramConfigAction,
  sendTelegramTestAction,
} from "@/app/actions/telegram";
import type { TelegramConfig } from "@/app/actions/telegram";

interface TelegramBotConfigProps {
  initialConfig: TelegramConfig | null;
  /** When true, renders without the outer card border — parent controls the container */
  flat?: boolean;
}

type PanelState = "collapsed" | "form";

export default function TelegramBotConfig({ initialConfig, flat = false }: TelegramBotConfigProps) {
  const [config, setConfig] = useState<TelegramConfig | null>(initialConfig);
  const [panelState, setPanelState] = useState<PanelState>("collapsed");
  const [botToken, setBotToken] = useState(initialConfig?.bot_token ?? "");
  const [chatId, setChatId] = useState(initialConfig?.chat_id ?? "");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isConfigured = config !== null;
  const clearFeedback = () => setFeedback(null);

  const handleSave = () => {
    clearFeedback();
    const fd = new FormData();
    fd.append("bot_token", botToken);
    fd.append("chat_id", chatId);
    startTransition(async () => {
      const res = await saveTelegramConfigAction(fd);
      if (res.success) {
        setConfig({ bot_token: botToken, chat_id: chatId });
        setPanelState("collapsed");
        setFeedback({ ok: true, msg: "Telegram bot saved successfully." });
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Save failed." });
      }
    });
  };

  const handleDelete = () => {
    clearFeedback();
    startTransition(async () => {
      const res = await deleteTelegramConfigAction();
      if (res.success) {
        setConfig(null);
        setBotToken("");
        setChatId("");
        setPanelState("collapsed");
        setFeedback({ ok: true, msg: "Telegram bot configuration removed." });
      } else {
        setFeedback({ ok: false, msg: res.error ?? "Delete failed." });
      }
    });
  };

  const handleTest = () => {
    if (!config) return;
    clearFeedback();
    startTransition(async () => {
      const res = await sendTelegramTestAction(config);
      setFeedback({
        ok: res.success,
        msg: res.success
          ? "Test message sent! Check your Telegram."
          : (res.error ?? "Send failed."),
      });
    });
  };

  const openEdit = () => {
    setBotToken(config?.bot_token ?? "");
    setChatId(config?.chat_id ?? "");
    setPanelState("form");
    clearFeedback();
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 p-4 flex-1">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0 mt-0.5">
            <BotMessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                Telegram Bot
              </span>
              {isConfigured ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0">
                  <Check className="h-2.5 w-2.5 mr-0.5" /> Connected
                </Badge>
              ) : (
                <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0">
                  Not configured
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
              {isConfigured
                ? `Chat ID: ${config!.chat_id}`
                : "Set up a bot to receive admin alerts in Telegram."}
            </p>
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-1 text-[10px] text-[#168BB0] hover:text-[#0F7493] font-semibold mt-1 transition-colors"
            >
              <HelpCircle className="h-3 w-3" />
              How to set up?
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {isConfigured && panelState === "collapsed" && (
            <>
              <Button size="sm" variant="ghost"
                className="h-7 px-2 text-[11px] gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={handleTest} disabled={isPending}
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Test
              </Button>
              <Button size="sm" variant="ghost"
                className="h-7 px-2 text-[11px] gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={openEdit}
              >
                <Pencil className="h-3 w-3" /> Edit
              </Button>
              <Button size="sm" variant="ghost"
                className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={handleDelete} disabled={isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
          {!isConfigured && (
            <Button size="sm" variant="ghost"
              className="h-7 px-2 text-[11px] gap-1 text-[#168BB0] hover:text-[#0F7493] hover:bg-[#168BB0]/5"
              onClick={() => setPanelState(s => s === "collapsed" ? "form" : "collapsed")}
            >
              {panelState === "collapsed" ? "Configure" : "Cancel"}
              {panelState === "collapsed"
                ? <ChevronDown className="h-3 w-3" />
                : <ChevronUp className="h-3 w-3" />}
            </Button>
          )}
          {isConfigured && panelState === "form" && (
            <Button size="sm" variant="ghost"
              className="h-7 px-2 text-[11px] gap-1 text-zinc-500"
              onClick={() => setPanelState("collapsed")}
            >
              <X className="h-3 w-3" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Inline feedback */}
      {feedback && (
        <div className={`mx-4 mb-3 rounded-lg px-3 py-2 text-[11px] font-semibold flex items-center gap-2 ${
          feedback.ok
            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
            : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
        }`}>
          {feedback.ok
            ? <Check className="h-3.5 w-3.5 shrink-0" />
            : <X className="h-3.5 w-3.5 shrink-0" />}
          {feedback.msg}
        </div>
      )}

      {/* Config form */}
      {panelState === "form" && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 pt-3 pb-4 bg-zinc-50/50 dark:bg-zinc-950/30">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Bot Token</Label>
              <Input
                id="tg-bot-token"
                type="password"
                placeholder="1234567890:AAFxxxx..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 font-mono"
              />
              <p className="text-[10px] text-zinc-400">From @BotFather on Telegram</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Chat ID</Label>
              <Input
                id="tg-chat-id"
                type="text"
                placeholder="-100123456789"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 font-mono"
              />
              <p className="text-[10px] text-zinc-400">Channel or group chat ID</p>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <Button
              size="sm"
              className="h-8 text-xs px-4 bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold gap-1.5"
              onClick={handleSave}
              disabled={isPending || !botToken.trim() || !chatId.trim()}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save Bot
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (flat) return (
    <>
      {content}
      <TelegramGuideModal open={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );

  return (
    <>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        {content}
      </div>
      <TelegramGuideModal open={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}

/* ── Setup Guide Modal ─────────────────────────────────────────────── */

function TelegramGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const STEPS = [
    {
      n: 1,
      title: "Create a bot",
      body: "Open Telegram and search for @BotFather. Send /newbot, pick a name and username. Copy the API token it gives you.",
    },
    {
      n: 2,
      title: "Add the bot to a chat",
      body: "Create a group or channel, add your bot as a member (and promote it to admin so it can post).",
    },
    {
      n: 3,
      title: "Get the Chat ID",
      body: "Add @userinfobot to the same chat and send any message — it replies with the chat ID (usually a negative number like -100xxxxxxxxx).",
    },
    {
      n: 4,
      title: "Paste both values here",
      body: "Click Configure, enter the Bot Token and Chat ID, then Save. Use the Test button to verify a message arrives.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <BotMessageSquare className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                Telegram Bot Setup
              </DialogTitle>
              <DialogDescription className="text-[11px] text-zinc-400 mt-0.5">
                4 quick steps to connect your bot
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {STEPS.map((step) => (
            <div key={step.n} className="flex gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#168BB0]/10 text-[#168BB0] flex items-center justify-center text-[10px] font-extrabold mt-0.5">
                {step.n}
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{step.title}</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{step.body}</div>
              </div>
            </div>
          ))}

          <a
            href="https://core.telegram.org/bots#botfather"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-[#168BB0] hover:text-[#0F7493] font-semibold mt-1 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Official Bot documentation
          </a>
        </div>

        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <Button size="sm" variant="outline"
            className="h-8 text-xs border-zinc-200 dark:border-zinc-700"
            onClick={onClose}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
