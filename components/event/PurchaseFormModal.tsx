"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Ticket } from "lucide-react";
import { t } from "@/lib/i18n/translations"; // Assuming you have this for translations
import { SupabaseClient } from "@supabase/supabase-js";

// Define the shape of the ticket/bundle item passed to the modal
interface PurchaseItem {
    id: string; // Sanity _key or bundleId.current
    name: string;
    price: number;
    isBundle: boolean;
    maxPerOrder?: number;
    stock?: number | null;
}

// Define the expected payload for the Supabase function
interface CreateCheckoutSessionPayload {
    eventId: string;
    eventTitle: string;
    ticketTypeId: string; // Corresponds to PurchaseItem.id
    ticketName: string;   // Corresponds to PurchaseItem.name
    pricePerTicket: number;
    quantity: number;
    currencyCode?: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    successUrlPath?: string;
    cancelUrlPath?: string;
}

interface PurchaseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: PurchaseItem | null;
    eventDetails: {
        id: string; // Event Sanity _id
        title: string;
        currentLanguage: string;
    };
    supabaseClient: SupabaseClient; // Pass the Supabase client instance
}

export default function PurchaseFormModal({
    isOpen,
    onClose,
    item,
    eventDetails,
    supabaseClient,
}: PurchaseFormModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [userPhone, setUserPhone] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (item) {
            setQuantity(1); // Reset quantity when item changes
            setError(null); // Reset error
        }
    }, [item]);

    if (!item) return null;

    // Refined maxQuantity calculation
    const stockLimit = (item.stock !== null && item.stock !== undefined && item.stock >= 0) ? item.stock : Infinity;
    const orderLimit = item.maxPerOrder || Infinity;
    const calculatedMax = Math.min(stockLimit, orderLimit);
    // If the item is available (modal is open), stock should be > 0 or unlimited.
    // Thus, calculatedMax should be > 0 or Infinity.
    // Default to 20 if no other limits are effectively set.
    const maxQuantity = (calculatedMax === Infinity || calculatedMax === 0) ? 20 : calculatedMax;

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = parseInt(e.target.value, 10);
        if (isNaN(value) || value < 1) {
            value = 1;
        } else if (value > maxQuantity) {
            value = maxQuantity;
        }
        setQuantity(value);
    };

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!userName.trim()) {
            setError(t(eventDetails.currentLanguage, "purchaseModal.errors.nameRequired"));
            return;
        }
        if (!userEmail.trim()) {
            setError(t(eventDetails.currentLanguage, "purchaseModal.errors.emailRequired"));
            return;
        }
        if (!validateEmail(userEmail)) {
            setError(t(eventDetails.currentLanguage, "purchaseModal.errors.emailInvalid"));
            return;
        }
        if (quantity <= 0) {
            setError(t(eventDetails.currentLanguage, "purchaseModal.errors.quantityInvalid"));
            return;
        }


        setIsLoading(true);

        const payload: CreateCheckoutSessionPayload = {
            eventId: eventDetails.id,
            eventTitle: eventDetails.title,
            ticketTypeId: item.id,
            ticketName: item.name,
            pricePerTicket: item.price,
            quantity: quantity,
            userName: userName.trim(),
            userEmail: userEmail.trim(),
            userPhone: userPhone.trim() || undefined,
            currencyCode: "XOF", // Assuming XOF, make dynamic if needed
            successUrlPath: "/payment/success", // Or from config
            cancelUrlPath: "/payment/cancel",   // Or from config
        };

        let successfullyInitiatedRedirect = false;

        try {
            // Note: Ensure your Supabase function is named 'create-lomi-checkout-session'
            const { data, error: functionError } = await supabaseClient.functions.invoke(
                "create-lomi-checkout-session",
                { body: payload }
            );

            if (functionError) {
                console.error("Supabase function error:", functionError);
                setError(functionError.message || t(eventDetails.currentLanguage, "purchaseModal.errors.functionError"));
                setIsLoading(false);
                return;
            }

            if (data && data.checkout_url) {
                window.location.href = data.checkout_url;
                successfullyInitiatedRedirect = true;
            } else {
                console.error("Lomi checkout URL not found in response:", data);
                setError(data.error || t(eventDetails.currentLanguage, "purchaseModal.errors.lomiUrlMissing"));
            }
        } catch (e: unknown) {
            console.error("Error invoking Supabase function:", e);
            let message = t(eventDetails.currentLanguage, "purchaseModal.errors.submitError");
            if (e instanceof Error) {
                message = e.message;
            } else if (typeof e === 'string') {
                message = e;
            }
            setError(message);
        } finally {
            // Only set isLoading to false if there was an error and we are not redirecting
            if (!successfullyInitiatedRedirect) {
                setIsLoading(false);
            }
        }
    };

    const totalPrice = item.price * quantity;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[480px] bg-background border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-2xl">
                        {t(eventDetails.currentLanguage, "purchaseModal.titlePrefix")} {item.name}
                    </DialogTitle>
                    <DialogDescription>
                        {t(eventDetails.currentLanguage, "purchaseModal.description", { eventName: eventDetails.title })}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="quantity" className="text-right col-span-1">
                                {t(eventDetails.currentLanguage, "purchaseModal.labels.quantity")}
                            </Label>
                            <Input
                                id="quantity"
                                name="quantity"
                                type="number"
                                value={quantity}
                                onChange={handleQuantityChange}
                                min="1"
                                max={maxQuantity.toString()}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right col-span-1">
                                {t(eventDetails.currentLanguage, "purchaseModal.labels.name")}
                            </Label>
                            <Input
                                id="name"
                                name="userName"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                className="col-span-3"
                                placeholder={t(eventDetails.currentLanguage, "purchaseModal.placeholders.name")}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right col-span-1">
                                {t(eventDetails.currentLanguage, "purchaseModal.labels.email")}
                            </Label>
                            <Input
                                id="email"
                                name="userEmail"
                                type="email"
                                value={userEmail}
                                onChange={(e) => setUserEmail(e.target.value)}
                                className="col-span-3"
                                placeholder={t(eventDetails.currentLanguage, "purchaseModal.placeholders.email")}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right col-span-1">
                                {t(eventDetails.currentLanguage, "purchaseModal.labels.phone")} <span className="text-xs text-muted-foreground">({t(eventDetails.currentLanguage, "purchaseModal.labels.optional")})</span>
                            </Label>
                            <Input
                                id="phone"
                                name="userPhone"
                                type="tel"
                                value={userPhone}
                                onChange={(e) => setUserPhone(e.target.value)}
                                className="col-span-3"
                                placeholder={t(eventDetails.currentLanguage, "purchaseModal.placeholders.phone")}
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-red-500 col-span-4 text-center px-2 py-1 bg-red-900/20 rounded-sm border border-red-700/50">
                                {error}
                            </p>
                        )}
                        <div className="text-right col-span-4 mt-2 text-lg font-semibold">
                            {t(eventDetails.currentLanguage, "purchaseModal.totalPrice")}: {totalPrice.toLocaleString(eventDetails.currentLanguage, { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            {t(eventDetails.currentLanguage, "purchaseModal.buttons.cancel")}
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Ticket className="mr-2 h-4 w-4" />
                            )}
                            {isLoading ? t(eventDetails.currentLanguage, "purchaseModal.buttons.processing") : t(eventDetails.currentLanguage, "purchaseModal.buttons.proceedToPayment")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Add these translations to your i18n files (e.g., en.json, fr.json)
/*
{
  "purchaseModal.titlePrefix": "Purchase",
  "purchaseModal.description": "Enter your details to purchase tickets for {eventName}.",
  "purchaseModal.labels.quantity": "Quantity",
  "purchaseModal.labels.name": "Full Name",
  "purchaseModal.labels.email": "Email",
  "purchaseModal.labels.phone": "Phone",
  "purchaseModal.labels.optional": "Optional",
  "purchaseModal.placeholders.name": "e.g., Ada Lovelace",
  "purchaseModal.placeholders.email": "e.g., ada@example.com",
  "purchaseModal.placeholders.phone": "e.g., +221771234567",
  "purchaseModal.totalPrice": "Total Price",
  "purchaseModal.buttons.cancel": "Cancel",
  "purchaseModal.buttons.proceedToPayment": "Proceed to Payment",
  "purchaseModal.buttons.processing": "Processing...",
  "purchaseModal.errors.nameRequired": "Full name is required.",
  "purchaseModal.errors.emailRequired": "Email is required.",
  "purchaseModal.errors.emailInvalid": "Please enter a valid email address.",
  "purchaseModal.errors.quantityInvalid": "Quantity must be at least 1.",
  "purchaseModal.errors.functionError": "Could not initiate payment. Please try again.",
  "purchaseModal.errors.lomiUrlMissing": "Payment URL not received. Please try again.",
  "purchaseModal.errors.submitError": "An error occurred. Please try again."
}
*/ 