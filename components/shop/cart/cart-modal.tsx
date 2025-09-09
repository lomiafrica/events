"use client";

import { PlusCircleIcon, ShoppingCart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useCart } from "./cart-context";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Loader from "@/components/ui/Bouncer";
import { CartItemCard } from "./cart-item-card";
import Link from "next/link";
import { cn } from "@/lib/actions/utils";
import { createPortal } from "react-dom";
import CartPurchaseForm from "./cart-purchase-form";

const CartContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={cn("px-3 md:px-4", className)}>{children}</div>;
};

const CartItems = ({
  closeCart,
  onProceedToCheckout,
}: {
  closeCart: () => void;
  onProceedToCheckout: () => void;
}) => {
  const { cart } = useCart();

  if (!cart) return <></>;

  return (
    <div className="flex flex-col justify-between h-full overflow-hidden">
      <CartContainer className="flex justify-between items-center px-2 text-sm text-muted-foreground mb-4">
        <span className="font-medium">Products</span>
        <span className="bg-muted/50 px-2 py-1 rounded-sm text-xs">
          {cart.lines.length} item{cart.lines.length !== 1 ? "s" : ""}
        </span>
      </CartContainer>
      <div className="relative flex-1 min-h-0 py-4 overflow-x-hidden">
        <CartContainer className="overflow-y-auto flex flex-col gap-y-3 h-full scrollbar-hide">
          <AnimatePresence>
            {cart.lines.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: i * 0.1, ease: "easeOut" }}
              >
                <CartItemCard item={item} onCloseCart={closeCart} />
              </motion.div>
            ))}
          </AnimatePresence>
        </CartContainer>
      </div>
      <CartContainer>
        <div className="py-3 text-sm shrink-0">
          <CartContainer className="space-y-2">
            <div className="flex justify-between items-center py-3">
              <p className="font-medium text-foreground">Shipping</p>
              <p className="text-muted-foreground">Calculated at checkout</p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-lg font-bold text-foreground">Total</p>
              <p className="text-xl font-bold text-primary">
                {Number(cart.cost.totalAmount.amount).toLocaleString("fr-FR")} F
                CFA
              </p>
            </div>
          </CartContainer>
        </div>
        <CheckoutButton onProceedToCheckout={onProceedToCheckout} />
      </CartContainer>
    </div>
  );
};

const serializeCart = (cart: { lines: { id: string; quantity: number }[] }) => {
  return JSON.stringify(
    cart.lines.map((line) => ({
      merchandiseId: line.id,
      // Don't include quantity changes for auto-open logic
    })),
  );
};

export default function CartModal() {
  const { cart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const serializedCart = useRef(cart ? serializeCart(cart) : undefined);

  // Ensure component is mounted before rendering portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!cart) return;

    const newSerializedCart = serializeCart(cart);

    // Initialize on first load
    if (serializedCart.current === undefined) {
      serializedCart.current = newSerializedCart;
      return;
    }

    // Only auto-open cart if items were added (not just quantity changes) and cart has items
    if (
      serializedCart.current !== newSerializedCart &&
      cart.totalQuantity > 0
    ) {
      serializedCart.current = newSerializedCart;
      // Open cart instantly when items are added
      setIsOpen(true);
    } else {
      // Update the serialized cart reference even if we don't open
      serializedCart.current = newSerializedCart;
    }
  }, [cart]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => {
    setIsOpen(false);
    setShowPurchaseForm(false);
  };

  const renderCartContent = () => {
    if (!cart || cart.lines.length === 0) {
      return (
        <CartContainer className="flex w-full">
          <Link
            href="/merch"
            className="p-6 w-full bg-card/30 backdrop-blur-sm rounded-sm hover:bg-card/50 transition-all duration-300"
            onClick={closeCart}
          >
            <div className="flex flex-row gap-6 items-center">
              <div className="flex overflow-hidden relative justify-center items-center rounded-sm border border-dashed size-20 shrink-0 border-border/50 bg-muted/30">
                <PlusCircleIcon className="size-6 text-muted-foreground" />
              </div>
              <div className="flex flex-col flex-1 gap-2">
                <span className="text-xl font-bold text-foreground">
                  Your cart is empty
                </span>
                <p className="text-muted-foreground hover:text-primary transition-colors">
                  Start shopping to get started →
                </p>
              </div>
            </div>
          </Link>
        </CartContainer>
      );
    }

    return showPurchaseForm ? (
      <CartPurchaseForm />
    ) : (
      <CartItems
        closeCart={closeCart}
        onProceedToCheckout={() => setShowPurchaseForm(true)}
      />
    );
  };

  // Only show cart button if there are items in the cart
  if (!cart || cart.totalQuantity === 0) {
    return null;
  }

  return (
    <>
      <Button
        aria-label="Open cart"
        onClick={openCart}
        className="uppercase relative bg-teal-800 hover:bg-teal-700 text-teal-200 border-teal-700"
        size={"sm"}
        onClickCapture={(e) => {
          // Prevent event bubbling that might interfere with modal
          e.stopPropagation();
          openCart();
        }}
      >
        <ShoppingCart className="h-4 w-4" />
        {cart.totalQuantity > 0 && (
          <span className="absolute -top-1 -right-1 bg-teal-600 text-teal-100 text-xs rounded-sm h-5 w-5 flex items-center justify-center font-medium border border-teal-500">
            {cart.totalQuantity}
          </span>
        )}
      </Button>

      {/* Render modal at document body level using portal */}
      {isMounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="fixed inset-0 z-[60] bg-foreground/30 will-change-auto"
                  onClick={closeCart}
                  aria-hidden="true"
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />

                {/* Panel */}
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="fixed top-0 bottom-0 right-0 flex w-full md:w-[500px] p-4 z-[70] will-change-transform"
                  style={{ position: "fixed", top: 0, right: 0, bottom: 0 }}
                  onClick={(e) => e.stopPropagation()} // Prevent event bubbling to cart button
                >
                  <div className="flex flex-col py-6 w-full bg-[#1a1a1a] backdrop-blur-xl rounded-sm shadow-2xl">
                    <CartContainer className="flex justify-between items-center mb-8">
                      <div>
                        <h2 className="text-3xl font-bold text-foreground">
                          Cart
                        </h2>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:bg-muted/50"
                        aria-label="Close cart"
                        onClick={closeCart}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CartContainer>

                    {renderCartContent()}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function CheckoutButton({
  onProceedToCheckout,
}: {
  onProceedToCheckout: () => void;
}) {
  const { pending } = useFormStatus();
  const { cart, isPending } = useCart();

  const isLoading = pending;
  const isDisabled = !cart || cart.lines.length === 0 || isPending;

  return (
    <CartContainer className="mt-4">
      <Button
        type="submit"
        disabled={isDisabled}
        size="lg"
        className="flex relative gap-3 justify-between items-center w-full bg-teal-800 hover:bg-teal-700 text-teal-200 rounded-sm font-semibold py-4"
        onClick={onProceedToCheckout}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={isLoading ? "loading" : "content"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex justify-center items-center w-full"
          >
            {isLoading ? (
              <Loader />
            ) : (
              <span className="font-semibold">Proceed to checkout</span>
            )}
          </motion.div>
        </AnimatePresence>
      </Button>
    </CartContainer>
  );
}
