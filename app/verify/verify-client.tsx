"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
  User,
  Calendar,
  MapPin,
  Ticket,
  AlertCircle,
  QrCode,
  Users,
  Tag,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useTranslation } from "@/lib/contexts/TranslationContext";
import { t } from "@/lib/i18n/translations";

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
  ticket_type_id: string;
  ticket_name: string;
  quantity: number;
  price_per_ticket: number;
  total_amount: number;
  currency_code: string;
  status: string;
  is_used: boolean;
  used_at?: string;
  verified_by?: string;
  use_count?: number; // How many times a legacy ticket has been used
  total_quantity?: number; // The total number of admissions on a legacy ticket
}

const PIN_CACHE_KEY = "staff_verification_pin";
const PIN_CACHE_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const DUPLICATE_SCAN_WINDOW = 2000; // 2 seconds in milliseconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000; // 1 second

// Track last scanned ticket to prevent rapid duplicates
let lastScannedTicket: { id: string; timestamp: number } | null = null;

// Audio feedback for scanning
const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Higher pitch for success
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch {
    // Silent fail if audio not supported
  }
};

const playErrorSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 200; // Lower pitch for error
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Silent fail if audio not supported
  }
};

// Enhanced storage with fallbacks for mobile compatibility
interface StaffCache {
  [key: string]: unknown;
}

declare global {
  interface Window {
    __staffCache?: StaffCache;
  }
}

const storage = {
  set: (key: string, value: unknown): boolean => {
    const data = JSON.stringify(value);
    try {
      // Try localStorage first (persists across browser sessions)
      localStorage.setItem(key, data);
      return true;
    } catch {
      try {
        // Fallback to sessionStorage
        sessionStorage.setItem(key, data);
        return true;
      } catch {
        // If both fail, store in memory (less reliable but better than nothing)
        window.__staffCache = window.__staffCache || {};
        window.__staffCache[key] = value;
        return true;
      }
    }
  },
  get: (key: string): unknown => {
    try {
      // Try localStorage first
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
    } catch {
      // Ignore parse errors
    }

    try {
      // Try sessionStorage
      const data = sessionStorage.getItem(key);
      if (data) return JSON.parse(data);
    } catch {
      // Ignore parse errors
    }

    try {
      // Try memory cache
      return window.__staffCache?.[key] || null;
    } catch {
      // Ignore access errors
    }

    return null;
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
    try {
      if (window.__staffCache) {
        delete window.__staffCache[key];
      }
    } catch {
      // Ignore errors
    }
  },
};

interface VerifyClientProps {
  ticketId?: string;
}

// Retry helper with exponential backoff
const retryWithBackoff = async <T,>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY_MS,
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;

    // Check if it's a network error (worth retrying)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNetworkError =
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection');

    if (!isNetworkError) {
      // Don't retry validation errors like TICKET_NOT_FOUND
      throw error;
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 1.5); // Exponential backoff
  }
};

