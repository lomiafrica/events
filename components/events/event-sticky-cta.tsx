"use client";

import { useEffect, useState } from "react";
import CheckoutButton, {
  type CheckoutItemData,
} from "@/components/events/checkout-button";

const formatPrice = (price: number): string => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
};

interface EventStickyCtaProps {
  item: CheckoutItemData;
  eventDetails: {
    id: string;
    title: string;
    slug?: string;
    dateText?: string;
    timeText?: string;
    venueName?: string;
  };
  globallyTicketsOnSale: boolean;
  currentLanguage: string;
  currencySuffix: string;
}

export function EventStickyCta({
  item,
  eventDetails,
  globallyTicketsOnSale,
  currentLanguage,
  currencySuffix,
}: EventStickyCtaProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById("event-tickets");
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden border-t border-border bg-[#1a1a1a]/95 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {item.name.replace(/\s*\(\d+(\s*\w+)?\)$/, "")}
          </p>
          <p className="text-primary font-semibold">
            {formatPrice(item.price)}
            {currencySuffix}
          </p>
        </div>
        <CheckoutButton
          item={item}
          eventDetails={eventDetails}
          globallyTicketsOnSale={globallyTicketsOnSale}
          currentLanguage={currentLanguage}
          compact
        />
      </div>
    </div>
  );
}

export function pickStickyCheckoutItem<
  T extends {
    active?: boolean;
    stock?: number | null;
    salesStart?: string | null;
    salesEnd?: string | null;
  },
>(items: T[]): T | undefined {
  const now = new Date();
  return items.find((item) => {
    if (typeof item.active === "boolean" && !item.active) return false;
    if (typeof item.stock === "number" && item.stock <= 0) return false;
    if (item.salesStart && now < new Date(item.salesStart)) return false;
    if (item.salesEnd && now > new Date(item.salesEnd)) return false;
    return true;
  });
}
