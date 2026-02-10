"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { SanityProduct } from "../types";
import { getShippingSettings } from "@/lib/sanity/queries";
import { trackAddToCart } from "@/components/ui/FacebookPixel";

// Cart types
export interface CartItem {
  id: string;
  quantity: number;
  product: SanityProduct;
  cost: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
}

export interface Cart {
  id: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: { amount: string; currencyCode: string };
    totalAmount: { amount: string; currencyCode: string };
    totalTaxAmount: { amount: string; currencyCode: string };
    shippingAmount: { amount: string; currencyCode: string };
  };
  lines: CartItem[];
}

export type UpdateType = "plus" | "minus" | "delete";

export interface ShippingSettings {
  defaultShippingCost: number;
}

type CartAction =
  | {
      type: "UPDATE_ITEM";
      payload: { merchandiseId: string; nextQuantity: number };
    }
  | {
      type: "ADD_ITEM";
      payload: { product: SanityProduct; quantityToAdd: number };
    };

type UseCartReturn = {
  isPending: boolean;
  cart: Cart | undefined;
  shippingSettings: ShippingSettings;
  addItem: (product: SanityProduct, quantity?: number) => Promise<void>;
  updateItem: (
    lineId: string,
    merchandiseId: string,
    nextQuantity: number,
    updateType: UpdateType,
  ) => Promise<void>;
};

type CartContextType = UseCartReturn | undefined;

const CartContext = createContext<CartContextType | undefined>(undefined);

function calculateItemCost(quantity: number, price: number): string {
  return (price * quantity).toString();
}

function updateCartTotals(
  lines: CartItem[],
  defaultShippingCost: number,
): Pick<Cart, "totalQuantity" | "cost"> {
  const totalQuantity = lines.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalAmount = lines.reduce((sum, item) => {
    return sum + Number(item.cost.totalAmount.amount);
  }, 0);
  const currencyCode = "XOF";

  // Global shipping: apply one default shipping cost per order when cart has items.
  // (requiresShipping was removed from product schema; all merch is shippable.)
  const shippingAmount = subtotalAmount > 0 ? defaultShippingCost : 0;

  const totalAmount = subtotalAmount + shippingAmount;

  return {
    totalQuantity,
    cost: {
      subtotalAmount: { amount: subtotalAmount.toString(), currencyCode },
      shippingAmount: { amount: shippingAmount.toString(), currencyCode },
      totalAmount: { amount: totalAmount.toString(), currencyCode },
      totalTaxAmount: { amount: "0", currencyCode },
    },
  };
}

function createEmptyCart(): Cart {
  return {
    id: "",
    cost: {
      subtotalAmount: { amount: "0", currencyCode: "XOF" },
      totalAmount: { amount: "0", currencyCode: "XOF" },
      totalTaxAmount: { amount: "0", currencyCode: "XOF" },
      shippingAmount: { amount: "0", currencyCode: "XOF" },
    },
    totalQuantity: 0,
    lines: [],
  };
}

