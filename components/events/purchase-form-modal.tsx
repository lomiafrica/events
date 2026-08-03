"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Ticket, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { t } from "@/lib/i18n/translations";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { SupabaseClient } from "@supabase/supabase-js";
import PhoneNumberInput from "@/components/ui/phone-number-input";
import DjaouliCodeDialog from "@/components/landing/djaouli-code";
import { useIsMobile } from "@/lib/utils/use-is-mobile";

const PURCHASE_MODAL_PORTAL_ID = "purchase-modal-portal";

// Helper function for formatting price (matching event page)
const formatPrice = (price: number): string => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
};

interface PurchaseItem {
  id: string;
  name: string;
  price: number;
  isBundle: boolean;
  maxPerOrder?: number;
  stock?: number | null;
  productId?: string;
  ticketsIncluded?: number;
}

interface CreateCheckoutSessionPayload {
  eventId: string;
  eventTitle: string;
  ticketTypeId: string;
  ticketName: string;
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
  isBundle?: boolean;
  ticketsPerBundle?: number;
}

interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PurchaseItem | null;
  eventDetails: {
    id: string;
    title: string;
    dateText?: string;
    timeText?: string;
    venueName?: string;
  };
  supabaseClient: SupabaseClient;
}

export default function PurchaseFormModal({
  isOpen,
  onClose,
  item,
  eventDetails,
  supabaseClient,
}: PurchaseFormModalProps) {
  const { currentLanguage } = useTranslation();
  const isMobile = useIsMobile();
  const [quantity, setQuantity] = useState(1);
  const [quantityDisplay, setQuantityDisplay] = useState("1");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDjaouliCode, setShowDjaouliCode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [mobileVisibleHeight, setMobileVisibleHeight] = useState<number | null>(
    null,
  );

  useEffect(() => {
    setIsMounted(true);
    if (typeof document !== "undefined") {
      let el = document.getElementById(PURCHASE_MODAL_PORTAL_ID);
      if (!el) {
        el = document.createElement("div");
        el.id = PURCHASE_MODAL_PORTAL_ID;
        document.body.appendChild(el);
      }
      setPortalNode(el);
    }
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isMobile || typeof window === "undefined") {
      setMobileVisibleHeight(null);
      return;
    }
    const vv = window.visualViewport;
    const apply = () => {
      setMobileVisibleHeight(
        vv ? Math.round(vv.height) : Math.round(window.innerHeight),
      );
    };
    apply();
    if (vv) {
      vv.addEventListener("resize", apply);
      vv.addEventListener("scroll", apply);
      return () => {
        vv.removeEventListener("resize", apply);
        vv.removeEventListener("scroll", apply);
      };
    }
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [isOpen, isMobile]);

  const scrollActiveFieldIntoView = useCallback(() => {
    if (!isMobile) return;
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        const el = document.activeElement;
        if (el instanceof HTMLElement && el.tagName !== "BODY") {
          el.scrollIntoView({
            block: "center",
            behavior: "instant",
            inline: "nearest",
          });
        }
      }, 120);
    });
  }, [isMobile]);

  useEffect(() => {
    if (item) {
      setQuantity(1);
      setQuantityDisplay("1");
      setError(null);

      const hasSeenDjaouliCode =
        localStorage.getItem("djaouli-code-shown") === "true";
      if (!hasSeenDjaouliCode) {
        setShowDjaouliCode(true);
      }
    }
  }, [item]);

  useEffect(() => {
    if (!isOpen) {
      setShowDjaouliCode(false);
    }
  }, [isOpen]);

  if (!item) return null;

  const stockLimit =
    item.stock !== null && item.stock !== undefined && item.stock >= 0
      ? item.stock
      : Infinity;
  const orderLimit = item.maxPerOrder || Infinity;
  const calculatedMax = Math.min(stockLimit, orderLimit);
  const maxQuantity =
    calculatedMax === Infinity || calculatedMax === 0 ? 20 : calculatedMax;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value === "") {
      setQuantityDisplay("");
      return;
    }

    if (!/^\d+$/.test(value)) {
      return;
    }

    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
      return;
    }

    setQuantityDisplay(value);

    const clampedValue = Math.max(1, Math.min(parsedValue, maxQuantity));
    setQuantity(clampedValue);

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
      userPhone: userPhone || undefined,
      currencyCode: "XOF",
      successUrlPath: "/payment/success",
      cancelUrlPath: "/payment/cancel",
      productId: item.productId,
      allowCouponCode: true,
      allowQuantity: shouldAllowQuantity,
      eventDateText: eventDetails.dateText,
      eventTimeText: eventDetails.timeText,
      eventVenueName: eventDetails.venueName,
      isBundle: item.isBundle,
      ticketsPerBundle: item.ticketsIncluded || 1,
    };

    let successfullyInitiatedRedirect = false;

    try {
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
      if (!successfullyInitiatedRedirect) {
        setIsLoading(false);
      }
    }
  };

  const isFormValid = () => {
    return (
      userName.trim().length > 0 &&
      userEmail.trim().length > 0 &&
      validateEmail(userEmail) &&
      userPhone.trim().length > 4 &&
      quantity > 0
    );
  };

  const totalPrice = item.price * quantity;
  const actualTicketCount = item.isBundle
    ? quantity * (item.ticketsIncluded || 1)
    : quantity;

  if (!isMounted || !portalNode) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="purchase-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 z-[60] bg-foreground/30 will-change-auto cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              aria-hidden="true"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />

            <motion.div
              key="purchase-panel"
              {...(isMobile
                ? {
                    initial: { y: "100%" },
                    animate: { y: 0 },
                    exit: { y: "100%" },
                  }
                : {
                    initial: { x: "100%" },
                    animate: { x: 0 },
                    exit: { x: "100%" },
                  })}
              transition={{
                duration: isMobile ? 0.22 : 0.3,
                ease: isMobile ? [0.32, 0.72, 0, 1] : "easeInOut",
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="purchase-modal-title"
              className={`fixed z-[70] will-change-transform pointer-events-auto overscroll-contain flex flex-col ${
                isMobile
                  ? "inset-x-0 bottom-0 w-full max-h-[100dvh]"
                  : "top-0 bottom-0 right-0 w-full md:w-[500px] md:p-4"
              }`}
              style={
                isMobile
                  ? { position: "fixed", left: 0, right: 0, bottom: 0 }
                  : { position: "fixed", top: 0, right: 0, bottom: 0 }
              }
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex flex-col w-full min-h-0 bg-[#1a1a1a] backdrop-blur-xl rounded-t-xl md:rounded-sm shadow-2xl p-4 md:h-full md:min-h-0 h-[min(96dvh,100%)]"
                style={
                  isMobile && mobileVisibleHeight != null
                    ? { maxHeight: mobileVisibleHeight }
                    : undefined
                }
              >
                <div className="flex items-start py-3 md:py-6 flex-shrink-0">
                  <div>
                    <h2
                      id="purchase-modal-title"
                      className="text-2xl md:text-3xl font-bold text-foreground"
                    >
                      {t(currentLanguage, "purchaseModal.title")}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(currentLanguage, "purchaseModal.description")}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 overscroll-y-contain [-webkit-overflow-scrolling:touch]">
                  <form
                    id="purchase-checkout-form"
                    onSubmit={handleSubmit}
                    className="space-y-5 md:space-y-6 py-1 md:py-2"
                  >
                    <div className="bg-muted/30 p-3 rounded-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatPrice(item.price)}
                            {t(
                              currentLanguage,
                              "eventSlugPage.tickets.currencySuffix",
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {item.isBundle && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-sm">
                              {t(currentLanguage, "purchaseModal.bundleBadge", {
                                count: item.ticketsIncluded || 1,
                              })}
                            </span>
                          )}
                          {!item.isBundle &&
                            item.stock !== null &&
                            item.stock !== undefined &&
                            item.stock > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded-sm bg-muted/50 text-muted-foreground">
                                {t(currentLanguage, "purchaseModal.only")}{" "}
                                {item.stock}{" "}
                                {item.stock === 1
                                  ? t(
                                      currentLanguage,
                                      "purchaseModal.available",
                                    )
                                  : t(
                                      currentLanguage,
                                      "purchaseModal.availablePlural",
                                    )}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm">
                        {t(currentLanguage, "purchaseModal.labels.name")}
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        onFocus={scrollActiveFieldIntoView}
                        autoComplete="name"
                        enterKeyHint="next"
                        autoCapitalize="words"
                        className="rounded-sm min-h-11 text-base md:h-9 md:min-h-0 md:text-sm mt-2"
                        placeholder={t(
                          currentLanguage,
                          "purchaseModal.placeholders.name",
                        )}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm">
                        {t(currentLanguage, "purchaseModal.labels.email")}
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        onFocus={scrollActiveFieldIntoView}
                        autoComplete="email"
                        enterKeyHint="next"
                        inputMode="email"
                        className="rounded-sm min-h-11 text-base md:h-9 md:min-h-0 md:text-sm mt-2"
                        placeholder={t(
                          currentLanguage,
                          "purchaseModal.placeholders.email",
                        )}
                        required
                      />
                    </div>

                    <div
                      className="space-y-2"
                      onFocusCapture={scrollActiveFieldIntoView}
                    >
                      <Label className="text-sm">
                        {t(currentLanguage, "purchaseModal.labels.phone")}
                      </Label>
                      <PhoneNumberInput
                        value={userPhone}
                        onChange={(value) => setUserPhone(value || "")}
                        className="rounded-sm h-9 text-sm mt-2"
                        placeholder={t(
                          currentLanguage,
                          "purchaseModal.placeholders.phone",
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="text-sm">
                        {t(currentLanguage, "purchaseModal.labels.quantity")}
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleQuantityDecrement}
                          disabled={quantity <= 1}
                          className="rounded-sm min-h-11 min-w-11 h-11 w-11 shrink-0 p-0 mt-2 md:h-9 md:min-h-0 md:min-w-0 md:w-9"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          id="quantity"
                          name="quantity"
                          type="text"
                          inputMode="numeric"
                          value={quantityDisplay}
                          onChange={handleQuantityChange}
                          onBlur={handleQuantityBlur}
                          onFocus={scrollActiveFieldIntoView}
                          enterKeyHint="done"
                          className="rounded-sm min-h-11 text-base text-center flex-1 md:h-9 md:min-h-0 md:text-sm mt-2"
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleQuantityIncrement}
                          disabled={quantity >= maxQuantity}
                          className="rounded-sm min-h-11 min-w-11 h-11 w-11 shrink-0 p-0 mt-2 md:h-9 md:min-h-0 md:min-w-0 md:w-9"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {error && (
                      <div className="text-xs text-red-400 text-center px-3 py-2 bg-red-900/20 rounded-sm border border-red-700/50 mt-2">
                        {error}
                      </div>
                    )}

                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          {t(currentLanguage, "purchaseModal.totalPrice")}
                        </span>
                        <span className="text-primary font-semibold">
                          {formatPrice(totalPrice)}
                          {t(
                            currentLanguage,
                            "eventSlugPage.tickets.currencySuffix",
                          )}
                        </span>
                      </div>
                      {item.isBundle && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {t(
                              currentLanguage,
                              "purchaseModal.ticketsGenerated",
                            )}
                          </span>
                          <span className="text-xs font-medium">
                            {actualTicketCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </form>
                </div>

                <div className="px-3 md:px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4 border-t border-border flex-shrink-0">
                  <Button
                    type="submit"
                    form="purchase-checkout-form"
                    disabled={isLoading || !isFormValid()}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-sm w-full font-medium min-h-11 h-11 md:h-10 md:min-h-0"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t(currentLanguage, "purchaseModal.buttons.processing")}
                      </>
                    ) : (
                      <>
                        <Ticket className="mr-2 h-4 w-4" />
                        {t(currentLanguage, "purchaseModal.buttons.pay")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DjaouliCodeDialog
        isOpen={showDjaouliCode}
        onClose={() => setShowDjaouliCode(false)}
      />
    </>,
    portalNode,
  );
}
