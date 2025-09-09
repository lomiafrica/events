"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
} from "react";
import { SanityProduct } from "../types";

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
  };
  lines: CartItem[];
}

export type UpdateType = "plus" | "minus" | "delete";

type CartAction =
  | {
      type: "UPDATE_ITEM";
      payload: { merchandiseId: string; nextQuantity: number };
    }
  | {
      type: "ADD_ITEM";
      payload: { product: SanityProduct; previousQuantity: number };
    };

type UseCartReturn = {
  isPending: boolean;
  cart: Cart | undefined;
  addItem: (product: SanityProduct) => Promise<void>;
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
): Pick<Cart, "totalQuantity" | "cost"> {
  const totalQuantity = lines.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = lines.reduce(
    (sum, item) => sum + Number(item.cost.totalAmount.amount),
    0,
  );
  const currencyCode = "XOF"; // Using XOF for West African Franc

  return {
    totalQuantity,
    cost: {
      subtotalAmount: { amount: totalAmount.toString(), currencyCode },
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
    },
    totalQuantity: 0,
    lines: [],
  };
}

function cartReducer(state: Cart | undefined, action: CartAction): Cart {
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
        ...updateCartTotals(updatedLines),
        lines: updatedLines,
      };
    }
    case "ADD_ITEM": {
      const { product, previousQuantity } = action.payload;
      const existingItem = currentCart.lines.find(
        (item) => item.product._id === product._id,
      );
      const targetQuantity = previousQuantity + 1;

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
        ...updateCartTotals(updatedLines),
        lines: updatedLines,
      };
    }
    default:
      return currentCart;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | undefined>(undefined);
  const [optimisticCart, updateOptimisticCart] = useOptimistic<
    Cart | undefined,
    CartAction
  >(cart, cartReducer);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("merch-cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
      } catch (error) {
        console.error("Error parsing saved cart:", error);
      }
    }
  }, []);

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
      // Update optimistic cart immediately (synchronous)
      updateOptimisticCart({
        type: "UPDATE_ITEM",
        payload: { merchandiseId, nextQuantity },
      });

      // Update the actual cart immediately after optimistic update
      if (cart) {
        const updatedCart = cartReducer(cart, {
          type: "UPDATE_ITEM",
          payload: { merchandiseId, nextQuantity },
        });
        setCart(updatedCart);
      }

      // Return promise for compatibility
      return Promise.resolve();
    },
    [updateOptimisticCart, cart],
  );

  const add = useCallback(
    (product: SanityProduct) => {
      const previousQuantity =
        optimisticCart?.lines.find((l) => l.product._id === product._id)
          ?.quantity || 0;

      // Update optimistic cart immediately (synchronous)
      updateOptimisticCart({
        type: "ADD_ITEM",
        payload: { product, previousQuantity },
      });

      // Update actual cart immediately after optimistic update
      const updatedCart = cartReducer(cart, {
        type: "ADD_ITEM",
        payload: { product, previousQuantity },
      });
      setCart(updatedCart);

      // Return promise for compatibility
      return Promise.resolve();
    },
    [updateOptimisticCart, optimisticCart, cart],
  );

  const value = useMemo<UseCartReturn>(
    () => ({
      cart: optimisticCart,
      addItem: add,
      updateItem: update,
      isPending: false, // No longer needed for instant updates
    }),
    [optimisticCart, add, update],
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
