"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Shield, User, Calendar, MapPin, Ticket, AlertCircle, QrCode } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";

interface TicketData {
    purchase_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    event_id: string;
    event_title: string;
    event_date_text: string;
    event_time_text: string;
    event_venue_name: string;
    ticket_name: string;
    quantity: number;
    status: string;
    is_used: boolean;
    used_at?: string;
    verified_by?: string;
}

const PIN_CACHE_KEY = "staff_verification_pin";
const PIN_CACHE_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

export default function VerifyTicketPage() {
    const searchParams = useSearchParams();
    const ticketId = searchParams.get('id') || "";

    const [pin, setPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [ticketData, setTicketData] = useState<TicketData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);

    // Check for cached PIN on component mount
    useEffect(() => {
        const checkCachedPin = () => {
            try {
                const cached = sessionStorage.getItem(PIN_CACHE_KEY);
                if (cached) {
                    const { timestamp } = JSON.parse(cached);
                    const now = Date.now();

                    // Check if cached PIN is still valid (within duration)
                    if (now - timestamp < PIN_CACHE_DURATION) {
                        setIsVerified(true);
                        return;
                    } else {
                        // Clear expired cache
                        sessionStorage.removeItem(PIN_CACHE_KEY);
                    }
                }
            } catch {
                // If there's any error reading cache, just ignore it
                sessionStorage.removeItem(PIN_CACHE_KEY);
            }
        };

        checkCachedPin();
    }, []);

    // Auto-verify ticket when page loads with ID and user is verified
    useEffect(() => {
        if (ticketId && isVerified && !ticketData) {
            verifyTicket(ticketId);
        }
    }, [ticketId, isVerified, ticketData]);

    const verifyTicket = async (ticketIdentifier: string) => {
        setIsLoading(true);
        setError(null);
        setTicketData(null);

        try {
            const { data, error: rpcError } = await supabase.rpc('verify_ticket', {
                p_ticket_identifier: ticketIdentifier.trim()
            });

            if (rpcError) {
                throw new Error(rpcError.message);
            }

            if (!data || data.length === 0) {
                setError("❌ Ticket not found, invalid, or not paid");
                return;
            }

            setTicketData(data[0]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Verification failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Call RPC function to verify PIN
            const { data: isValidPin, error: pinError } = await supabase.rpc('verify_staff_pin', {
                p_pin: pin
            });

            if (pinError) {
                throw new Error(pinError.message);
            }

            if (isValidPin) {
                // Cache the PIN for future use
                try {
                    const cacheData = {
                        timestamp: Date.now()
                    };
                    sessionStorage.setItem(PIN_CACHE_KEY, JSON.stringify(cacheData));
                } catch {
                    // If sessionStorage fails, continue anyway
                    console.warn("Failed to cache PIN, but continuing...");
                }

                setIsVerified(true);
                setError(null);
                setPin("");
            } else {
                setError("❌ Invalid PIN. Access denied.");
                setPin("");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "PIN verification failed");
            setPin("");
        } finally {
            setIsLoading(false);
        }
    };

    const markTicketAsUsed = async () => {
        if (!ticketData) return;

        setIsLoading(true);
        try {
            const { error } = await supabase.rpc('mark_ticket_used', {
                p_ticket_identifier: ticketId.trim(),
                p_verified_by: 'staff_portal'
            });

            if (error) {
                throw new Error(error.message);
            }

            // Refresh ticket data
            await verifyTicket(ticketId.trim());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to mark ticket as used");
        } finally {
            setIsLoading(false);
        }
    };

    // Get status colors and icons based on ticket state
    const getTicketStatus = () => {
        if (error) {
            return {
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
                textColor: 'text-red-700',
                icon: <XCircle className="h-8 w-8 text-red-500" />,
                badgeVariant: 'destructive' as const,
                badgeText: '❌ INVALID',
                statusText: 'Invalid Ticket'
            };
        }

        if (ticketData?.is_used) {
            return {
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-200',
                textColor: 'text-orange-700',
                icon: <AlertCircle className="h-8 w-8 text-orange-500" />,
                badgeVariant: 'secondary' as const,
                badgeText: '⚠️ ALREADY USED',
                statusText: 'Already Checked In'
            };
        }

        if (ticketData) {
            return {
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200',
                textColor: 'text-green-700',
                icon: <CheckCircle className="h-8 w-8 text-green-500" />,
                badgeVariant: 'default' as const,
                badgeText: '✅ VALID',
                statusText: 'Ready for Entry'
            };
        }

        return null;
    };

    // If no ticket ID in URL, show manual entry with improved design
    if (!ticketId) {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
                    <div className="max-w-md mx-auto">
                        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800">
                            <CardHeader className="text-center pb-4">
                                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                                    <QrCode className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                                    Ticket Verification
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="text-center text-gray-600 dark:text-gray-300">
                                    <p className="text-lg mb-2">Scan QR code</p>
                                    <p className="text-sm">Please scan a QR code or visit with a valid ticket ID.</p>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                                            How to verify tickets
                                        </h3>
                                    </div>
                                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                        <li>• Scan QR code with your phone camera</li>
                                        <li>• Enter staff PIN to access verification</li>
                                        <li>• Review customer details and admit entry</li>
                                    </ul>
                                </div>

                                <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                                    Need help? Contact event organizers.
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    // Show PIN entry if not verified yet
    if (!isVerified) {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
                    <div className="max-w-md mx-auto">
                        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
                            <CardHeader className="text-center pb-4">
                                <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
                                    <Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                                    Staff Verification
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="text-center text-gray-600 dark:text-gray-300">
                                    <p className="text-lg mb-2">Enter 4-digit PIN to access ticket details</p>
                                    <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                                        Ticket ID: {ticketId.substring(0, 8)}...
                                    </p>
                                </div>

                                <form onSubmit={handlePinSubmit} className="space-y-4">
                                    <Input
                                        type="password"
                                        placeholder="Enter 4-digit PIN"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        maxLength={4}
                                        className="text-center text-2xl tracking-widest h-12"
                                        disabled={isLoading}
                                    />
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={pin.length !== 4 || isLoading}
                                        size="lg"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <Shield className="mr-2 h-4 w-4" />
                                                Verify PIN
                                            </>
                                        )}
                                    </Button>
                                </form>

                                {error && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                        <div className="text-center text-red-600 dark:text-red-400 text-sm">
                                            {error}
                                        </div>
                                    </div>
                                )}

                                <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                                    Staff access only. Unauthorized access is prohibited.
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    const status = getTicketStatus();

    // Show ticket details after PIN verification
    return (
        <>
            <Header />
            <div className="min-h-screen bg-background py-8 px-4">
                <div className="max-w-md mx-auto space-y-6">
                    {/* Loading State */}
                    {isLoading && !ticketData && (
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                <p>Loading ticket details...</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Status Header with Customer Name */}
                    {status && (
                        <Card className={`border-2 ${status.borderColor} ${status.bgColor}`}>
                            <CardContent className="pt-6 text-center">
                                <div className="flex flex-col items-center space-y-3">
                                    {status.icon}
                                    <Badge variant={status.badgeVariant} className="text-sm px-3 py-1">
                                        {status.badgeText}
                                    </Badge>
                                    <h2 className={`text-xl font-bold ${status.textColor}`}>
                                        {status.statusText}
                                    </h2>
                                    {ticketData && (
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                                {ticketData.customer_name}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {ticketData.quantity} {ticketData.quantity > 1 ? 'people' : 'person'} • {ticketData.ticket_name}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Error Display */}
                    {error && !ticketData && (
                        <Card className="border-2 border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
                            <CardContent className="pt-6 text-center">
                                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                                <Badge variant="destructive" className="mb-3">❌ INVALID</Badge>
                                <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">Invalid Ticket</h2>
                                <p className="text-red-600 dark:text-red-400">{error}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Detailed Ticket Information */}
                    {ticketData && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Ticket className="h-5 w-5" />
                                    Event Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Customer Contact Info */}
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-500" />
                                    <div>
                                        <p className="text-sm text-gray-500">{ticketData.customer_email}</p>
                                        {ticketData.customer_phone && (
                                            <p className="text-sm text-gray-500">{ticketData.customer_phone}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Event Info */}
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <div>
                                        <p className="font-medium">{ticketData.event_title}</p>
                                        <p className="text-sm text-gray-500">
                                            {ticketData.event_date_text} at {ticketData.event_time_text}
                                        </p>
                                    </div>
                                </div>

                                {/* Venue */}
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-500" />
                                    <p className="text-sm">{ticketData.event_venue_name}</p>
                                </div>

                                {/* Usage Info */}
                                {ticketData.is_used && ticketData.used_at && (
                                    <div className="pt-2 border-t">
                                        <p className="text-sm text-orange-600">
                                            <span className="font-medium">Checked in:</span> {new Date(ticketData.used_at).toLocaleString()}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Action Button */}
                    {ticketData && !ticketData.is_used && (
                        <Button
                            onClick={markTicketAsUsed}
                            className="w-full bg-green-600 hover:bg-green-700"
                            disabled={isLoading}
                            size="lg"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    ✅ ADMIT ENTRY ({ticketData.quantity} {ticketData.quantity > 1 ? 'people' : 'person'})
                                </>
                            )}
                        </Button>
                    )}

                    {/* Already Used Warning */}
                    {ticketData?.is_used && (
                        <Card className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
                            <CardContent className="pt-6 text-center">
                                <AlertCircle className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                                <p className="text-orange-700 dark:text-orange-300 font-medium">
                                    ⚠️ This ticket has already been used
                                </p>
                                <p className="text-sm text-orange-600 dark:text-orange-400">
                                    Entry not permitted
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Quick Actions */}
                    <Card className="bg-zinc-50 border-zinc-200 dark:bg-zinc-900/20 dark:border-zinc-800">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                    ✅ PIN verified - cached for 30 min
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        sessionStorage.removeItem(PIN_CACHE_KEY);
                                        setIsVerified(false);
                                        setTicketData(null);
                                    }}
                                    className="text-xs h-7 px-2"
                                >
                                    Clear PIN
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Footer />
        </>
    );
} 