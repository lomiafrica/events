"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SanityProduct } from "../types";
import { getAllProducts } from "@/lib/sanity/queries";

// Wishlist types
export interface WishlistItem {
  id: string;
  product: SanityProduct;
  addedAt: string;
}

export interface Wishlist {
  items: WishlistItem[];
}

type WishlistAction =
  | {
      type: "ADD_ITEM";
      payload: { product: SanityProduct };
    }
  | {
      type: "REMOVE_ITEM";
      payload: { productId: string };
    };

type WishlistReturn = {
  wishlist: Wishlist;
  addToWishlist: (product: SanityProduct) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;
  cleanupWishlist: () => Promise<void>;
};

type WishlistContextType = WishlistReturn | undefined;

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);

function wishlistReducer(state: Wishlist, action: WishlistAction): Wishlist {
  switch (action.type) {
    case "ADD_ITEM": {
      const { product } = action.payload;
      const existingItem = state.items.find(
        (item) => item.product._id === product._id,
      );

      if (existingItem) {
        return state; // Already in wishlist
      }

      return {
        ...state,
        items: [
          ...state.items,
          {
            id: `wishlist-${Date.now()}`,
            product,
            addedAt: new Date().toISOString(),
          },
        ],
      };
    }
    case "REMOVE_ITEM": {
      const { productId } = action.payload;
      return {
        ...state,
        items: state.items.filter((item) => item.product._id !== productId),
      };
    }
    default:
      return state;
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<Wishlist>({ items: [] });

  // Load wishlist from localStorage on mount and validate against current products
  useEffect(() => {
    const loadAndValidateWishlist = async () => {
      const savedWishlist = localStorage.getItem("merch-wishlist");
      if (savedWishlist) {
        try {
          const parsedWishlist = JSON.parse(savedWishlist);

          // Get current products from Sanity
          const currentProducts = await getAllProducts();

          // Create a set of current product IDs for quick lookup
          const currentProductIds = new Set(
            currentProducts.map((p: SanityProduct) => p._id),
          );

          // Filter out items that no longer exist
          const validatedItems = parsedWishlist.items.filter(
            (item: WishlistItem) => currentProductIds.has(item.product._id),
          );

          // Update wishlist with only valid items
          const validatedWishlist = { items: validatedItems };
          setWishlist(validatedWishlist);

          // Update localStorage with cleaned wishlist
          if (validatedItems.length !== parsedWishlist.items.length) {
            localStorage.setItem(
              "merch-wishlist",
              JSON.stringify(validatedWishlist),
            );
          }
        } catch (error) {
          console.error("Error parsing saved wishlist:", error);
          // Reset to empty wishlist if parsing fails
          setWishlist({ items: [] });
        }
      }
    };

    loadAndValidateWishlist();
  }, []);

  // Save wishlist to localStorage whenever it changes (async, non-blocking)
  useEffect(() => {
    setTimeout(() => {
      localStorage.setItem("merch-wishlist", JSON.stringify(wishlist));
    }, 0);
  }, [wishlist]);

  const addToWishlist = useCallback((product: SanityProduct) => {
    setWishlist((prev) =>
      wishlistReducer(prev, { type: "ADD_ITEM", payload: { product } }),
    );
  }, []);

  const removeFromWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      wishlistReducer(prev, { type: "REMOVE_ITEM", payload: { productId } }),
    );
  }, []);

  const isInWishlist = useCallback(
    (productId: string) => {
      return wishlist.items.some((item) => item.product._id === productId);
    },
    [wishlist.items],
  );

  // Function to cleanup wishlist by removing items that no longer exist
  const cleanupWishlist = useCallback(async () => {
    try {
      const currentProducts = await getAllProducts();
      const currentProductIds = new Set(
        currentProducts.map((p: SanityProduct) => p._id),
      );

      setWishlist((prevWishlist) => {
        const validatedItems = prevWishlist.items.filter((item) =>
          currentProductIds.has(item.product._id),
        );

        const newWishlist = { items: validatedItems };

        // Update localStorage
        localStorage.setItem("merch-wishlist", JSON.stringify(newWishlist));

        return newWishlist;
      });
    } catch (error) {
      console.error("Error cleaning up wishlist:", error);
    }
  }, []);

  const value = useMemo<WishlistReturn>(
    () => ({
      wishlist,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      wishlistCount: wishlist.items.length,
      cleanupWishlist,
    }),
    [
      wishlist,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      cleanupWishlist,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistReturn {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
