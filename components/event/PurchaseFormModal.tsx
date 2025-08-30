"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Ticket, Plus, Minus, X } from "lucide-react";
import { t } from "@/lib/i18n/translations";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { SupabaseClient } from "@supabase/supabase-js";
import PhoneNumberInput from "@/components/ui/phone-number-input";
import DjaouliCodeDialog from "@/components/landing/djaouli-code";

// Helper function for formatting price (matching event page)
const formatPrice = (price: number): string => {
  // Use non-breaking space (\u00A0) for thousands separator
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
};

// Define the shape of the ticket/bundle item passed to the modal
interface PurchaseItem {
  id: string; // Sanity _key or bundleId.current
  name: string;
  price: number;
  isBundle: boolean;
  maxPerOrder?: number;
  stock?: number | null;
  productId?: string;
  ticketsIncluded?: number; // Number of tickets included per bundle
}

// Define the expected payload for the Supabase function
interface CreateCheckoutSessionPayload {
  eventId: string;
  eventTitle: string;
  ticketTypeId: string; // Corresponds to PurchaseItem.id
  ticketName: string; // Corresponds to PurchaseItem.name
  pricePerTicket: number;
  quantity: number;
  currencyCode?: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  successUrlPath?: string;
  cancelUrlPath?: string;
  productId?: string;
  allowCouponCode?: boolean;
  allowQuantity?: boolean;
  eventDateText?: string;
  eventTimeText?: string;
  eventVenueName?: string;
  // Bundle-specific fields
  isBundle?: boolean;
  ticketsPerBundle?: number;
}

interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PurchaseItem | null;
  eventDetails: {
    id: string; // Event Sanity _id
    title: string;
    dateText?: string;
    timeText?: string;
    venueName?: string;
  };
  supabaseClient: SupabaseClient; // Pass the Supabase client instance
}

