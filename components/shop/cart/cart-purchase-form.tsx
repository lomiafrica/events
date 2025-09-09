"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useCart } from "./cart-context";
import { supabase } from "@/lib/supabase/client";
import PhoneNumberInput from "@/components/ui/phone-number-input";
import { cn } from "@/lib/actions/utils";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";

const CartContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={cn("px-3 md:px-4", className)}>{children}</div>;
};

export default function CartPurchaseForm() {
  const { cart } = useCart();
  const { currentLanguage } = useTranslation();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userName.trim()) {
      setError(t(currentLanguage, "cartPurchaseForm.errors.nameRequired"));
      return;
    }
    if (!userEmail.trim()) {
      setError(t(currentLanguage, "cartPurchaseForm.errors.emailRequired"));
      return;
    }
    if (!validateEmail(userEmail)) {
      setError(t(currentLanguage, "cartPurchaseForm.errors.emailInvalid"));
      return;
    }
    if (!userPhone.trim()) {
      setError(t(currentLanguage, "cartPurchaseForm.errors.phoneRequired"));
      return;
    }

    if (!cart || cart.lines.length === 0) {
      setError(t(currentLanguage, "cartPurchaseForm.errors.cartEmpty"));
      return;
    }

    setIsLoading(true);

    try {
      // Prepare cart items for the API
      const cartItems = cart.lines.map((line) => ({
        merchandiseId: line.id,
        quantity: line.quantity,
        productId: line.product.productId,
        title: line.product.name,
        price: line.product.price,
      }));

      const payload = {
        cartItems,
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        userPhone: userPhone.trim(),
        currencyCode: "XOF",
        successUrlPath: "/payment/success",
        cancelUrlPath: "/payment/cancel",
        allowCouponCode: true,
        allowQuantity: false,
      };

      const { data, error: functionError } = await supabase.functions.invoke(
        "create-lomi-cart-checkout",
        { body: payload },
      );

      if (functionError) {
        console.error("Function error:", functionError);
        setError(
          functionError.message ||
            t(currentLanguage, "cartPurchaseForm.errors.checkoutFailed"),
        );
        return;
      }

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(
          t(currentLanguage, "cartPurchaseForm.errors.checkoutUrlFailed"),
        );
      }
    } catch (e: unknown) {
      console.error("Checkout error:", e);
      const message =
        e instanceof Error
          ? e.message
          : t(currentLanguage, "cartPurchaseForm.errors.unexpectedError");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = cart?.cost.totalAmount.amount || "0";

  return (
    <div className="flex flex-col justify-between h-full overflow-hidden">
      <CartContainer className="flex justify-between items-center px-2 text-sm text-muted-foreground mb-4">
        <span className="font-medium">
          {t(currentLanguage, "cartPurchaseForm.title")}
        </span>
        <span className="bg-muted/50 px-2 py-1 rounded-sm text-xs">
          {cart?.lines.length === 1
            ? t(currentLanguage, "cartPurchaseForm.itemCount", {
                count: cart?.lines.length || 0,
              })
            : t(currentLanguage, "cartPurchaseForm.itemCountPlural", {
                count: cart?.lines.length || 0,
              })}
        </span>
      </CartContainer>

      <div className="relative flex-1 min-h-0 py-4 overflow-y-auto">
        <CartContainer>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
              <Label htmlFor="name" className="text-sm font-medium">
                {t(currentLanguage, "cartPurchaseForm.labels.name")} *
              </Label>
              <Input
                id="name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="rounded-sm mt-2"
                placeholder={t(
                  currentLanguage,
                  "cartPurchaseForm.placeholders.name",
                )}
                required
              />
            </div>

            <div className="space-y-6">
              <Label htmlFor="email" className="text-sm font-medium">
                {t(currentLanguage, "cartPurchaseForm.labels.email")} *
              </Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="rounded-sm mt-2"
                placeholder={t(
                  currentLanguage,
                  "cartPurchaseForm.placeholders.email",
                )}
                required
              />
            </div>

            <div className="space-y-6">
              <Label className="text-sm font-medium">
                {t(currentLanguage, "cartPurchaseForm.labels.phone")} *
              </Label>
              <PhoneNumberInput
                value={userPhone}
                onChange={(value) => setUserPhone(value || "")}
                className="mt-2"
                placeholder={t(
                  currentLanguage,
                  "cartPurchaseForm.placeholders.phone",
                )}
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 text-center px-2 py-2 bg-red-900/20 rounded-sm border border-red-700/50">
                {error}
              </div>
            )}
          </form>
          {/* Mobile spacing below form fields */}
          <div className="md:hidden h-6"></div>
        </CartContainer>
      </div>

      <CartContainer>
        <div className="py-3 text-sm shrink-0">
          <CartContainer className="space-y-2">
            <div className="flex justify-between items-center py-3">
              <p className="font-medium text-foreground">
                {t(currentLanguage, "cartPurchaseForm.shipping")}
              </p>
              <p className="text-muted-foreground">
                {t(currentLanguage, "cartPurchaseForm.shippingCalculated")}
              </p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-lg font-bold text-foreground">
                {t(currentLanguage, "cartPurchaseForm.total")}
              </p>
              <p className="text-xl font-bold text-primary">
                {Number(totalAmount).toLocaleString("fr-FR")}{" "}
                {t(currentLanguage, "cartPurchaseForm.currency")}
              </p>
            </div>
          </CartContainer>
        </div>

        <div className="mt-4">
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !userName.trim() ||
              !userEmail.trim() ||
              !userPhone.trim()
            }
            className="w-full bg-teal-800 hover:bg-teal-700 text-teal-200 rounded-sm font-semibold h-9"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                {t(currentLanguage, "cartPurchaseForm.buttons.processing")}
              </>
            ) : (
              t(currentLanguage, "cartPurchaseForm.buttons.completePurchase")
            )}
          </Button>
        </div>
      </CartContainer>
    </div>
  );
}
