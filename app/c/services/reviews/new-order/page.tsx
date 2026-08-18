"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { createMultiUrlReviewOrderAction } from "@/app/actions/reviews-multiurl";
import { getReviewOrderSetupAction } from "@/app/actions/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import PhotoUpload from "@/components/ui/PhotoUpload";
import { REACTIONS, type ReactionType } from "@/lib/reactionUtils";
import { useTranslation } from "react-i18next";
import { Plus, X, ChevronRight } from "lucide-react";

type OrderType = "REVIEW" | "COMMENT" | "COMMENT_WITH_PHOTO";

interface ReviewUrlData {
  url: string;
  quantity: number;
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

  // Shake animation styles
  const shakeStyle = `
    @keyframes shake {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-10deg); }
      75% { transform: rotate(10deg); }
    }
    .emoji-shake-always {
      animation: shake 0.5s ease-in-out infinite;
      display: inline-block;
    }
    .emoji-shake-hover:hover {
      animation: shake 0.5s ease-in-out infinite;
      display: inline-block;
    }
  `;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [orderType, setOrderType] = useState<OrderType>("REVIEW");
  const [urls, setUrls] = useState<ReviewUrlData[]>([
    { url: "", quantity: 1, reactionType: "LIKE" as ReactionType }
  ]);

  const [singleReactionType, setSingleReactionType] = useState<ReactionType>("LIKE" as ReactionType);
  const [singleQuantity, setSingleQuantity] = useState(3);

  const [urlReviews, setUrlReviews] = useState<Array<{ reviews: string[]; photos: string[][] }>>([
    { reviews: [""], photos: [[]] }
  ]);

  const [fieldErrors, setFieldErrors] = useState<{
    urls?: Record<number, boolean>;
    reviews?: Record<number, boolean>;
    photos?: Record<number, Record<number, boolean>>;
    quantity?: boolean;
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
    const maxUrls = 10;
    if (urls.length >= maxUrls) {
      toastError(`Maximum ${maxUrls} URLs allowed per order`);
      return;
    }

    setUrls([...urls, { url: "", quantity: 1, reactionType: "LIKE" as ReactionType }]);
    setUrlReviews([...urlReviews, { reviews: [""], photos: [[]] }]);
  };

