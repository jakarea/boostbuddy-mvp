"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { createMultiUrlReviewOrderAction } from "@/app/actions/reviews-multiurl";
import {
  getReviewCreditCostAction,
  getReviewOrderSetupAction
} from "@/app/actions/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import PhotoUpload from "@/components/ui/PhotoUpload";
import { REACTIONS, type ReactionType } from "@/lib/reactionUtils";
import { useTranslation } from "react-i18next";
import { devLog } from "@/lib/utils/devLog";
import { Plus, X, CreditCard, Sparkles, ChevronRight, Info, Minus } from "lucide-react";

type OrderType = "REVIEW" | "COMMENT" | "COMMENT_WITH_PHOTO";

interface ReviewUrlData {
  url: string;
  quantity: number;
  reviewContent: string;
  photos: string[];
  reactionType?: ReactionType;
}

const ORDER_TYPE_LABELS: Record<OrderType, { label: string; description: string; icon: string }> = {
  COMMENT: { label: "Reactions", description: "Facebook reactions only", icon: "👍" },
  REVIEW: { label: "Reviews", description: "Text reviews", icon: "⭐" },
  COMMENT_WITH_PHOTO: { label: "Photo + Reviews", description: "Text reviews with photos", icon: "📸" }
};

export default function NewReviewOrderPage() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [orderType, setOrderType] = useState<OrderType>("REVIEW");
  const [urls, setUrls] = useState<ReviewUrlData[]>([
    { url: "", quantity: 1, reviewContent: "", photos: [], reactionType: "LIKE" as ReactionType }
  ]);

  const [fieldErrors, setFieldErrors] = useState<{
    urls?: Record<number, boolean>;
    credits?: boolean;
  }>({});

  const [creditPricing, setCreditPricing] = useState<Record<OrderType, number>>({
    REVIEW: 15,
    COMMENT: 10,
    COMMENT_WITH_PHOTO: 20
  });

  const [validation, setValidation] = useState<{
    hasEnough: boolean;
    currentBalance: number;
    requiredCredits: number;
  } | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadSetup = async () => {
      try {
        const result = await getReviewOrderSetupAction();
        if (result.success && result.pricing) {
          setCreditPricing({
            REVIEW: result.pricing.REVIEW || 15,
            COMMENT: result.pricing.COMMENT || 10,
            COMMENT_WITH_PHOTO: result.pricing.COMMENT_WITH_PHOTO || 20
          });
          setValidation({
            hasEnough: true,
            currentBalance: result.creditsBalance || 0,
            requiredCredits: 0
          });
        }
      } catch (err) {
        toastError(t("employee.loading_failed", "Failed to load pricing information"));
      } finally {
        setLoading(false);
      }
    };

    loadSetup();
  }, [user]);

  const addUrl = () => {
    if (urls.length >= 10) {
      toastError(t("Maximum 10 URLs allowed per order", "Maximum 10 URLs allowed per order"));
      return;
    }

    setUrls([
      ...urls,
      {
        url: "",
        quantity: 1,
        reviewContent: "",
        photos: [],
        reactionType: "LIKE" as ReactionType
      }
    ]);
  };

  const removeUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : [
      { url: "", quantity: 1, reviewContent: "", photos: [], reactionType: "LIKE" as ReactionType }
    ]);
    setFieldErrors({ ...fieldErrors, urls: { ...fieldErrors.urls, [index]: false } });
  };

  const updateUrl = (index: number, field: keyof ReviewUrlData, value: any) => {
    const newUrls = [...urls];
    newUrls[index] = { ...newUrls[index], [field]: value };
    setUrls(newUrls);
    setFieldErrors({ ...fieldErrors, urls: { ...fieldErrors.urls, [index]: false } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: typeof fieldErrors = {};

    // Validate URLs
    const urlErrors: Record<number, boolean> = {};
    urls.forEach((urlData, index) => {
      if (!urlData.url || !/^(https?:\/\/)?(www\.)?(facebook|fb)\.com\/.+/i.test(urlData.url)) {
        urlErrors[index] = true;
      }

      // Validate review content for REVIEW and COMMENT_WITH_PHOTO
      if ((orderType === "REVIEW" || orderType === "COMMENT_WITH_PHOTO") && !urlData.reviewContent?.trim()) {
        urlErrors[index] = true;
      }

      // Validate photos for COMMENT_WITH_PHOTO
      if (orderType === "COMMENT_WITH_PHOTO" && (!urlData.photos || urlData.photos.length === 0)) {
        urlErrors[index] = true;
      }

      // Validate quantity
      if (urlData.quantity < 1 || urlData.quantity > 100) {
        urlErrors[index] = true;
      }
    });

    if (Object.keys(urlErrors).length > 0) {
      setFieldErrors({ urls: urlErrors });
      return;
    }

    // Check if at least one URL is filled
    const validUrls = urls.filter(u => u.url.trim().length > 0);
    if (validUrls.length === 0) {
      setFieldErrors({ urls: { 0: true } });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        orderType,
        urls: validUrls.map((u, i) => ({
          url: u.url.trim(),
          quantity: u.quantity,
          reviewContent: u.reviewContent || undefined,
          photos: u.photos || undefined,
          reactionType: u.reactionType
        }))
      };

      const result = await createMultiUrlReviewOrderAction(payload);

      if (result.success && result.orderId) {
        toastSuccess(t("reviews.orderCreated", "Order created successfully! {{credits}} credits deducted.", { credits: validation?.requiredCredits || 0 }));
        router.push(`/c/services/reviews/orders/${result.orderId}`);
      } else {
        toastError(result.error || t("Failed to create order", "Failed to create order"));
      }
    } catch (err) {
      console.error("❌ [CLIENT] Order creation exception:", err);
      toastError(t("An error occurred while creating the order", "An error occurred while creating the order"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const totalQuantity = urls.reduce((sum, u) => sum + u.quantity, 0);
  const requiredCredits = (creditPricing[orderType] || 0) * totalQuantity;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#168BB0] to-[#0F7493] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{t("reviews.createOrder", "Create New Order")}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Credit Balance Card */}
        {validation && (
          <div className={`bg-white dark:bg-zinc-900 rounded-lg border overflow-hidden shadow-sm ${
            validation.hasEnough
              ? 'border-green-200 dark:border-green-800'
              : 'border-red-200 dark:border-red-800'
          }`}>
            <div className={`flex items-center gap-3 p-3 ${
              validation.hasEnough
                ? 'bg-green-50 dark:bg-green-900/10'
                : 'bg-red-50 dark:bg-red-900/10'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                validation.hasEnough
                  ? 'bg-green-100 dark:bg-green-800'
                  : 'bg-red-100 dark:bg-red-800'
              }`}>
                <CreditCard className={`w-4 h-4 ${validation.hasEnough ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${validation.hasEnough ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                  {validation.hasEnough ? t("Sufficient Balance", "Sufficient Balance") : t("reviews.insufficientCredits", "Insufficient Balance")}
                </p>
                <p className={`text-xs truncate ${validation.hasEnough ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {t("credits.creditsRequired", "Required: {required} | Your Balance: {balance}", { required: requiredCredits, balance: validation.currentBalance })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("credits.balance", "Balance")}:</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{validation.currentBalance}</p>
              </div>
            </div>
            {!validation.hasEnough && (
              <div className="px-3 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                <a
                  href="/c/wallet/top-up"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#168BB0]"
                >
                  {t("wallet.topUp", "Top Up")} <ChevronRight className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Order Type */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Order Type<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "COMMENT" as OrderType, ...ORDER_TYPE_LABELS.COMMENT, credits: creditPricing.COMMENT },
                { type: "REVIEW" as OrderType, ...ORDER_TYPE_LABELS.REVIEW, credits: creditPricing.REVIEW },
                { type: "COMMENT_WITH_PHOTO" as OrderType, ...ORDER_TYPE_LABELS.COMMENT_WITH_PHOTO, credits: creditPricing.COMMENT_WITH_PHOTO }
              ].map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setOrderType(option.type);
                    // Reset URLs when changing order type
                    setUrls([{ url: "", quantity: 1, reviewContent: "", photos: [], reactionType: "LIKE" as ReactionType }]);
                    setFieldErrors({});
                  }}
                  className={`relative p-3 rounded-lg border text-left transition-all ${
                    orderType === option.type
                      ? "border-[#168BB0] bg-[#168BB0]/5"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-[#168BB0]/30"
                  }`}
                >
                  <div className={`absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    orderType === option.type
                      ? "border-[#168BB0] bg-[#168BB0]"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}>
                    {orderType === option.type && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{option.label}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{option.description}</div>
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{option.credits}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">cr</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-4 space-y-4">
            {/* URLs Section */}
            <div>
              <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#1877F2">🔗</span>
                  URLs & Reviews
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                Add multiple URLs with specific review content for each. Total: {totalQuantity} reviews
                {urls.length > 1 && (
                  <span className="text-[#168BB0] ml-1">({urls.length} URLs)</span>
                )}
              </p>

              <div className="space-y-3">
                {urls.map((urlData, index) => (
                  <div key={index} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-zinc-50/50 dark:bg-zinc-800/50">
                    {/* URL Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#168BB0] text-white flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          URL {index + 1}
                        </span>
                      </div>
                      {urls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUrl(index)}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded"
                          title="Remove URL"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* URL Input */}
                    <div className="mb-3">
                      <input
                        type="url"
                        placeholder="https://www.facebook.com/page..."
                        value={urlData.url}
                        onChange={(e) => updateUrl(index, 'url', e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-sm ${
                          fieldErrors.urls?.[index]
                            ? 'border-red-300 dark:border-red-700 focus:border-red-500'
                            : 'border-zinc-200 dark:border-zinc-700 focus:border-[#168BB0]'
                        }`}
                      />
                      {fieldErrors.urls?.[index] && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">Valid Facebook URL required</p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Quantity for this URL
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={urlData.quantity}
                        onChange={(e) => updateUrl(index, 'quantity', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                        className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus:border-[#168BB0] text-sm"
                      />
                    </div>

                    {/* Reaction Selector - Only for COMMENT type */}
                    {orderType === "COMMENT" && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Reaction
                        </label>
                        <div className="grid grid-cols-7 gap-1">
                          {REACTIONS.map((reaction) => (
                            <button
                              key={reaction.type}
                              type="button"
                              onClick={() => updateUrl(index, 'reactionType', reaction.type)}
                              className={`p-1.5 rounded-lg border text-center transition-all ${
                                urlData.reactionType === reaction.type
                                  ? 'border-[#168BB0] bg-[#168BB0]/10'
                                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                              }`}
                            >
                              <div className="text-lg">{reaction.emoji}</div>
                              <div className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300">{reaction.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review Content - For REVIEW and COMMENT_WITH_PHOTO */}
                    {(orderType === "REVIEW" || orderType === "COMMENT_WITH_PHOTO") && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Review Content<span className="text-red-500 ml-1">*</span>
                        </label>
                        <textarea
                          rows={2}
                          maxLength={500}
                          value={urlData.reviewContent}
                          onChange={(e) => updateUrl(index, 'reviewContent', e.target.value)}
                          placeholder={`Enter review content for URL ${index + 1}...`}
                          className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 resize-none text-sm ${
                            fieldErrors.urls?.[index]
                              ? 'border-red-300 dark:border-red-700'
                              : 'border-zinc-200 dark:border-zinc-700 focus:border-[#168BB0]'
                          }`}
                        />
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {urlData.reviewContent.length}/500 characters
                        </p>
                      </div>
                    )}

                    {/* Photo Upload - For COMMENT_WITH_PHOTO */}
                    {orderType === "COMMENT_WITH_PHOTO" && (
                      <div className={fieldErrors.urls?.[index] ? "border border-red-500 rounded p-2" : ""}>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Photo<span className="text-red-500 ml-1">*</span>
                        </label>
                        <PhotoUpload
                          onPhotosChange={(photos) => updateUrl(index, 'photos', photos)}
                          maxPhotos={1}
                          currentPhotos={urlData.photos}
                        />
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {urlData.photos.length}/1 photo required
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add URL Button */}
              {urls.length < 10 && (
                <button
                  type="button"
                  onClick={addUrl}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:border-[#168BB0] hover:text-[#168BB0] transition-colors mt-4"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {urls.length > 0 ? `Add Another URL (${urls.length}/10)` : "Add URL"}
                </button>
              )}
            </div>

            {/* Quantity & Cost Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Total Reviews
                </label>
                <div className="bg-[#168BB0]/10 rounded-lg px-3 py-2 border border-[#168BB0]/20">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {urls.length} {urls.length === 1 ? 'URL' : 'URLs'} × {totalQuantity}
                  </p>
                  <p className="text-lg font-bold text-[#168BB0]">
                    {totalQuantity} <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400"> reviews</span>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Total Cost
                </label>
                <div className="bg-[#168BB0]/10 rounded-lg px-3 py-2 border border-[#168BB0]/20">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {totalQuantity} × {creditPricing[orderType]}
                  </p>
                  <p className="text-lg font-bold text-[#168BB0]">
                    {requiredCredits} <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400">cr</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !validation?.hasEnough}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#168BB0] to-[#0F7493] text-white rounded-lg font-semibold hover:from-[#0F7493] hover:to-[#168BB0] transition-all disabled:opacity-50 disabled:cursor-not-accepted flex items-center justify-center gap-1.5"
            >
              {submitting ? 'Creating...' : (
                <>
                  Create Order
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