function cartReducer(
  state: Cart | undefined,
  action: CartAction,
  defaultShippingCost: number,
): Cart {
  const currentCart = state || createEmptyCart();

  switch (action.type) {
    case "UPDATE_ITEM": {
      const { merchandiseId, nextQuantity } = action.payload;
      const updatedLines = currentCart.lines
        .map((item) => {
          if (item.id !== merchandiseId) return item;
          if (nextQuantity <= 0) return null;

          const newTotalAmount = calculateItemCost(
            nextQuantity,
            item.product.price,
          );

          return {
            ...item,
            quantity: nextQuantity,
            cost: {
              ...item.cost,
              totalAmount: {
                ...item.cost.totalAmount,
                amount: newTotalAmount,
              },
            },
          } satisfies CartItem;
        })
        .filter(Boolean) as CartItem[];

      if (updatedLines.length === 0) {
        return {
          ...currentCart,
          lines: [],
          totalQuantity: 0,
          cost: {
            ...currentCart.cost,
            totalAmount: { ...currentCart.cost.totalAmount, amount: "0" },
          },
        };
      }

      return {
        ...currentCart,
        ...updateCartTotals(updatedLines, defaultShippingCost),
        lines: updatedLines,
      };
    }
    case "ADD_ITEM": {
      const { product, quantityToAdd } = action.payload;
      const existingItem = currentCart.lines.find(
        (item) => item.product._id === product._id,
      );
      const previousQuantity = existingItem?.quantity ?? 0;
      const targetQuantity = previousQuantity + quantityToAdd;

      const updatedLines = existingItem
        ? currentCart.lines.map((item) => {
            if (item.product._id !== product._id) return item;

            const newTotalAmount = calculateItemCost(
              targetQuantity,
              item.product.price,
            );

            return {
              ...item,
              quantity: targetQuantity,
              cost: {
                ...item.cost,
                totalAmount: {
                  ...item.cost.totalAmount,
                  amount: newTotalAmount,
                },
              },
            } satisfies CartItem;
          })
        : [
            {
              id: `temp-${Date.now()}`,
              quantity: targetQuantity,
              product: product,
              cost: {
                totalAmount: {
                  amount: calculateItemCost(targetQuantity, product.price),
                  currencyCode: "XOF",
                },
              },
            } satisfies CartItem,
            ...currentCart.lines,
          ];

      return {
        ...currentCart,
        ...updateCartTotals(updatedLines, defaultShippingCost),
        lines: updatedLines,
      };
    }
    default:
      return currentCart;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | undefined>(undefined);
  const [shippingSettings, setShippingSettings] = useState({
    defaultShippingCost: 0,
  });
  const [isPending, startTransition] = useTransition();

  // Fetch shipping settings from Sanity on mount
  useEffect(() => {
    const fetchShipping = async () => {
      const settings = await getShippingSettings();
      setShippingSettings(settings);
    };
    fetchShipping();
  }, []);

  const [optimisticCart, updateOptimisticCart] = useOptimistic<
    Cart | undefined,
    CartAction
  >(cart, (state, action) =>
    cartReducer(state, action, shippingSettings.defaultShippingCost),
  );

  // Load cart from localStorage on mount (run once)
  useEffect(() => {
    const savedCart = localStorage.getItem("merch-cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (parsedCart.lines && parsedCart.lines.length > 0) {
          // Always recalc totals so we use current shipping when it's available
          const updatedTotals = updateCartTotals(
            parsedCart.lines,
            shippingSettings.defaultShippingCost,
          );
          setCart({
            ...parsedCart,
            ...updatedTotals,
          });
        } else {
          setCart(parsedCart);
        }
      } catch (error) {
        console.error("Error parsing saved cart:", error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalculate cart totals when shipping settings change (e.g. after fetch)
  // This ensures cart always shows correct shipping once getShippingSettings() returns
  useEffect(() => {
    if (cart && cart.lines.length > 0) {
      const updatedTotals = updateCartTotals(
        cart.lines,
        shippingSettings.defaultShippingCost,
      );
      const currentShipping = Number(cart.cost.shippingAmount.amount);
      const newShipping = Number(updatedTotals.cost.shippingAmount.amount);
      if (currentShipping !== newShipping) {
        setCart({
          ...cart,
          ...updatedTotals,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingSettings.defaultShippingCost]);

  // Save cart to localStorage whenever it changes (async, non-blocking)
  useEffect(() => {
    if (cart) {
      // Use setTimeout to make localStorage write non-blocking
      setTimeout(() => {
        localStorage.setItem("merch-cart", JSON.stringify(cart));
      }, 0);
    }
  }, [cart]);

  const update = useCallback(
    (lineId: string, merchandiseId: string, nextQuantity: number) => {
      startTransition(() => {
        // Update optimistic cart immediately (synchronous)
        updateOptimisticCart({
          type: "UPDATE_ITEM",
          payload: { merchandiseId, nextQuantity },
        });

        // Update the actual cart immediately after optimistic update
        if (cart) {
          const updatedCart = cartReducer(
            cart,
            {
              type: "UPDATE_ITEM",
              payload: { merchandiseId, nextQuantity },
            },
            shippingSettings.defaultShippingCost,
          );
          setCart(updatedCart);
        }
      });

      // Return promise for compatibility
      return Promise.resolve();
    },
    [updateOptimisticCart, cart, shippingSettings.defaultShippingCost],
  );

  const add = useCallback(
    (product: SanityProduct, quantity: number = 1) => {
      const quantityToAdd = Math.max(1, Math.floor(quantity));

      startTransition(() => {
        // Update optimistic cart immediately (synchronous)
        updateOptimisticCart({
          type: "ADD_ITEM",
          payload: { product, quantityToAdd },
        });

        // Update actual cart immediately after optimistic update
        const updatedCart = cartReducer(
          cart,
          {
            type: "ADD_ITEM",
            payload: { product, quantityToAdd },
          },
          shippingSettings.defaultShippingCost,
        );
        setCart(updatedCart);

        // Track Add to Cart event (total value and units)
        trackAddToCart(
          Number(product.price) * quantityToAdd,
          "XOF",
          Array(quantityToAdd).fill(product._id),
        );
      });

      // Return promise for compatibility
      return Promise.resolve();
    },
    [updateOptimisticCart, cart, shippingSettings.defaultShippingCost],
  );

  const value = useMemo<UseCartReturn>(
    () => ({
      cart: optimisticCart,
      addItem: add,
      updateItem: update,
      isPending: isPending,
      shippingSettings,
    }),
    [optimisticCart, add, update, isPending, shippingSettings],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): UseCartReturn {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
