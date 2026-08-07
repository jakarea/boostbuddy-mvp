"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  createReviewOrderAction,
  validateCreditsForOrderAction,
  getReviewCreditCostAction,
  getReviewOrderSetupAction
} from "@/app/actions/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import PhotoUpload from "@/components/ui/PhotoUpload";
import { REACTIONS, type ReactionType } from "@/lib/reactionUtils";
import { devLog } from "@/lib/utils/devLog";
import { Plus, X, CreditCard, Sparkles, ChevronRight, Info } from "lucide-react";

type OrderType = "REVIEW" | "COMMENT" | "COMMENT_WITH_PHOTO";

const ORDER_TYPE_LABELS: Record<OrderType, { label: string; description: string; icon: string }> = {
  COMMENT: { label: "Reactions", description: "Facebook reactions only", icon: "👍" },
  REVIEW: { label: "Reviews", description: "Text reviews", icon: "⭐" },
  COMMENT_WITH_PHOTO: { label: "Photo + Reviews", description: "Text reviews with photos", icon: "📸" }
};

export default function NewReviewOrderPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    orderType: "REVIEW" as OrderType,
    facebookUrl: "",
    quantity: 1,
    targetRating: "5_STAR" as const,
    reactionType: "LIKE" as ReactionType,
    comments: [""] as string[],
    photoReviews: [{ text: "", photos: [] as string[] }] as Array<{ text: string; photos: string[] }>
  });

  const [fieldErrors, setFieldErrors] = useState<{
    facebookUrl?: boolean;
    commentText?: boolean;
    photoUrls?: boolean;
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
        error("Failed to load pricing information");
      } finally {
        setLoading(false);
      }
    };

    loadSetup();
  }, [user]);

  useEffect(() => {
    if (formData.facebookUrl && formData.orderType && creditPricing[formData.orderType]) {
      validateCredits();
    }
  }, [formData.facebookUrl, formData.orderType, formData.quantity, creditPricing]);

  const validateCredits = async () => {
    if (!formData.facebookUrl) return;

    const commentsPayload = (formData.orderType === "COMMENT" || formData.orderType === "COMMENT_WITH_PHOTO")
      ? { comments: formData.comments.filter(c => c.trim().length > 0) }
      : {};

    const result = await validateCreditsForOrderAction({
      orderType: formData.orderType,
      facebookUrl: formData.facebookUrl,
      quantity: formData.quantity,
      reactionType: formData.reactionType,
      targetRating: formData.targetRating,
      content: "",
      commentText: "",
      ...commentsPayload,
      photoUrls: []
    });

    if (result.success && 'hasEnough' in result) {
      setValidation(result as { hasEnough: boolean; currentBalance: number; requiredCredits: number });
      setFieldErrors({});
    } else {
      if (result.error?.includes("Insufficient credits")) {
        setFieldErrors({ credits: true });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: typeof fieldErrors = {};

    if (!formData.facebookUrl || !/^(https?:\/\/)?(www\.)?(facebook|fb)\.com\/.+/i.test(formData.facebookUrl)) {
      newErrors.facebookUrl = true;
    }

    if (formData.orderType === "REVIEW") {
      const validReviews = formData.comments.filter(c => c && c.trim().length > 0);
      if (validReviews.length === 0) {
        newErrors.commentText = true;
      }
    }

    if (formData.orderType === "COMMENT_WITH_PHOTO") {
      const validReviews = formData.photoReviews.filter(r => r.text && r.text.trim().length > 0);
      if (validReviews.length === 0) {
        newErrors.commentText = true;
      }
      const hasAllPhotos = validReviews.every(r => r.photos && r.photos.length === 1);
      if (!hasAllPhotos) {
        newErrors.photoUrls = true;
      }
    }

    setFieldErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      let payload: any = {
        orderType: formData.orderType,
        facebookUrl: formData.facebookUrl,
        quantity: formData.quantity,
        reactionType: formData.reactionType,
        targetRating: formData.targetRating,
      };

      if (formData.orderType === "COMMENT") {
        payload.comments = [""];
      }
      else if (formData.orderType === "REVIEW") {
        payload.comments = formData.comments.filter(c => c.trim().length > 0);
        payload.content = payload.comments.join('|||');
      }
      else if (formData.orderType === "COMMENT_WITH_PHOTO") {
        payload.photoReviews = formData.photoReviews;
        payload.comments = formData.photoReviews.map(r => r.text);
      }

      const result = await createReviewOrderAction(payload);

      if (result.success && 'orderId' in result) {
        success(`Order created successfully! ${validation?.requiredCredits || 0} credits deducted.`);
        router.push(`/c/services/reviews/orders/${result.orderId}`);
      } else if (!result.success) {
        const err = (result as any).error || "";
        if (err === "invalid_facebook_url") {
          setFieldErrors({ facebookUrl: true });
          error("Please enter a valid Facebook URL");
        } else if (err.toLowerCase().includes("comment")) {
          setFieldErrors({ commentText: true });
          error("Review text is required");
        } else if (err.toLowerCase().includes("insufficient credits")) {
          setFieldErrors({ credits: true });
          error(err);
        } else {
          setFieldErrors({ facebookUrl: true });
          error(err);
        }
      }
    } catch (err) {
      console.error("❌ [CLIENT] Order creation exception:", err);
      setFieldErrors({ facebookUrl: true });
      error("An error occurred while creating the order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const requiredCredits = (creditPricing[formData.orderType] || 0) * formData.quantity;

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
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Create New Order</h1>
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
                  {validation.hasEnough ? 'Sufficient Balance' : 'Insufficient Balance'}
                </p>
                <p className={`text-xs truncate ${validation.hasEnough ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  Required: {requiredCredits} credits
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Balance:</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{validation.currentBalance}</p>
              </div>
            </div>
            {!validation.hasEnough && (
              <div className="px-3 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                <a
                  href="/c/wallet/top-up"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#168BB0]"
                >
                  Top Up <ChevronRight className="w-3 h-3" />
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
                    const preservedData = { comments: formData.comments, photoReviews: formData.photoReviews };
                    setFormData({
                      ...formData,
                      orderType: option.type,
                      comments: (option.type === "REVIEW" || option.type === "COMMENT_WITH_PHOTO") ? (preservedData.comments.length > 0 ? preservedData.comments : [""]) : [""],
                      photoReviews: option.type === "COMMENT_WITH_PHOTO" ? (preservedData.photoReviews.length > 0 ? preservedData.photoReviews : [{ text: "", photos: [] }]) : [{ text: "", photos: [] }]
                    });
                    setFieldErrors({});
                  }}
                  className={`relative p-3 rounded-lg border text-left transition-all ${
                    formData.orderType === option.type
                      ? "border-[#168BB0] bg-[#168BB0]/5"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-[#168BB0]/30"
                  }`}
                >
                  <div className={`absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    formData.orderType === option.type
                      ? "border-[#168BB0] bg-[#168BB0]"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}>
                    {formData.orderType === option.type && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
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
            {/* Facebook URL */}
            <div>
              <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#1877F2]">📘</span>
                  Facebook URL
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  value={formData.facebookUrl}
                  onChange={e => {
                    setFormData({ ...formData, facebookUrl: e.target.value });
                    setFieldErrors({ ...fieldErrors, facebookUrl: false });
                  }}
                  placeholder="https://www.facebook.com/..."
                  className={`w-full pl-9 pr-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 transition-all text-sm ${
                    fieldErrors.facebookUrl
                      ? 'border-red-300 dark:border-red-700 focus:border-red-500'
                      : 'border-zinc-200 dark:border-zinc-700 focus:border-[#168BB0]'
                  }`}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">📘</span>
              </div>
              {fieldErrors.facebookUrl && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Valid URL required
                </p>
              )}
            </div>

            {/* Quantity & Cost */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Quantity<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={formData.quantity}
                    onChange={e => {
                      const newQuantity = Math.max(1, Math.min(50, parseInt(e.target.value) || 1));
                      let updates: any = { quantity: newQuantity };
                      if (formData.orderType === "COMMENT") {
                        updates.comments = [""];
                      } else if (formData.orderType === "REVIEW") {
                        const newComments = formData.comments.slice(0, newQuantity);
                        if (newComments.length === 0) newComments.push("");
                        updates.comments = newComments;
                      } else if (formData.orderType === "COMMENT_WITH_PHOTO") {
                        const newPhotoReviews = formData.photoReviews.slice(0, newQuantity);
                        if (newPhotoReviews.length === 0) newPhotoReviews.push({ text: "", photos: [] });
                        updates.photoReviews = newPhotoReviews;
                      }
                      setFormData({ ...formData, ...updates });
                    }}
                    className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus:border-[#168BB0] transition-all text-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {formData.orderType === "COMMENT" ? 'Reactions' : 'Reviews'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Total
                </label>
                <div className="bg-[#168BB0]/10 rounded-lg px-3 py-2 border border-[#168BB0]/20">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {formData.quantity} × {creditPricing[formData.orderType]}
                  </p>
                  <p className="text-lg font-bold text-[#168BB0]">
                    {requiredCredits} <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400">cr</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Reaction Selector - Only for Reactions */}
            {formData.orderType === "COMMENT" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Reaction<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {REACTIONS.map((reaction) => (
                    <button
                      key={reaction.type}
                      type="button"
                      onClick={() => setFormData({ ...formData, reactionType: reaction.type as ReactionType })}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        formData.reactionType === reaction.type
                          ? 'border-[#168BB0] bg-[#168BB0]/10'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <div className="text-xl">{reaction.emoji}</div>
                      <div className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">{reaction.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {formData.orderType === "REVIEW" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Review Texts<span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  Add reviews. Same URL.
                  {formData.comments.filter(c => c.trim().length > 0).length > 0 && (
                    <span className="text-[#168BB0] ml-1">
                      ({formData.comments.filter(c => c.trim().length > 0).length}/{formData.quantity})
                    </span>
                  )}
                </p>

                <div className="space-y-2">
                  {formData.comments.map((review, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <textarea
                          rows={2}
                          maxLength={500}
                          value={review}
                          onChange={e => {
                            const updatedReviews = [...formData.comments];
                            updatedReviews[index] = e.target.value;
                            setFormData({ ...formData, comments: updatedReviews });
                            setFieldErrors({ ...fieldErrors, commentText: false });
                          }}
                          className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 transition-all resize-none text-sm ${
                            fieldErrors.commentText
                              ? 'border-red-300 dark:border-red-700'
                              : 'border-zinc-200 dark:border-zinc-700 focus:border-[#168BB0]'
                          }`}
                          placeholder={`Review ${index + 1}...`}
                        />
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{review.length}/500</p>
                          {formData.comments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updatedReviews = formData.comments.filter((_, i) => i !== index);
                                setFormData({ ...formData, comments: updatedReviews.length > 0 ? updatedReviews : [""] });
                              }}
                              className="text-zinc-400 hover:text-red-500 p-0.5 rounded"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {formData.comments.length < formData.quantity && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, comments: [...formData.comments, ""] })}
                    className="mt-2 flex items-center gap-1.5 px-3 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:border-[#168BB0] hover:text-[#168BB0] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add {formData.comments.length > 0 && `(${formData.comments.length}/${formData.quantity})`}
                  </button>
                )}

                {fieldErrors.commentText && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <Info className="w-3 h-3" /> At least one review required
                  </p>
                )}
              </div>
            )}

            {/* Photo + Reviews */}
            {formData.orderType === "COMMENT_WITH_PHOTO" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Review + Photo<span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  Add reviews with photos. 1 photo each.
                  {formData.photoReviews.filter(r => r.text.trim().length > 0).length > 0 && (
                    <span className="text-[#168BB0] ml-1">
                      ({formData.photoReviews.filter(r => r.text.trim().length > 0).length}/{formData.quantity})
                    </span>
                  )}
                </p>

                <div className="space-y-2">
                  {formData.photoReviews.map((review, index) => (
                    <div key={index} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-800/50">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#168BB0] text-white flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedReviews = formData.photoReviews.filter((_, i) => i !== index);
                            setFormData({ ...formData, photoReviews: updatedReviews.length > 0 ? updatedReviews : [{ text: "", photos: [] }] });
                          }}
                          className="ml-auto p-0.5 text-zinc-400 hover:text-red-500 rounded"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <textarea
                        rows={1}
                        maxLength={500}
                        value={review.text}
                        onChange={e => {
                          const updatedReviews = [...formData.photoReviews];
                          updatedReviews[index] = { ...updatedReviews[index], text: e.target.value };
                          setFormData({ ...formData, photoReviews: updatedReviews });
                          setFieldErrors({ ...fieldErrors, commentText: false });
                        }}
                        className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 mb-2 transition-all resize-none text-sm ${
                          fieldErrors.commentText
                            ? 'border-red-300 dark:border-red-700'
                            : 'border-zinc-200 dark:border-zinc-700 focus:border-[#168BB0]'
                        }`}
                        placeholder={`Review ${index + 1}...`}
                      />

                      <div className={fieldErrors.photoUrls && index === 0 ? "border border-red-500 rounded" : ""}>
                        <PhotoUpload
                          onPhotosChange={(photos) => {
                            const updatedReviews = [...formData.photoReviews];
                            updatedReviews[index] = { ...updatedReviews[index], photos };
                            setFormData({ ...formData, photoReviews: updatedReviews });
                            setFieldErrors({ ...fieldErrors, photoUrls: false });
                          }}
                          maxPhotos={1}
                          currentPhotos={review.photos}
                        />
                      </div>

                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {review.text.length}/500 | {review.photos.length}/1 photo
                      </p>
                    </div>
                  ))}
                </div>

                {formData.photoReviews.length < formData.quantity && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, photoReviews: [...formData.photoReviews, { text: "", photos: [] }] })}
                    className="mt-2 flex items-center gap-1.5 px-3 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:border-[#168BB0] hover:text-[#168BB0] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add {formData.photoReviews.length > 0 && `(${formData.photoReviews.length}/${formData.quantity})`}
                  </button>
                )}

                {fieldErrors.commentText && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Review text required
                  </p>
                )}
                {fieldErrors.photoUrls && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <Info className="w-3 h-3" /> 1 photo per review required
                  </p>
                )}
              </div>
            )}
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