  const removeUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : [{ url: "", quantity: 1, reactionType: "LIKE" as ReactionType }]);

    const newUrlReviews = urlReviews.filter((_, i) => i !== index);
    setUrlReviews(newUrlReviews.length > 0 ? newUrlReviews : [{ reviews: [""], photos: [[]] }]);

    setFieldErrors({ ...fieldErrors, urls: { ...fieldErrors.urls, [index]: false } });
  };

  const updateUrl = (index: number, field: keyof ReviewUrlData, value: string | number | ReactionType) => {
    const newUrls = [...urls];
    newUrls[index] = { ...newUrls[index], [field]: value };
    setUrls(newUrls);
    setFieldErrors({ ...fieldErrors, urls: { ...fieldErrors.urls, [index]: false } });
  };

  const addReview = (urlIndex: number) => {
    const maxReviews = 50;
    const currentUrlReviews = urlReviews[urlIndex];

    if (currentUrlReviews.reviews.length >= maxReviews) {
      toastError(`Maximum ${maxReviews} reviews per URL`);
      return;
    }

    const newUrlReviews = [...urlReviews];
    newUrlReviews[urlIndex] = {
      ...newUrlReviews[urlIndex],
      reviews: [...newUrlReviews[urlIndex].reviews, ""],
      photos: [...newUrlReviews[urlIndex].photos, []]
    };
    setUrlReviews(newUrlReviews);
  };

  const removeReview = (urlIndex: number, reviewIndex: number) => {
    const newUrlReviews = [...urlReviews];
    const urlReviewsData = [...newUrlReviews[urlIndex].reviews];
    const urlPhotosData = [...newUrlReviews[urlIndex].photos];

    urlReviewsData.splice(reviewIndex, 1);
    urlPhotosData.splice(reviewIndex, 1);

    newUrlReviews[urlIndex] = {
      reviews: urlReviewsData.length > 0 ? urlReviewsData : [""],
      photos: urlPhotosData.length > 0 ? urlPhotosData : [[]]
    };
    setUrlReviews(newUrlReviews);
  };

  const updateReview = (urlIndex: number, reviewIndex: number, value: string) => {
    const newUrlReviews = [...urlReviews];
    newUrlReviews[urlIndex] = {
      ...newUrlReviews[urlIndex],
      reviews: [...newUrlReviews[urlIndex].reviews]
    };
    newUrlReviews[urlIndex].reviews[reviewIndex] = value;
    setUrlReviews(newUrlReviews);
    setFieldErrors({ ...fieldErrors, reviews: { ...fieldErrors.reviews, [reviewIndex]: false } });
  };

  const updatePhotos = (urlIndex: number, reviewIndex: number, photos: string[]) => {
    const newUrlReviews = [...urlReviews];
    newUrlReviews[urlIndex] = {
      ...newUrlReviews[urlIndex],
      photos: [...newUrlReviews[urlIndex].photos]
    };
    newUrlReviews[urlIndex].photos[reviewIndex] = photos;
    setUrlReviews(newUrlReviews);
    const newPhotoErrors = { ...fieldErrors.photos, [urlIndex]: { ...fieldErrors.photos?.[urlIndex] } };
    delete newPhotoErrors[urlIndex][reviewIndex];
    setFieldErrors({ ...fieldErrors, photos: newPhotoErrors });
  };

  const totalReviewsCount = urlReviews.reduce((sum, urlData) => {
    return sum + urlData.reviews.filter(r => r.trim().length > 0).length;
  }, 0);

  const totalQuantity = orderType === "COMMENT"
    ? singleQuantity * urls.filter(u => u.url.trim()).length
    : orderType === "REVIEW"
    ? urlReviews[0].reviews.filter(r => r.trim()).length * urls.filter(u => u.url.trim()).length
    : totalReviewsCount;

  const requiredCredits = (creditPricing[orderType] || 0) * totalQuantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URLs
    const urlErrors: Record<number, boolean> = {};
    urls.forEach((urlData, index) => {
      if (!urlData.url || !/^(https?:\/\/)?(www\.)?(facebook|fb)\.com\/.+/i.test(urlData.url)) {
        urlErrors[index] = true;
      }
    });

    if (Object.keys(urlErrors).length > 0) {
      setFieldErrors({ urls: urlErrors });
      return;
    }

    // Validate per-URL reviews and photos for REVIEW and COMMENT_WITH_PHOTO
    if (orderType === "REVIEW" || orderType === "COMMENT_WITH_PHOTO") {
      let totalReviews = 0;
      const reviewErrors: Record<number, boolean> = {};
      const photoErrors: Record<number, Record<number, boolean>> = {};

      // For REVIEW type: Only validate URL #1 (others use same reviews)
      // For COMMENT_WITH_PHOTO: Validate all URLs
      const urlsToValidate = orderType === "REVIEW" ? [0] : urlReviews.map((_, i) => i);

      urlsToValidate.forEach((urlIndex) => {
        const urlData = urlReviews[urlIndex];
        const validUrlReviews = urlData.reviews.filter(r => r.trim().length > 0);
        totalReviews += validUrlReviews.length;

        if (validUrlReviews.length > 50) {
          toastError("Maximum 50 reviews per URL");
          return;
        }

        urlData.reviews.forEach((content, reviewIndex) => {
          if (!content?.trim()) {
            reviewErrors[reviewIndex] = true;
          }
        });

        if (orderType === "COMMENT_WITH_PHOTO") {
          urlData.reviews.forEach((content, reviewIndex) => {
            if (content?.trim() && (!urlData.photos[reviewIndex] || urlData.photos[reviewIndex].length === 0)) {
              if (!photoErrors[urlIndex]) photoErrors[urlIndex] = {};
              photoErrors[urlIndex][reviewIndex] = true;
            }
          });
        }
      });

      if (totalReviews > 500) {
        toastError("Maximum 500 reviews total across all URLs");
        return;
      }

      if (totalReviews === 0) {
        setFieldErrors({ reviews: { 0: true } });
        toastError("Please add at least one review");
        return;
      }

      if (Object.keys(reviewErrors).length > 0) {
        setFieldErrors({ reviews: reviewErrors });
        return;
      }

      if (Object.keys(photoErrors).length > 0) {
        setFieldErrors({ photos: photoErrors });
        toastError("Please add photos for all reviews");
        return;
      }
    }

    // Validate at least one URL
    const validUrls = urls.filter(u => u.url.trim().length > 0);
    if (validUrls.length === 0) {
      setFieldErrors({ urls: { 0: true } });
      toastError("Please add at least one URL");
      return;
    }

    setSubmitting(true);

    try {
      console.log("🧪 [DEBUG] Current singleReactionType:", singleReactionType);
      console.log("🧪 [DEBUG] Current singleQuantity:", singleQuantity);

      const orderData = {
        orderType,
        urls: urls.map((urlData, index) => ({
          url: urlData.url,
          quantity: orderType === "COMMENT"
            ? singleQuantity
            : orderType === "REVIEW"
            ? urlReviews[0].reviews.filter(r => r.trim()).length // Use URL #1 review count for all
            : urlReviews[index].reviews.filter(r => r.trim()).length,
          reviewContents: orderType === "REVIEW" || orderType === "COMMENT_WITH_PHOTO"
            ? orderType === "REVIEW"
              ? urlReviews[0].reviews.filter(r => r.trim()) // Use URL #1 reviews for all URLs
              : urlReviews[index].reviews.filter(r => r.trim())
            : undefined,
          photos: orderType === "COMMENT_WITH_PHOTO"
            ? urlReviews[index].photos.filter((p, i) => urlReviews[index].reviews[i]?.trim())
            : undefined,
          reactionType: orderType === "COMMENT" ? singleReactionType : urlData.reactionType
        }))
      };

      console.log("📤 [ORDER SUBMIT] Sending order data:", JSON.stringify(orderData, null, 2));

      const result = await createMultiUrlReviewOrderAction(orderData);

      if (result.success) {
        toastSuccess(t("reviews.order_created", "Order created successfully"));
        router.push("/c/services/reviews/orders");
      } else {
        toastError(result.error || t("reviews.order_failed", "Failed to create order"));
      }
    } catch (error) {
      toastError(t("reviews.order_error", "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <style jsx>{shakeStyle}</style>
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 p-4">
        <div className="max-w mx-auto bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
          <form onSubmit={handleSubmit}>
          {/* Order Type Section */}
          <div className="p-4 border-b border-gray-200 dark:border-zinc-700">
            <label className="block text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">
              Order Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(ORDER_TYPE_LABELS).map(([type, info]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrderType(type as OrderType)}
                  className={`relative p-3 rounded-lg border text-center transition-all ${
                    orderType === type
                      ? 'border-[#007bff] bg-[#007bff]/5'
                      : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                  }`}
                >
                  <div className={`absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center ${
                    orderType === type
                      ? 'border-[#007bff] bg-[#007bff]'
                      : 'border-gray-300 dark:border-zinc-600'
                  }`}>
                    {orderType === type && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="text-2xl mb-1">{info.icon}</div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-zinc-50">{info.label}</div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400">{info.description}</div>
                  <div className="mt-2 text-xs text-gray-600 dark:text-zinc-400 font-medium">
                    {creditPricing[type as OrderType]} cr
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reaction Type & Quantity Section - Only for COMMENT orders */}
          {orderType === "COMMENT" && (
            <div className="p-4 border-b border-gray-200 dark:border-zinc-700">
              <label className="block text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">
                Reaction Type <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
                Select the reaction type. This will be applied to all URLs.
              </p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {REACTIONS.map((reaction) => (
                  <button
                    key={reaction.type}
                    type="button"
                    onClick={() => setSingleReactionType(reaction.type)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      singleReactionType === reaction.type
                        ? 'border-[#007bff] bg-[#007bff]/5'
                        : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                    }`}
                  >
                    <div className={`text-2xl mb-1 ${singleReactionType === reaction.type ? 'emoji-shake-always' : 'emoji-shake-hover'}`}>{reaction.emoji}</div>
                    <div className="text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase">{reaction.label}</div>
                  </button>
                ))}
              </div>

              <label className="block text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-2">
                Quantity per URL <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
                How many reactions for EACH URL? This quantity will be applied to all URLs.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={singleQuantity}
                  onChange={(e) => {
                    setSingleQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)));
                    setFieldErrors({ ...fieldErrors, quantity: false });
                  }}
                  className={`w-24 px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-sm text-center font-semibold ${
                    fieldErrors.quantity
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 dark:border-zinc-700 focus:border-[#007bff]'
                  }`}
                />
                <span className="text-xs text-gray-600 dark:text-zinc-400">
                  reactions per URL
                </span>
              </div>
              {fieldErrors.quantity && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">Quantity must be between 1 and 50</p>
              )}
            </div>
          )}

          {/* URLs Section */}
          <div className="p-4">
            <label className="block text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-2">
              URLs <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
              {orderType === "COMMENT"
                ? `Add multiple URLs. Each URL will get ${singleQuantity} ${singleReactionType.toLowerCase()} reaction${singleQuantity !== 1 ? 's' : ''}. Total: ${totalQuantity} reaction${totalQuantity !== 1 ? 's' : ''}`
                : `Add multiple URLs. All reviews will be posted to each URL. Total: ${totalQuantity} reviews`
              }
            </p>

            <div className="space-y-4">
              {urls.map((urlData, urlIndex) => {
                const currentUrlReviews = urlReviews[urlIndex] || { reviews: [""], photos: [[]] };
                const filledReviewsCount = currentUrlReviews.reviews.filter(r => r.trim()).length;

                return (
                  <div key={urlIndex} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-gray-50 dark:bg-zinc-800/50">
                    {/* URL Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#007bff] text-white flex items-center justify-center text-xs font-bold">
                          {urlIndex + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                          URL {urlIndex + 1}
                        </span>
                      </div>
                      {urlIndex > 0 && (
                        <button
                          onClick={() => removeUrl(urlIndex)}
                          className="text-gray-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700"
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* URL Input */}
                    <input
                      type="url"
                      placeholder="https://..."
                      value={urlData.url}
                      onChange={(e) => updateUrl(urlIndex, 'url', e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-sm mb-4 ${
                        fieldErrors.urls?.[urlIndex]
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-gray-200 dark:border-zinc-700 focus:border-[#007bff]'
                      }`}
                    />

                    {/* Review Contents Section */}
                    {(orderType === "REVIEW" || orderType === "COMMENT_WITH_PHOTO") && (
                      <div>
                        {/* For REVIEW type: Only URL #1 has review inputs, others show message */}
                        {orderType === "REVIEW" && urlIndex > 0 ? (
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                              ✓ Same reviews from URL #1 will be posted to this URL
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Quantity: {filledReviewsCount} reviews
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <label className="block text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                Review Contents
                              </label>
                            </div>

                            <div className="space-y-3">
                              {currentUrlReviews.reviews.map((content, reviewIndex) => (
                                <div key={reviewIndex} className="relative">
                                  <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#007bff] text-white flex items-center justify-center text-xs font-bold shrink-0">
                                      {reviewIndex + 1}
                                    </div>

                                    <textarea
                                      rows={1}
                                      maxLength={500}
                                      value={content}
                                      onChange={(e) => updateReview(urlIndex, reviewIndex, e.target.value)}
                                      placeholder="This product is good..."
                                      className={`w-full px-3 py-2 pr-8 rounded-lg border bg-white dark:bg-zinc-800 text-sm resize-none ${
                                        fieldErrors.reviews?.[reviewIndex]
                                          ? 'border-red-300 focus:border-red-500'
                                          : 'border-gray-200 dark:border-zinc-700 focus:border-[#007bff]'
                                      }`}
                                    />

                                    <button
                                      type="button"
                                      onClick={() => removeReview(urlIndex, reviewIndex)}
                                      className="absolute right-2 top-2 text-gray-400 hover:text-red-500 p-1"
                                      title="Remove review"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {/* Photo Upload for COMMENT_WITH_PHOTO */}
                                  {orderType === "COMMENT_WITH_PHOTO" && (
                                    <div className="ml-9 mt-2">
                                      <PhotoUpload
                                        onPhotosChange={(photos) => updatePhotos(urlIndex, reviewIndex, photos)}
                                        maxPhotos={1}
                                        currentPhotos={currentUrlReviews.photos[reviewIndex] || []}
                                        size="small"
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {filledReviewsCount < 50 && (
                              <button
                                type="button"
                                onClick={() => addReview(urlIndex)}
                                className="mt-3 text-sm text-[#007bff] hover:underline flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" />
                                Add another review ({filledReviewsCount}/50)
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Another URL Button */}
            {urls.length < 10 && (
              <button
                type="button"
                onClick={addUrl}
                className="mt-4 text-sm text-[#007bff] hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Another URL ({urls.length}/10)
              </button>
            )}
          </div>

          {/* Summary Section */}
          <div className="p-4 border-t border-gray-200 dark:border-zinc-700">
            <div className="grid grid-cols-2 gap-4">
              {/* Total Reviews Card */}
              <div className="bg-[#e9f5ff] dark:bg-[#007bff]/10 rounded-lg p-4 border border-[#007bff]/20">
                <label className="block text-xs font-semibold text-gray-900 dark:text-zinc-100 mb-1">
                  Total Reviews
                </label>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mb-1">
                  {totalQuantity} reviews × {urls.filter(u => u.url.trim()).length} URL{urls.filter(u => u.url.trim()).length !== 1 ? 's' : ''}
                </p>
                <p className="text-lg font-bold text-[#007bff]">
                  {totalQuantity} <span className="text-xs font-normal">reviews</span>
                </p>
              </div>

              {/* Total Cost Card */}
              <div className="bg-[#e9f5ff] dark:bg-[#007bff]/10 rounded-lg p-4 border border-[#007bff]/20">
                <label className="block text-xs font-semibold text-gray-900 dark:text-zinc-100 mb-1">
                  Total Cost
                </label>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mb-1">
                  {totalQuantity} × {creditPricing[orderType]}
                </p>
                <p className="text-lg font-bold text-[#007bff]">
                  {requiredCredits} <span className="text-xs font-normal">cr</span>
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="p-4 border-t border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 rounded-b-lg flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !validation?.hasEnough}
              className="flex-1 px-4 py-2 bg-[#007bff] text-white rounded-lg font-medium hover:bg-[#0056b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? 'Creating...' : (
                <>
                  Create Order
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