export default function PurchaseFormModal({
  isOpen,
  onClose,
  item,
  eventDetails,
  supabaseClient,
}: PurchaseFormModalProps) {
  const { currentLanguage } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const [quantityDisplay, setQuantityDisplay] = useState("1");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDjaouliCode, setShowDjaouliCode] = useState(false);

  useEffect(() => {
    if (item) {
      setQuantity(1); // Reset quantity when item changes
      setQuantityDisplay("1"); // Reset display value too
      setError(null); // Reset error

      // Only show djaouli code dialog if user hasn't seen it before
      const hasSeenDjaouliCode =
        localStorage.getItem("djaouli-code-shown") === "true";
      if (!hasSeenDjaouliCode) {
        setShowDjaouliCode(true); // Show djaouli code dialog only first time
      }
    }
  }, [item]);

  useEffect(() => {
    if (!isOpen) {
      setShowDjaouliCode(false); // Hide djaouli code dialog when modal closes
    }
  }, [isOpen]);

  if (!item) return null;

  // Refined maxQuantity calculation
  const stockLimit =
    item.stock !== null && item.stock !== undefined && item.stock >= 0
      ? item.stock
      : Infinity;
  const orderLimit = item.maxPerOrder || Infinity;
  const calculatedMax = Math.min(stockLimit, orderLimit);
  // If the item is available (modal is open), stock should be > 0 or unlimited.
  // Thus, calculatedMax should be > 0 or Infinity.
  // Default to 20 if no other limits are effectively set.
  const maxQuantity =
    calculatedMax === Infinity || calculatedMax === 0 ? 20 : calculatedMax;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow empty string for better UX (user can clear and type new number)
    if (value === "") {
      setQuantityDisplay("");
      return;
    }

    // Only allow numeric input
    if (!/^\d+$/.test(value)) {
      return; // Don't update if not a valid number
    }

    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
      return;
    }

    // Update display immediately
    setQuantityDisplay(value);

    // Clamp the value between 1 and maxQuantity for the actual quantity
    const clampedValue = Math.max(1, Math.min(parsedValue, maxQuantity));
    setQuantity(clampedValue);

    // If the parsed value exceeds limits, update display to show the clamped value
    if (parsedValue !== clampedValue) {
      setTimeout(() => setQuantityDisplay(clampedValue.toString()), 0);
    }
  };

  const handleQuantityBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || parseInt(value, 10) < 1) {
      setQuantity(1);
      setQuantityDisplay("1");
    } else {
      // Ensure display matches the actual quantity
      setQuantityDisplay(quantity.toString());
    }
  };

  const handleQuantityIncrement = () => {
    if (quantity < maxQuantity) {
      const newQuantity = quantity + 1;
      setQuantity(newQuantity);
      setQuantityDisplay(newQuantity.toString());
    }
  };

  const handleQuantityDecrement = () => {
    if (quantity > 1) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      setQuantityDisplay(newQuantity.toString());
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userName.trim()) {
      setError(t(currentLanguage, "purchaseModal.errors.nameRequired"));
      return;
    }
    if (!userEmail.trim()) {
      setError(t(currentLanguage, "purchaseModal.errors.emailRequired"));
      return;
    }
    if (!validateEmail(userEmail)) {
      setError(t(currentLanguage, "purchaseModal.errors.emailInvalid"));
      return;
    }
    if (quantity <= 0) {
      setError(t(currentLanguage, "purchaseModal.errors.quantityInvalid"));
      return;
    }
    if (item.maxPerOrder && quantity > item.maxPerOrder) {
      setError(
        t(currentLanguage, "purchaseModal.errors.quantityExceedsMax", {
          max: item.maxPerOrder,
        }),
      );
      return;
    }
    if (
      item.stock !== null &&
      item.stock !== undefined &&
      quantity > item.stock
    ) {
      setError(
        t(currentLanguage, "purchaseModal.errors.quantityExceedsStock", {
          stock: item.stock,
        }),
      );
      return;
    }

    setIsLoading(true);

    console.log("PurchaseFormModal - item.productId:", item.productId);

    const shouldAllowQuantity =
      (item.maxPerOrder && item.maxPerOrder > 1) ||
      item.stock === null ||
      item.stock === undefined ||
      item.stock > 1;

    const payload: CreateCheckoutSessionPayload = {
      eventId: eventDetails.id,
      eventTitle: eventDetails.title,
      ticketTypeId: item.id,
      ticketName: item.name,
      pricePerTicket: item.price,
      quantity: quantity,
      userName: userName.trim(),
      userEmail: userEmail.trim(),
      userPhone: userPhone || undefined, // Send phone number properly formatted
      currencyCode: "XOF", // Assuming XOF, make dynamic if needed
      successUrlPath: "/payment/success", // Or from config
      cancelUrlPath: "/payment/cancel", // Or from config
      productId: item.productId,
      allowCouponCode: true, // Enable coupon codes by default
      allowQuantity: shouldAllowQuantity,
      eventDateText: eventDetails.dateText,
      eventTimeText: eventDetails.timeText,
      eventVenueName: eventDetails.venueName,
      // Bundle-specific fields
      isBundle: item.isBundle,
      ticketsPerBundle: item.ticketsIncluded || 1,
    };

    let successfullyInitiatedRedirect = false;

    try {
      // Note: Ensure your Supabase function is named 'create-lomi-checkout-session'
      const { data, error: functionError } =
        await supabaseClient.functions.invoke("create-lomi-checkout-session", {
          body: payload,
        });

      if (functionError) {
        console.error("Supabase function error:", functionError);
        setError(
          functionError.message ||
            t(currentLanguage, "purchaseModal.errors.functionError"),
        );
        setIsLoading(false);
        return;
      }

      if (data && data.checkout_url) {
        window.location.href = data.checkout_url;
        successfullyInitiatedRedirect = true;
      } else {
        console.error("Lomi checkout URL not found in response:", data);
        setError(
          data.error ||
            t(currentLanguage, "purchaseModal.errors.lomiUrlMissing"),
        );
      }
    } catch (e: unknown) {
      console.error("Error invoking Supabase function:", e);
      let message = t(currentLanguage, "purchaseModal.errors.submitError");
      if (e instanceof Error) {
        message = e.message;
      } else if (typeof e === "string") {
        message = e;
      }
      setError(message);
    } finally {
      // Only set isLoading to false if there was an error and we are not redirecting
      if (!successfullyInitiatedRedirect) {
        setIsLoading(false);
      }
    }
  };

  // Helper function to check if form is valid
  const isFormValid = () => {
    return (
      userName.trim().length > 0 &&
      userEmail.trim().length > 0 &&
      validateEmail(userEmail) &&
      userPhone.trim().length > 4 && // Phone is now required
      quantity > 0
    );
  };

  const totalPrice = item.price * quantity;
  const actualTicketCount = item.isBundle
    ? quantity * (item.ticketsIncluded || 1)
    : quantity;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[425px] max-h-[65vh] sm:max-h-[90vh] overflow-y-auto scrollbar-hide rounded-sm mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-3 pb-4 relative">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="absolute top-0 right-0 h-8 w-8 p-0 hover:bg-muted/50 rounded-full"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-xl font-semibold text-left pr-8">
              {t(currentLanguage, "purchaseModal.title")}
            </DialogTitle>
            <DialogDescription className="text-left text-sm leading-relaxed">
              {t(currentLanguage, "purchaseModal.description")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Item Details - More prominent on mobile */}
              <div className="bg-muted/50 p-4 rounded-sm border">
                <h4 className="font-semibold text-base mb-2 text-center sm:text-left">
                  {item.name}
                </h4>
                <div className="flex justify-center sm:justify-start">
                  {item.isBundle && (
                    <span className="text-xs bg-teal-900/70 text-teal-300 px-3 py-1.5 rounded-sm font-medium border border-teal-600/50">
                      {t(currentLanguage, "purchaseModal.includesTickets", {
                        count: item.ticketsIncluded || 1,
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-medium block text-gray-700 dark:text-gray-300"
                >
                  {t(currentLanguage, "purchaseModal.labels.name")}
                </Label>
                <Input
                  id="name"
                  name="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="rounded-sm h-12 text-base w-full px-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder={t(
                    currentLanguage,
                    "purchaseModal.placeholders.name",
                  )}
                  autoComplete="name"
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium block text-gray-700 dark:text-gray-300"
                >
                  {t(currentLanguage, "purchaseModal.labels.email")}
                </Label>
                <Input
                  id="email"
                  name="userEmail"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="rounded-sm h-12 text-base w-full px-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder={t(
                    currentLanguage,
                    "purchaseModal.placeholders.email",
                  )}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  inputMode="email"
                  required
                />
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label className="text-sm font-medium block text-gray-700 dark:text-gray-300">
                  {t(currentLanguage, "purchaseModal.labels.phone")}
                </Label>
                <div className="h-12">
                  <PhoneNumberInput
                    value={userPhone}
                    onChange={(value) => setUserPhone(value || "")}
                    placeholder={t(
                      currentLanguage,
                      "purchaseModal.placeholders.phone",
                    )}
                  />
                </div>
              </div>

              {/* Quantity Field */}
              <div className="space-y-3">
                <Label
                  htmlFor="quantity"
                  className="text-sm font-medium block text-gray-700 dark:text-gray-300"
                >
                  {t(currentLanguage, "purchaseModal.labels.quantity")}
                </Label>
                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleQuantityDecrement}
                    disabled={quantity <= 1}
                    className="rounded-sm h-14 w-14 p-0 flex-shrink-0 touch-manipulation active:scale-95 transition-transform border-2 hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-6 w-6" />
                  </Button>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantityDisplay}
                    onChange={handleQuantityChange}
                    onBlur={handleQuantityBlur}
                    className="rounded-sm h-14 text-xl font-semibold text-center flex-1 border-2 focus:ring-2 focus:ring-primary focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{ fontSize: "20px", fontWeight: "600" }}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleQuantityIncrement}
                    disabled={quantity >= maxQuantity}
                    className="rounded-sm h-14 w-14 p-0 flex-shrink-0 touch-manipulation active:scale-95 transition-transform border-2 hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 text-center px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-sm border border-red-200 dark:border-red-700/50 leading-relaxed animate-pulse">
                  ⚠️ {error}
                </div>
              )}

              {/* Total Price - More prominent on mobile */}
              <div className="pt-4 border-t border-border bg-muted/30 rounded-sm p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-muted-foreground">
                      {t(currentLanguage, "purchaseModal.totalPrice")}:
                    </span>
                    <span className="text-primary font-bold text-2xl whitespace-nowrap">
                      {formatPrice(totalPrice)}
                      <span className="text-sm ml-1">
                        {t(
                          currentLanguage,
                          "eventSlugPage.tickets.currencySuffix",
                        )}
                      </span>
                    </span>
                  </div>
                  {item.isBundle && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-sm text-muted-foreground">
                        {t(currentLanguage, "purchaseModal.ticketsGenerated")}:
                      </span>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {actualTicketCount}{" "}
                        {actualTicketCount === 1 ? "ticket" : "tickets"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-center pt-6 px-0">
              <Button
                type="submit"
                disabled={isLoading || !isFormValid()}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-sm text-lg font-semibold w-full h-14 touch-manipulation active:scale-[0.98] transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
                style={{ fontSize: "18px", fontWeight: "600" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    {t(currentLanguage, "purchaseModal.buttons.processing")}
                  </>
                ) : (
                  <>
                    <Ticket className="mr-3 h-5 w-5" />
                    {t(currentLanguage, "purchaseModal.buttons.pay")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Djaouli Code Dialog - shows as disclaimer when purchase modal opens */}
      <DjaouliCodeDialog
        isOpen={showDjaouliCode}
        onClose={() => setShowDjaouliCode(false)}
      />
    </>
  );
}
