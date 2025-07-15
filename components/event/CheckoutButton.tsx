"use client";

import { useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import PurchaseFormModal from "@/components/event/PurchaseFormModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket } from "lucide-react";
import { t } from "@/lib/i18n/translations";
import Link from "next/link";

export interface CheckoutItemData {
  id: string;
  name: string;
  price: number;
  isBundle: boolean;
  maxPerOrder?: number;
  stock?: number | null;

  paymentLink?: string;
  active?: boolean;
  salesStart?: string | null;
  salesEnd?: string | null;
  productId?: string;
  ticketsIncluded?: number; // Number of tickets included per bundle
}

interface PurchaseItemForModal {
  id: string;
  name: string;
  price: number;
  isBundle: boolean;
  maxPerOrder?: number;
  stock?: number | null;
  productId?: string;
  ticketsIncluded?: number;
}

interface CheckoutButtonProps {
  item: CheckoutItemData;
  eventDetails: {
    id: string;
    title: string;
    dateText?: string;
    timeText?: string;
    venueName?: string;
  };
  globallyTicketsOnSale: boolean;
  currentLanguage: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error(
      "Failed to initialize Supabase client in CheckoutButton:",
      error,
    );
  }
} else {
  console.warn(
    "Supabase URL or Anon Key is missing from .env. API checkout (modal) will be disabled if these are not set.",
  );
}

const getItemAvailabilityStatus = (
  item: {
    active?: boolean;
    stock?: number | null;
    salesStart?: string | null;
    salesEnd?: string | null;
  },
  currentLanguage: string,
): { available: boolean; reason: string } => {
  if (typeof item.active === "boolean" && !item.active) {
    return {
      available: false,
      reason: t(currentLanguage, "eventSlugPage.availability.inactive"),
    };
  }

  if (typeof item.stock === "number" && item.stock <= 0) {
    return {
      available: false,
      reason: t(currentLanguage, "eventSlugPage.availability.soldOut"),
    };
  }
  const now = new Date();
  if (item.salesStart && now < new Date(item.salesStart)) {
    const startDate = new Date(item.salesStart).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return {
      available: false,
      reason: t(currentLanguage, "eventSlugPage.availability.salesStart", {
        startDate,
      }),
    };
  }
  if (item.salesEnd && now > new Date(item.salesEnd)) {
    return {
      available: false,
      reason: t(currentLanguage, "eventSlugPage.availability.salesEnded"),
    };
  }
  return { available: true, reason: "" };
};

export default function CheckoutButton({
  item,
  eventDetails,
  globallyTicketsOnSale,
  currentLanguage,
}: CheckoutButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const availabilityStatus = getItemAvailabilityStatus(
    {
      active: item.active,
      stock: item.stock,
      salesStart: item.salesStart,
      salesEnd: item.salesEnd,
    },
    currentLanguage,
  );

  const useDirectPaymentLink = !!item.paymentLink;

  const handleOpenPurchaseModal = () => {
    if (!supabase) {
      alert(t(currentLanguage, "eventSlugPage.errors.supabaseNotInitialized"));
      console.error(
        "Supabase client not initialized. Cannot open purchase modal.",
      );
      return;
    }
    setIsModalOpen(true);
  };

  const purchaseItemForModal: PurchaseItemForModal = {
    id: item.id,
    name: item.name,
    price: item.price,
    isBundle: item.isBundle,
    maxPerOrder: item.maxPerOrder,
    stock: item.stock,
    productId: item.productId,
    ticketsIncluded: item.ticketsIncluded,
  };

  if (globallyTicketsOnSale && availabilityStatus.available) {
    if (useDirectPaymentLink && item.paymentLink) {
      return (
        <Button
          asChild
          className="sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-sm"
        >
          <Link
            href={item.paymentLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Ticket className="mr-2 h-4 w-4" />
            {t(currentLanguage, "eventSlugPage.tickets.buyNow")}
          </Link>
        </Button>
      );
    } else if (supabase) {
      const isBundle = item.isBundle;
      const buttonText = isBundle
        ? t(currentLanguage, "eventSlugPage.tickets.buyNow")
        : t(currentLanguage, "eventSlugPage.tickets.getETicket");
      const buttonClassName = isBundle
        ? "sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm"
        : "sm:w-auto bg-green-600 hover:bg-green-700 text-white rounded-sm";
      return (
        <>
          <Button onClick={handleOpenPurchaseModal} className={buttonClassName}>
            <Ticket className="mr-2 h-4 w-4" />
            {buttonText}
          </Button>
          {isModalOpen && (
            <PurchaseFormModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              item={purchaseItemForModal}
              eventDetails={{
                id: eventDetails.id,
                title: eventDetails.title,
                dateText: eventDetails.dateText,
                timeText: eventDetails.timeText,
                venueName: eventDetails.venueName,
              }}
              supabaseClient={supabase}
            />
          )}
        </>
      );
    } else {
      return (
        <Badge
          variant="outline"
          className="text-sm sm:w-auto justify-center py-2 px-3 border-slate-600 text-slate-400 rounded-sm h-10 inline-flex items-center"
        >
          {t(currentLanguage, "eventSlugPage.availability.misconfigured")}
        </Badge>
      );
    }
  } else {
    return (
      <Badge
        variant="outline"
        className="text-sm sm:w-auto justify-center py-2 px-3 border-slate-600 text-slate-400 rounded-sm h-10 inline-flex items-center"
      >
        {availabilityStatus.reason ||
          t(currentLanguage, "eventSlugPage.availability.unavailable")}
      </Badge>
    );
  }
}
