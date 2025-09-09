"use client";

import { Heart, X, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { useWishlist } from "./wishlist-context";
import { useCart } from "../cart/cart-context";
import { createPortal } from "react-dom";
import { SanityProduct } from "../types";

export default function WishlistModal() {
  const { wishlist, removeFromWishlist, wishlistCount } = useWishlist();
  const { addItem } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before rendering portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const openWishlist = () => setIsOpen(true);
  const closeWishlist = () => setIsOpen(false);

  const handleAddToCart = (product: SanityProduct) => {
    addItem(product);
    removeFromWishlist(product._id);
  };

  const formatPrice = (price: number): string => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  // Only show wishlist button if there are items in the wishlist
  if (wishlistCount === 0) {
    return null;
  }

  return (
    <>
      <Button
        aria-label="Open wishlist"
        onClick={openWishlist}
        className="relative bg-pink-800 hover:bg-pink-700 text-pink-200 border-pink-700"
        size={"sm"}
        onClickCapture={(e) => {
          e.stopPropagation();
          openWishlist();
        }}
      >
        <Heart className="h-4 w-4 fill-current" />
        {wishlistCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-pink-600 text-pink-100 text-xs rounded-sm h-5 w-5 flex items-center justify-center font-medium border border-pink-500">
            {wishlistCount}
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
                  onClick={closeWishlist}
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
                >
                  <div className="flex flex-col py-6 w-full bg-[#1a1a1a] backdrop-blur-xl rounded-sm shadow-2xl">
                    <div className="flex justify-between items-center px-6 mb-6">
                      <div>
                        <h2 className="text-3xl font-bold text-foreground">
                          Wishlist
                        </h2>
                        <p className="text-muted-foreground text-sm mt-1">
                          {wishlistCount} item{wishlistCount !== 1 ? "s" : ""}{" "}
                          saved for later
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:bg-muted/50"
                        aria-label="Close wishlist"
                        onClick={closeWishlist}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex-1 overflow-hidden px-6">
                      <div className="overflow-y-auto flex flex-col gap-y-3 h-full scrollbar-hide">
                        <AnimatePresence>
                          {wishlist.items.map((item, i) => (
                            <motion.div
                              key={item.id}
                              layout
                              exit={{ opacity: 0, x: -20 }}
                              transition={{
                                duration: 0.3,
                                delay: i * 0.1,
                                ease: "easeOut",
                              }}
                            >
                              <Card className="bg-[#2a2a2a]/50 hover:bg-[#2a2a2a]/70 rounded-sm p-4 transition-colors">
                                <div className="flex gap-8 items-stretch">
                                  {/* Product Image */}
                                  <div className="flex-shrink-0 w-16">
                                    {item.product.mainImage ? (
                                      <div className="h-full aspect-square relative overflow-hidden rounded-sm bg-muted">
                                        <Image
                                          src={item.product.mainImage}
                                          alt={item.product.name}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="h-full aspect-square bg-muted rounded-sm flex items-center justify-center">
                                        <span className="text-xs text-white/70">
                                          No Image
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Product Details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-3">
                                      <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-sm truncate text-white">
                                          {item.product.name}
                                        </h3>
                                        <p className="text-xs text-white/70 mt-1">
                                          {formatPrice(item.product.price)} F
                                          CFA
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          removeFromWishlist(item.product._id)
                                        }
                                        className="flex-shrink-0 h-6 w-6 p-0 text-white/70 hover:text-red-400"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 h-8 text-xs border-white/20 text-white/70 hover:bg-white/10"
                                        asChild
                                      >
                                        <Link
                                          href={`/shop/${typeof item.product.slug === "string" ? item.product.slug : item.product.slug?.current || ""}`}
                                        >
                                          View
                                        </Link>
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="flex-1 bg-teal-800 hover:bg-teal-700 text-teal-200 h-8 text-xs"
                                        onClick={() =>
                                          handleAddToCart(item.product)
                                        }
                                      >
                                        <ShoppingCart className="h-3 w-3 mr-1" />
                                        Add to Cart
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
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
