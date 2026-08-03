"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  createReviewOrderAction,
  validateCreditsForOrderAction,
  getReviewCreditCostAction
} from "@/app/actions/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import PhotoUpload from "@/components/ui/PhotoUpload";
import { REACTIONS, type ReactionType } from "@/lib/reactionUtils";

type OrderType = "REVIEW" | "COMMENT" | "COMMENT_WITH_PHOTO";
const RATINGS = ["5_STAR", "4_STAR", "3_STAR", "2_STAR", "1_STAR"] as const;

export default function NewReviewOrderPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    orderType: "REVIEW" as OrderType,
    facebookUrl: "",
    quantity: 1,
    targetRating: "5_STAR" as const,
    reactionType: "LIKE" as ReactionType,
    content: "",
    commentText: "",
    photoUrls: [] as string[]
  });

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    facebookUrl?: boolean;
    content?: boolean;
    commentText?: boolean;
    photoUrls?: boolean;
    credits?: boolean;
  }>({});

  // Credit pricing state
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

  // Load credit pricing on mount
  useEffect(() => {
    if (!user) return;

    const loadPricing = async () => {
      try {
        // Load pricing for all order types in parallel
        const orderTypes: OrderType[] = ["REVIEW", "COMMENT", "COMMENT_WITH_PHOTO"];
        const pricingPromises = orderTypes.map(type => getReviewCreditCostAction(type));
        const pricingResults = await Promise.all(pricingPromises);

        if (pricingResults.every(r => r.success)) {
          const newPricing: Record<OrderType, number> = {} as any;
          pricingResults.forEach((result, index) => {
            newPricing[orderTypes[index]] = result.cost;
          });
          setCreditPricing(newPricing);
        }
      } catch (err) {
        error("Failed to load pricing information");
      } finally {
        setLoading(false);
      }
    };

    loadPricing();
  }, [user]);

  // Validate credits immediately when form loads or changes
  useEffect(() => {
    if (formData.facebookUrl && formData.orderType && creditPricing[formData.orderType]) {
      validateCredits();
    }
  }, [formData.facebookUrl, formData.orderType, formData.quantity, creditPricing]);

  const validateCredits = async () => {
    if (!formData.facebookUrl) return;

    const result = await validateCreditsForOrderAction({
      orderType: formData.orderType,
      facebookUrl: formData.facebookUrl,
      quantity: formData.quantity,
      reactionType: formData.reactionType,
      targetRating: formData.targetRating,
      content: formData.content,
      commentText: formData.commentText,
      photoUrls: formData.photoUrls
    });

    if (result.success && 'hasEnough' in result) {
      setValidation(result as { hasEnough: boolean; currentBalance: number; requiredCredits: number });
      setFieldErrors({}); // Clear errors on success
    } else {
      // Set credits error if insufficient
      if (result.error?.includes("Insufficient credits")) {
        setFieldErrors({ credits: true });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🚀 [CLIENT] Starting order submission...");
    console.log("📋 [CLIENT] Form data:", JSON.stringify(formData, null, 2));
    console.log("💰 [CLIENT] Credit validation:", validation);

    // Clear previous errors
    const newErrors: typeof fieldErrors = {};

    // Validate Facebook URL
    if (!formData.facebookUrl || !/^(https?:\/\/)?(www\.)?(facebook|fb)\.com\/.+/i.test(formData.facebookUrl)) {
      console.error("❌ [CLIENT] Invalid Facebook URL");
      newErrors.facebookUrl = true;
    }

    // Validate required fields based on order type
    if (formData.orderType === "REVIEW" && !formData.content) {
      console.error("❌ [CLIENT] Missing review content");
      newErrors.content = true;
    }

    if ((formData.orderType === "COMMENT" || formData.orderType === "COMMENT_WITH_PHOTO") && !formData.commentText) {
      console.error("❌ [CLIENT] Missing comment text");
      newErrors.commentText = true;
    }

    if (formData.orderType === "COMMENT_WITH_PHOTO" && formData.photoUrls.length === 0) {
      console.error("❌ [CLIENT] No photos uploaded");
      newErrors.photoUrls = true;
    }

    // Note: We don't check validation?.hasEnough here anymore because the validation
    // state might be stale. The server will properly validate credits.

    // Update errors
    setFieldErrors(newErrors);

    // Don't submit if there are basic field errors
    if (Object.keys(newErrors).length > 0) {
      console.error("❌ [CLIENT] Validation failed:", newErrors);
      return;
    }

    console.log("✅ [CLIENT] Validation passed, submitting order...");
    setSubmitting(true);

    try {
      const result = await createReviewOrderAction({
        orderType: formData.orderType,
        facebookUrl: formData.facebookUrl,
        quantity: formData.quantity,
        reactionType: formData.reactionType,
        targetRating: formData.targetRating,
        content: formData.content,
        commentText: formData.commentText,
        photoUrls: formData.photoUrls
      });

      console.log("📥 [CLIENT] Order creation result:", result);
      console.log("📥 [CLIENT] Result success:", result.success);
      console.log("📥 [CLIENT] Result error:", (result as any).error);

      if (result.success && 'orderId' in result) {
        console.log("✅ [CLIENT] Order created successfully:", result.orderId);
        success(
          `Order created successfully! ${validation?.requiredCredits || 0} credits deducted.`
        );
        router.push(`/c/services/reviews/orders/${result.orderId}`);
      } else if (!result.success) {
        console.error("❌ [CLIENT] Order creation failed:", result);

        // Set field errors based on specific error messages
        const error = (result as any).error || "";
        const errorLower = error.toLowerCase();

        if (error === "invalid_facebook_url") {
          setFieldErrors({ facebookUrl: true });
          error("Please enter a valid Facebook URL");
        } else if (errorLower.includes("comment text")) {
          setFieldErrors({ commentText: true });
          error("Comment text is required for this order type");
        } else if (errorLower.includes("review content")) {
          setFieldErrors({ content: true });
          error("Review content is required for this order type");
        } else if (errorLower.includes("insufficient credits")) {
          setFieldErrors({ credits: true });
          error(error);
        } else {
          // Generic error for UX
          setFieldErrors({ facebookUrl: true });
          error(error);
        }
      }
    } catch (err) {
      console.error("❌ [CLIENT] Order creation exception:", err);
      setFieldErrors({ facebookUrl: true }); // Generic error for UX
      error("An error occurred while creating the order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const requiredCredits = (creditPricing[formData.orderType] || 0) * formData.quantity;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Create New Facebook Order
      </h1>

      {/* Credit Status */}
      {validation && (
        <div className={`p-4 rounded-lg ${validation.hasEnough ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
          <p className={`font-medium ${validation.hasEnough ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}`}>
            Total Cost: {requiredCredits} credits ({formData.quantity} unit{formData.quantity > 1 ? 's' : ''} × {creditPricing[formData.orderType]} each) | Your Balance: {validation.currentBalance}
          </p>
          {!validation.hasEnough && (
            <>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                Insufficient credits. You need {validation.requiredCredits - validation.currentBalance} more credits.
              </p>
              <a
                href="/c/wallet/top-up"
                className="text-sm underline mt-2 block font-medium"
              >
                Buy more credits →
            </a>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-zinc-800 p-6 rounded-lg shadow">
        {/* Order Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Order Type *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { type: "REVIEW", label: "Reviews", credits: creditPricing.REVIEW },
              { type: "COMMENT", label: "Comments", credits: creditPricing.COMMENT },
              { type: "COMMENT_WITH_PHOTO", label: "Comments + Photo", credits: creditPricing.COMMENT_WITH_PHOTO }
            ].map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => {
                  // Store current values to preserve during type switch
                  const preservedData = {
                    content: formData.content,
                    commentText: formData.commentText,
                    photoUrls: formData.photoUrls
                  };

                  setFormData({
                    ...formData,
                    orderType: option.type as OrderType,
                    // Only clear fields that are NOT needed for the new type
                    content: option.type === "REVIEW" ? preservedData.content : "",
                    commentText: (option.type === "COMMENT" || option.type === "COMMENT_WITH_PHOTO") ? preservedData.commentText : "",
                    photoUrls: option.type === "COMMENT_WITH_PHOTO" ? preservedData.photoUrls : []
                  });

                  // Clear field errors when switching types
                  setFieldErrors({});
                }}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.orderType === option.type
                    ? "border-[#168BB0] bg-[#168BB0]/10"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-zinc-500">{option.credits} credits each</div>
              </button>
            ))}
          </div>
        </div>

        {/* Facebook URL */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Facebook URL *
          </label>
          <input
            type="url"
            required
            value={formData.facebookUrl}
            onChange={e => {
              setFormData({ ...formData, facebookUrl: e.target.value });
              setFieldErrors({ ...fieldErrors, facebookUrl: false });
            }}
            placeholder="https://www.facebook.com/... or https://fb.com/..."
            className={`w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 ${
              fieldErrors.facebookUrl
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'dark:border-zinc-600'
            }`}
          />
          {fieldErrors.facebookUrl && (
            <p className="text-xs text-red-500 mt-1">Please enter a valid Facebook URL</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Quantity * (1-50 units)
          </label>
          <input
            type="number"
            min="1"
            max="50"
            required
            value={formData.quantity}
            onChange={e => setFormData({ ...formData, quantity: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Each unit costs {creditPricing[formData.orderType]} credits. Total: {requiredCredits} credits
          </p>
        </div>

        {/* Reaction Selector */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Reaction *
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.type}
                type="button"
                onClick={() => setFormData({ ...formData, reactionType: reaction.type as ReactionType })}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  formData.reactionType === reaction.type
                    ? 'border-[#168BB0] bg-[#168BB0]/10 ring-2 ring-[#168BB0]/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className="text-2xl mb-1">{reaction.emoji}</div>
                <div className="text-xs font-medium">{reaction.label}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Selected: {REACTIONS.find(r => r.type === formData.reactionType)?.emoji} {REACTIONS.find(r => r.type === formData.reactionType)?.label}
          </p>
        </div>

        {/* Target Rating - Hidden from UI, defaults to 5_STAR */}

        {/* Review-specific: Review Content */}
        {formData.orderType === "REVIEW" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Review Content *
            </label>
            <textarea
              required
              rows={4}
              value={formData.content}
              onChange={e => {
                setFormData({ ...formData, content: e.target.value });
                setFieldErrors({ ...fieldErrors, content: false });
              }}
              className={`w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 ${
                fieldErrors.content
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'dark:border-zinc-600'
              }`}
              placeholder="Write the review you want..."
            />
            {fieldErrors.content && (
              <p className="text-xs text-red-500 mt-1">Review content is required</p>
            )}
          </div>
        )}

        {/* Comment-specific: Comment Text */}
        {(formData.orderType === "COMMENT" || formData.orderType === "COMMENT_WITH_PHOTO") && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Comment Text * (max 500 characters)
            </label>
            <textarea
              required
              rows={4}
              maxLength={500}
              value={formData.commentText}
              onChange={e => {
                setFormData({ ...formData, commentText: e.target.value });
                setFieldErrors({ ...fieldErrors, commentText: false });
              }}
              className={`w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 ${
                fieldErrors.commentText
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'dark:border-zinc-600'
              }`}
              placeholder="Write the comment you want posted..."
            />
            {fieldErrors.commentText ? (
              <p className="text-xs text-red-500 mt-1">Comment text is required</p>
            ) : (
              <p className="text-xs text-zinc-500 mt-1">
                {formData.commentText.length}/500 characters
              </p>
            )}
          </div>
        )}

        {/* Comments + Photo: Photo Upload */}
        {formData.orderType === "COMMENT_WITH_PHOTO" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Photos * (1-2 photos, max 1MB each)
            </label>
            <div className={fieldErrors.photoUrls ? "border-2 border-red-500 rounded-lg" : ""}>
              <PhotoUpload
                onPhotosChange={(photos) => {
                  setFormData({ ...formData, photoUrls: photos });
                  setFieldErrors({ ...fieldErrors, photoUrls: false });
                }}
                maxPhotos={2}
                currentPhotos={formData.photoUrls}
              />
            </div>
            {fieldErrors.photoUrls && (
              <p className="text-xs text-red-500 mt-1">At least one photo is required</p>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-[#168BB0] text-white rounded-lg hover:bg-[#0F7493] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? "Creating..."
              : `Create Order (${formData.quantity} unit${formData.quantity > 1 ? 's' : ''} × ${creditPricing[formData.orderType]} = ${requiredCredits} credits)`}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
        </div>
        {validation && !validation.hasEnough && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Insufficient credits. You need {validation.requiredCredits - validation.currentBalance} more credits.
              <a href="/c/wallet/top-up" className="underline font-medium ml-2">Buy credits →</a>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