export function VerifyClient({ ticketId }: VerifyClientProps) {
  const { currentLanguage } = useTranslation();
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null); // Track error type for UI differentiation
  const [isVerified, setIsVerified] = useState(false);
  const [wasJustAdmitted, setWasJustAdmitted] = useState(false);
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);

  // Check for cached PIN on component mount
  useEffect(() => {
    const checkCachedPin = () => {
      try {
        const cached = storage.get(PIN_CACHE_KEY) as {
          timestamp: number;
        } | null;
        if (cached && cached.timestamp) {
          const now = Date.now();

          // Check if cached PIN is still valid (within duration)
          if (now - cached.timestamp < PIN_CACHE_DURATION) {
            setIsVerified(true);
            return;
          } else {
            // Clear expired cache
            storage.remove(PIN_CACHE_KEY);
          }
        }
      } catch {
        // If there's any error reading cache, just ignore it
        storage.remove(PIN_CACHE_KEY);
      }
    };

    checkCachedPin();
  }, []);

  // Auto-verify ticket when page loads with ID and user is verified
  useEffect(() => {
    if (ticketId && isVerified && !ticketData) {
      verifyTicket(ticketId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, isVerified, ticketData]);

  // Helper to parse error codes from database exceptions
  const parseErrorMessage = (errorMessage: string): { code: string; message: string } => {
    const match = errorMessage.match(/^([A-Z_]+):\s*(.+)$/);
    if (match) {
      return { code: match[1], message: match[2] };
    }
    return { code: 'UNKNOWN_ERROR', message: errorMessage };
  };

  // Helper to get user-friendly error message
  const getUserFriendlyError = useCallback((errorCode: string, defaultMessage: string): string => {
    const errorMap: Record<string, string> = {
      'TICKET_NOT_FOUND': t(currentLanguage, "ticketVerification.errors.ticketNotFound"),
      'INVALID_TICKET_ID': t(currentLanguage, "ticketVerification.errors.ticketNotFound"),
      'UNPAID_TICKET': 'This ticket has not been paid for. Please check payment status.',
      'ORPHANED_TICKET': 'Ticket data is incomplete. Please contact support.',
      'ALREADY_USED': t(currentLanguage, "ticketVerification.errors.alreadyUsed"),
      'DUPLICATE_SCAN': 'Please wait a moment before scanning again.',
    };
    return errorMap[errorCode] || defaultMessage;
  }, [currentLanguage]);

  const verifyTicket = useCallback(
    async (ticketIdentifier: string) => {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);
      setTicketData(null);

      // Check for duplicate scan
      const now = Date.now();
      if (lastScannedTicket && lastScannedTicket.id === ticketIdentifier.trim()) {
        if (now - lastScannedTicket.timestamp < DUPLICATE_SCAN_WINDOW) {
          setError("Please wait before scanning this ticket again.");
          setIsLoading(false);
          return;
        }
      }

      try {
        const result = await retryWithBackoff(async () => {
          const { data, error: rpcError } = await supabase.rpc("verify_ticket", {
            p_ticket_identifier: ticketIdentifier.trim(),
          });

          if (rpcError) {
            throw new Error(rpcError.message);
          }

          if (!data || data.length === 0) {
            throw new Error('TICKET_NOT_FOUND: No ticket found');
          }

          return data[0];
        });

        // Update last scanned ticket
        lastScannedTicket = { id: ticketIdentifier.trim(), timestamp: now };
        setTicketData(result);

        // Success feedback
        playSuccessSound();
        setFlashColor('green');
        setTimeout(() => setFlashColor(null), 300);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Verification failed";
        const { code, message } = parseErrorMessage(errorMessage);
        const friendlyMessage = getUserFriendlyError(code, message);
        setError(friendlyMessage);
        setErrorCode(code);

        // Error feedback - use orange flash for ALREADY_USED, red for other errors
        if (code === 'ALREADY_USED') {
          setFlashColor('red'); // Still flash to get attention
        } else {
          playErrorSound();
          setFlashColor('red');
        }
        setTimeout(() => setFlashColor(null), 500);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage, setIsLoading, setError, setTicketData, getUserFriendlyError],
  );

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Call RPC function to verify PIN
      const { data: isValidPin, error: pinError } = await supabase.rpc(
        "verify_staff_pin",
        {
          p_pin: pin,
        },
      );

      if (pinError) {
        throw new Error(pinError.message);
      }

      if (isValidPin) {
        // Cache the PIN for future use with enhanced storage
        try {
          const cacheData = {
            timestamp: Date.now(),
          };
          storage.set(PIN_CACHE_KEY, cacheData);
        } catch {
          // If storage fails, continue anyway
          console.warn("Failed to cache PIN, but continuing...");
        }

        setIsVerified(true);
        setError(null);
        setPin("");
      } else {
        setError(t(currentLanguage, "ticketVerification.errors.invalidPin"));
        setPin("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "PIN verification failed");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  const markTicketAsUsed = useCallback(async () => {
    if (!ticketData || !ticketId) return;

    setIsLoading(true);
    try {
      const result = await retryWithBackoff(async () => {
        const { data: result, error } = await supabase.rpc("mark_ticket_used", {
          p_ticket_identifier: ticketId.trim(),
          p_verified_by: "staff_portal",
        });

        if (error) {
          throw new Error(error.message);
        }

        return result;
      });

      // Handle the response from the unified mark_ticket_used function
      if (result === "ALREADY_USED") {
        setError(t(currentLanguage, "ticketVerification.errors.alreadyUsed"));
        setErrorCode("ALREADY_USED");
        return;
      } else if (result === "NOT_FOUND") {
        setError(
          t(currentLanguage, "ticketVerification.errors.ticketNotFound"),
        );
        setErrorCode("NOT_FOUND");
        return;
      } else if (result === "DUPLICATE_SCAN") {
        setError("This ticket was just scanned. Please wait a moment.");
        setErrorCode("DUPLICATE_SCAN");
        return;
      } else if (result === "SUCCESS") {
        // Set flag to show "Successfully Admitted" instead of "Already Used"
        setWasJustAdmitted(true);
        setError(null);
        setErrorCode(null);
      }

      // Refresh ticket data
      await verifyTicket(ticketId.trim());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to mark ticket as used";
      const { code, message } = parseErrorMessage(errorMessage);
      const friendlyMessage = getUserFriendlyError(code, message);
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    ticketData,
    ticketId,
    setIsLoading,
    setWasJustAdmitted,
    setError,
    verifyTicket,
    currentLanguage,
    getUserFriendlyError,
  ]);

  // Auto-admit valid tickets
  useEffect(() => {
    if (ticketData && !isLoading && !wasJustAdmitted) {
      // For individual tickets, check is_used
      // For legacy tickets, check if use_count is less than total_quantity
      const canBeUsed =
        ticketData.use_count !== undefined && ticketData.total_quantity
          ? ticketData.use_count < ticketData.total_quantity
          : !ticketData.is_used;

      if (canBeUsed) {
        // Automatically mark ticket as used when it's valid and not already used
        markTicketAsUsed();
      }
    }
  }, [ticketData, isLoading, wasJustAdmitted, markTicketAsUsed]);

  // Get status colors and icons based on ticket state
  const getTicketStatus = () => {
    // Show orange styling for ALREADY_USED errors (ticket is valid but was already admitted)
    if (error && errorCode === 'ALREADY_USED') {
      return {
        bgColor: "bg-orange-50/30 dark:bg-orange-900/20",
        borderColor: "border-orange-300 dark:border-orange-700",
        textColor: "text-orange-800 dark:text-orange-200",
        icon: <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />,
        badgeVariant: "secondary" as const,
        badgeText: t(currentLanguage, "ticketVerification.badges.alreadyUsed"),
        statusText: t(currentLanguage, "ticketVerification.status.alreadyUsed"),
      };
    }

    // Show red styling for actual errors (ticket not found, invalid, unpaid, etc.)
    if (error) {
      return {
        bgColor: "bg-red-50/30 dark:bg-red-900/20",
        borderColor: "border-red-300 dark:border-red-700",
        textColor: "text-red-800 dark:text-red-200",
        icon: <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />,
        badgeVariant: "destructive" as const,
        badgeText: t(currentLanguage, "ticketVerification.badges.invalid"),
        statusText: t(currentLanguage, "ticketVerification.status.invalid"),
      };
    }

    if (ticketData?.use_count !== undefined && ticketData.total_quantity) {
      // This is a legacy multi-person ticket
      const remaining = ticketData.total_quantity - ticketData.use_count;
      if (remaining <= 0) {
        return {
          bgColor: "bg-orange-50/30 dark:bg-orange-900/20",
          borderColor: "border-orange-300 dark:border-orange-700",
          textColor: "text-orange-800 dark:text-orange-200",
          icon: (
            <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          ),
          badgeVariant: "secondary" as const,
          badgeText: t(currentLanguage, "ticketVerification.badges.fullyUsed"),
          statusText: t(currentLanguage, "ticketVerification.status.fullyUsed"),
        };
      }
    } else if (ticketData?.is_used) {
      // This is an individual ticket that has been used
      return {
        bgColor: "bg-orange-50/30 dark:bg-orange-900/20",
        borderColor: "border-orange-300 dark:border-orange-700",
        textColor: "text-orange-800 dark:text-orange-200",
        icon: (
          <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
        ),
        badgeVariant: "secondary" as const,
        badgeText: t(currentLanguage, "ticketVerification.badges.alreadyUsed"),
        statusText: t(currentLanguage, "ticketVerification.status.alreadyUsed"),
      };
    }

    if (ticketData) {
      return {
        bgColor: "bg-green-50/30 dark:bg-green-900/20",
        borderColor: "border-green-300 dark:border-green-700",
        textColor: "text-green-800 dark:text-green-200",
        icon: (
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        ),
        badgeVariant: "default" as const,
        badgeText: t(currentLanguage, "ticketVerification.badges.valid"),
        statusText: t(currentLanguage, "ticketVerification.status.valid"),
      };
    }

    return null;
  };

  // If no ticket ID in URL, show manual entry with improved design
  if (!ticketId) {
    return (
      <>
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
          <div className="max-w-md mx-auto">
            <Card className="border border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/20 rounded-sm">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-sm flex items-center justify-center mb-4">
                  <QrCode className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {t(currentLanguage, "ticketVerification.pageTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center text-gray-300">
                  <p className="text-sm">
                    {t(
                      currentLanguage,
                      "ticketVerification.noTicketId.description",
                    )}
                  </p>
                </div>

                <div className="bg-blue-50/30 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                      {t(
                        currentLanguage,
                        "ticketVerification.noTicketId.howToVerify.title",
                      )}
                    </h3>
                  </div>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>
                      •{" "}
                      {t(
                        currentLanguage,
                        "ticketVerification.noTicketId.howToVerify.scanQr",
                      )}
                    </li>
                    <li>
                      •{" "}
                      {t(
                        currentLanguage,
                        "ticketVerification.noTicketId.howToVerify.enterPin",
                      )}
                    </li>
                    <li>
                      •{" "}
                      {t(
                        currentLanguage,
                        "ticketVerification.noTicketId.howToVerify.reviewDetails",
                      )}
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <Button asChild className="w-full">
                    <Link href="/">
                      <Calendar className="w-4 h-4 mr-2" />
                      {t(
                        currentLanguage,
                        "ticketVerification.noTicketId.backToEvents",
                      )}
                    </Link>
                  </Button>
                </div>

                <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                  {t(currentLanguage, "ticketVerification.noTicketId.needHelp")}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Show PIN entry if not verified yet
  if (!isVerified) {
    return (
      <>
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
          <div className="max-w-md mx-auto">
            <Card className="border border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/20 rounded-sm">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-sm flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                  {t(currentLanguage, "ticketVerification.staffVerification")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center text-gray-300">
                  <p className="text-lg mb-2">
                    {t(
                      currentLanguage,
                      "ticketVerification.pinEntry.description",
                    )}
                  </p>
                  <p className="text-sm font-mono bg-gray-800 p-2 rounded-sm">
                    {t(
                      currentLanguage,
                      "ticketVerification.pinEntry.ticketIdLabel",
                    )}{" "}
                    {ticketId.substring(0, 8)}...
                  </p>
                </div>

                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <Input
                    type="password"
                    placeholder={t(
                      currentLanguage,
                      "ticketVerification.pinEntry.pinPlaceholder",
                    )}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={4}
                    className="text-center text-2xl tracking-widest h-12 rounded-sm bg-background border border-border"
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
                        {t(
                          currentLanguage,
                          "ticketVerification.pinEntry.verifying",
                        )}
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        {t(
                          currentLanguage,
                          "ticketVerification.pinEntry.verifyButton",
                        )}
                      </>
                    )}
                  </Button>
                </form>

                {error && (
                  <div className="bg-red-50/30 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-sm p-4">
                    <div className="text-center text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  </div>
                )}

                <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                  {t(currentLanguage, "ticketVerification.pinEntry.staffOnly")}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  const status = getTicketStatus();

  // Show ticket details after PIN verification
  return (
    <>
      {/* Flash Feedback Overlay */}
      {flashColor && (
        <div
          className={`fixed inset-0 pointer-events-none z-50 ${flashColor === 'green'
            ? 'bg-green-500/30'
            : 'bg-red-500/30'
            }`}
          style={{ animation: 'flash 0.4s ease-out' }}
        />
      )}

      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Loading State */}
          {isLoading && !ticketData && (
            <Card className="rounded-sm">
              <CardContent className="pt-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>
                  {t(
                    currentLanguage,
                    "ticketVerification.loading.ticketDetails",
                  )}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Status Header with Customer Name and Ticket Type */}
          {status && (
            <Card
              className={`border-2 ${status.borderColor} ${status.bgColor} rounded-sm`}
            >
              <CardContent className="pt-6 text-center">
                <div className="flex flex-col items-center space-y-4">
                  {status.icon}
                  <h2 className={`text-xl font-bold ${status.textColor}`}>
                    {status.statusText}
                  </h2>
                  {ticketData && (
                    <div className="text-center space-y-3">
                      {/* Prominent Ticket Type Badge */}
                      <div className="flex justify-center">
                        <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-sm px-4 py-2 flex items-center gap-2">
                          <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                            {ticketData.ticket_name}
                          </span>
                        </div>
                      </div>

                      {/* Customer Name */}
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {ticketData.customer_name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {/* Differentiate between individual and legacy ticket display */}
                          {ticketData.use_count !== undefined &&
                            ticketData.total_quantity ? (
                            <span>
                              {ticketData.use_count} /{" "}
                              {ticketData.total_quantity}{" "}
                              {t(
                                currentLanguage,
                                "ticketVerification.quantity.scanned",
                              )}
                            </span>
                          ) : (
                            <span>
                              {ticketData.quantity}{" "}
                              {ticketData.quantity > 1
                                ? t(
                                  currentLanguage,
                                  "ticketVerification.quantity.people",
                                )
                                : t(
                                  currentLanguage,
                                  "ticketVerification.quantity.person",
                                )}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {error && (
                    <p className="text-red-700 dark:text-red-300 mt-2">
                      {error}
                    </p>
                  )}
                  {ticketData?.is_used && !wasJustAdmitted && (
                    <div className="text-center mt-3">
                      <p className="text-orange-800 dark:text-orange-200 font-medium">
                        {ticketData.use_count !== undefined &&
                          ticketData.total_quantity
                          ? t(
                            currentLanguage,
                            "ticketVerification.warnings.fullyUsed",
                          )
                          : t(
                            currentLanguage,
                            "ticketVerification.warnings.alreadyUsed",
                          )}
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        {t(
                          currentLanguage,
                          "ticketVerification.warnings.entryNotPermitted",
                        )}
                      </p>
                    </div>
                  )}
                  {wasJustAdmitted && (
                    <div className="text-center mt-3">
                      <p className="text-green-800 dark:text-green-200 font-medium">
                        {t(
                          currentLanguage,
                          "ticketVerification.success.admitted",
                        )}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        {t(
                          currentLanguage,
                          "ticketVerification.success.entryGranted",
                          {
                            quantity: ticketData?.quantity,
                            people:
                              ticketData?.quantity && ticketData.quantity > 1
                                ? t(
                                  currentLanguage,
                                  "ticketVerification.quantity.people",
                                )
                                : t(
                                  currentLanguage,
                                  "ticketVerification.quantity.person",
                                ),
                          },
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Ticket Information */}
          {ticketData && (
            <Card className="rounded-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  {t(currentLanguage, "ticketVerification.eventDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Ticket Type Details */}
                <div className="bg-muted/50 rounded-sm p-3 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-400">
                      Ticket Type & Purchase Details
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {ticketData.ticket_name}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-gray-400">
                      Quantity: {ticketData.quantity}{" "}
                      {ticketData.quantity > 1 ? "tickets" : "ticket"}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {ticketData.price_per_ticket.toLocaleString()}{" "}
                      {ticketData.currency_code} each
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      ID: {ticketData.ticket_type_id}
                    </p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      Total {ticketData.total_amount.toLocaleString()}{" "}
                      {ticketData.currency_code}
                    </p>
                  </div>
                </div>

                {/* Legacy Ticket Scan Counter */}
                {ticketData.use_count !== undefined &&
                  ticketData.total_quantity && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-400">
                          Legacy Ticket Status
                        </span>
                      </div>
                      <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                        Scanned: {ticketData.use_count} of{" "}
                        {ticketData.total_quantity}
                      </p>
                      <p className="text-sm text-gray-400">
                        This is a multi-person ticket. It can be scanned{" "}
                        {ticketData.total_quantity - ticketData.use_count} more
                        time(s).
                      </p>
                    </div>
                  )}

                {/* Customer Contact Info */}
                <div className="flex items-start gap-2 pt-4 border-t">
                  <User className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {ticketData.customer_email}
                    </p>
                    {ticketData.customer_phone && (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {ticketData.customer_phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Event Info */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{ticketData.event_title}</p>
                    <p className="text-sm text-gray-500">
                      {ticketData.event_date_text} at{" "}
                      {ticketData.event_time_text}
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
                      <span className="font-medium">
                        {t(
                          currentLanguage,
                          "ticketVerification.checkedInLabel",
                        )}
                      </span>{" "}
                      {new Date(ticketData.used_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Automatic Admission Status */}
          {ticketData && !ticketData.is_used && isLoading && (
            <Card className="border-2 border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/20 rounded-sm">
              <CardContent className="pt-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <p className="text-blue-700 dark:text-blue-300 font-medium">
                  {t(
                    currentLanguage,
                    "ticketVerification.loading.autoAdmitting",
                  )}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes flash {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
