"use client";

import { MinusIcon, PlusIcon, X } from "lucide-react";
import Image from "next/image";
import { useTransition } from "react";
import { useCart, CartItem } from "./cart-context";
import { Button } from "@/components/ui/button";

interface CartItemCardProps {
  item: CartItem;
  onCloseCart?: () => void;
}

export function CartItemCard({ item }: CartItemCardProps) {
  const { updateItem } = useCart();
  const [isPending, startTransition] = useTransition();

  const { id, quantity, product } = item;
  const image = product.mainImage || product.images?.[0]?.url;
  // const imageWidth = product.images?.[0]?.metadata?.dimensions?.width || 400;
  // const imageHeight = product.images?.[0]?.metadata?.dimensions?.height || 600;

  const handleUpdateQuantity = (newQuantity: number) => {
    startTransition(async () => {
      await updateItem(id, id, newQuantity, "plus");
    });
  };

  const handleRemoveItem = () => {
    startTransition(async () => {
      await updateItem(id, id, 0, "delete");
    });
  };

  return (
    <div className="flex gap-8 p-3 bg-[#1a1a1a]/50 hover:bg-[#1a1a1a]/70 rounded-sm transition-colors items-stretch">
      {/* Product Image */}
      <div className="flex-shrink-0 w-16">
        {image ? (
          <div className="h-full aspect-square relative overflow-hidden rounded-sm bg-muted">
            <Image
              src={image}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-full aspect-square bg-muted rounded-sm flex items-center justify-center">
            <span className="text-xs text-white/70">No Image</span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate text-white">
              {product.name}
            </h3>
            <p className="text-xs text-white/70 mt-1">
              {product.price.toLocaleString("fr-FR")} F CFA
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveItem}
            disabled={isPending}
            className="flex-shrink-0 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateQuantity(Math.max(1, quantity - 1))}
              disabled={isPending || quantity <= 1}
              className="h-8 w-8 p-0"
            >
              <MinusIcon className="h-3 w-3" />
            </Button>
            <span className="text-sm font-medium min-w-[2rem] text-center text-white">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateQuantity(quantity + 1)}
              disabled={isPending}
              className="h-8 w-8 p-0"
            >
              <PlusIcon className="h-3 w-3" />
            </Button>
          </div>

          <div className="text-sm font-medium text-white">
            {(product.price * quantity).toLocaleString("fr-FR")} F CFA
          </div>
        </div>
      </div>
    </div>
  );
}
