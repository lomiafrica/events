"use client";

import { useState } from "react";
import { Plus, Minus, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type TicketType = {
  id: string;
  name: string;
  price: number;
  description: string;
  available: boolean;
  maxPerOrder: number;
};

type BundleType = {
  id: string;
  name: string;
  price: number;
  description: string;
  includes: string[];
  available: boolean;
  maxPerOrder: number;
};

type EventProps = {
  _id: string;
  title: string;
  ticketTypes: TicketType[];
  bundles: BundleType[];
};

export default function TicketSelector({ event }: { event: EventProps }) {
  const [selectedTickets, setSelectedTickets] = useState<
    Record<string, number>
  >({});
  const [selectedBundles, setSelectedBundles] = useState<
    Record<string, number>
  >({});

  const handleTicketChange = (id: string, count: number, max: number) => {
    setSelectedTickets((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(count, max)),
    }));
  };

  const handleBundleChange = (id: string, count: number, max: number) => {
    setSelectedBundles((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(count, max)),
    }));
  };

  const calculateTotal = () => {
    let total = 0;

    // Add ticket prices
    event.ticketTypes.forEach((ticket) => {
      total += (selectedTickets[ticket.id] || 0) * ticket.price;
    });

    // Add bundle prices
    event.bundles.forEach((bundle) => {
      total += (selectedBundles[bundle.id] || 0) * bundle.price;
    });

    return total;
  };

  // Helper function for formatting price
  const formatPrice = (price: number): string => {
    // Use non-breaking space (\u00A0) for thousands separator
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  };

  const hasSelections = () => {
    return (
      Object.values(selectedTickets).some((count) => count > 0) ||
      Object.values(selectedBundles).some((count) => count > 0)
    );
  };

  return (
    <div>
      {/* Tickets */}
      <div className="space-y-4 mb-6">
        <h3 className="font-medium">Tickets</h3>

        {event.ticketTypes.map((ticket) => (
          <Card key={ticket.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold">{ticket.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {ticket.description}
                  </p>
                  <p className="font-medium mt-1">
                    {formatPrice(ticket.price)} FCFA
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handleTicketChange(
                        ticket.id,
                        (selectedTickets[ticket.id] || 0) - 1,
                        ticket.maxPerOrder,
                      )
                    }
                    disabled={!selectedTickets[ticket.id]}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>

                  <span className="w-8 text-center">
                    {selectedTickets[ticket.id] || 0}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handleTicketChange(
                        ticket.id,
                        (selectedTickets[ticket.id] || 0) + 1,
                        ticket.maxPerOrder,
                      )
                    }
                    disabled={
                      !ticket.available ||
                      (selectedTickets[ticket.id] || 0) >= ticket.maxPerOrder
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bundles */}
      {event.bundles.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="font-medium">Bundles</h3>

          {event.bundles.map((bundle) => (
            <Card key={bundle.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{bundle.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {bundle.description}
                    </p>
                    <ul className="text-sm mt-2 space-y-1">
                      {bundle.includes.map((item, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-md bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="font-medium mt-2">
                      {formatPrice(bundle.price)} FCFA
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleBundleChange(
                          bundle.id,
                          (selectedBundles[bundle.id] || 0) - 1,
                          bundle.maxPerOrder,
                        )
                      }
                      disabled={!selectedBundles[bundle.id]}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <span className="w-8 text-center">
                      {selectedBundles[bundle.id] || 0}
                    </span>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleBundleChange(
                          bundle.id,
                          (selectedBundles[bundle.id] || 0) + 1,
                          bundle.maxPerOrder,
                        )
                      }
                      disabled={
                        !bundle.available ||
                        (selectedBundles[bundle.id] || 0) >= bundle.maxPerOrder
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Separator className="my-6" />

      {/* Order Summary */}
      <div className="bg-muted p-4 rounded-md">
        <h3 className="font-semibold mb-4">Summary</h3>

        {hasSelections() ? (
          <>
            <div className="space-y-2 mb-4">
              {Object.entries(selectedTickets).map(([id, count]) => {
                if (count === 0) return null;
                const ticket = event.ticketTypes.find((t) => t.id === id);
                if (!ticket) return null;

                return (
                  <div key={id} className="flex justify-between">
                    <span>
                      {count}x {ticket.name}
                    </span>
                    <span>{formatPrice(count * ticket.price)} FCFA</span>
                  </div>
                );
              })}

              {Object.entries(selectedBundles).map(([id, count]) => {
                if (count === 0) return null;
                const bundle = event.bundles.find((b) => b.id === id);
                if (!bundle) return null;

                return (
                  <div key={id} className="flex justify-between">
                    <span>
                      {count}x {bundle.name}
                    </span>
                    <span>{formatPrice(count * bundle.price)} FCFA</span>
                  </div>
                );
              })}
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between font-bold mb-6">
              <span>Total</span>
              <span>{formatPrice(calculateTotal())} FCFA</span>
            </div>

            <Button className="w-full rounded-md" size="lg">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Proceed to Checkout
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground">
            Select tickets or bundles to see your order.
          </p>
        )}
      </div>
    </div>
  );
}
