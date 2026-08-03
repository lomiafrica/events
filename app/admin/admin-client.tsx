"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import supabase from "@/lib/supabase/client";
import {
  buildPaidGuestPdfRows,
  downloadPaidGuestsPdf as downloadPaidGuestsPdfFile,
} from "@/lib/admin/export-paid-guests-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Mail,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  RefreshCw,
  Send,
  Download,
  Filter,
  QrCode,
  ScanLine,
  UserPlus,
  MailWarning,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/Bouncer";

interface Purchase {
  purchase_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  event_id: string | null;
  event_title: string | null;
  event_date_text: string;
  event_time_text: string;
  event_venue_name: string;
  ticket_name: string;
  quantity: number;
  total_amount: number;
  currency_code: string;
  status: string;
  email_dispatch_status: string;
  email_dispatch_attempts: number;
  email_dispatch_error: string;
  unique_ticket_identifier: string;
  created_at: string;
  pdf_ticket_sent_at: string | null;
  used_at: string | null;
  is_used: boolean;
  verified_by: string | null;
  scanned_count?: number;
  is_bundle?: boolean;
  tickets_per_bundle?: number;
  admission_total?: number;
  /** Set by admin SQL: another paid order exists for this event (same customer or normalized email). */
  abandonment_resolved_by_paid_order?: boolean;
  /** payment_failed row is eligible for recovery email (not resolved, plausible address). */
  recovery_email_eligible?: boolean;
}

/** Mirrors admin_normalize_email_for_recovery_match for client fallback when RPC columns are absent. */
function normalizeEmailForRecoveryMatch(
  email: string | null | undefined,
): string {
  if (email == null) return "";
  const raw = String(email).trim().toLowerCase();
  if (!raw.includes("@")) return raw;
  const at = raw.lastIndexOf("@");
  const local = raw.slice(0, at);
  const domainRaw = raw.slice(at + 1);
  const domainMap: Record<string, string> = {
    "gmail.col": "gmail.com",
    "gmail.con": "gmail.com",
    "gmail.coom": "gmail.com",
    "gmai.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gnail.com": "gmail.com",
    "hotmai.com": "hotmail.com",
    "hotnail.com": "hotmail.com",
    "yahooo.com": "yahoo.com",
    "yaho.com": "yahoo.com",
    "outlok.com": "outlook.com",
    "iclod.com": "icloud.com",
  };
  const domain = domainMap[domainRaw] ?? domainRaw;
  return `${local}@${domain}`;
}

/** Mirrors admin_email_is_valid_for_recovery (blocked typo domains). */
function isPlausibleRecoveryEmail(email: string | null | undefined): boolean {
  if (email == null || !String(email).trim()) return false;
  const t = String(email).trim();
  if (!/^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i.test(t))
    return false;
  const lo = t.toLowerCase();
  if (/@gmail\.col$/i.test(lo)) return false;
  if (/@gmai\.com$/i.test(lo)) return false;
  if (/@gamil\./i.test(lo)) return false;
  if (/@gmial\./i.test(lo)) return false;
  if (/@gnail\./i.test(lo)) return false;
  if (/@hotnail\./i.test(lo)) return false;
  if (/@yahooo\./i.test(lo)) return false;
  if (/@yaho\.com$/i.test(lo)) return false;
  if (/@outlok\./i.test(lo)) return false;
  if (/@iclod\./i.test(lo)) return false;
  return true;
}

function getAdmissionTotal(p: Purchase): number {
  if (typeof p.admission_total === "number" && p.admission_total > 0) {
    return p.admission_total;
  }
  if (p.is_bundle) {
    return Math.max(1, p.quantity * (p.tickets_per_bundle ?? 1));
  }
  return Math.max(1, p.quantity);
}

function getScannedCount(p: Purchase): number {
  if (p.scanned_count !== undefined && p.scanned_count !== null) {
    return Number(p.scanned_count);
  }
  return p.is_used ? getAdmissionTotal(p) : 0;
}

type AdmissionScanState = "none" | "partial" | "full";

function getAdmissionScanState(p: Purchase): AdmissionScanState {
  const total = getAdmissionTotal(p);
  const scanned = getScannedCount(p);
  if (scanned <= 0) return "none";
  if (scanned >= total) return "full";
  return "partial";
}

/** Event ticket / pack rows only (excludes merch and other non-event sales). */
function isEventTicketPurchase(p: Purchase): boolean {
  return p.event_id != null && String(p.event_id).trim() !== "";
}

/** Stable id for filter dropdown: distinguishes bundle vs ticket with same title. */
function offeringLineKey(p: Purchase): string {
  const raw = (p.ticket_name ?? "").trim();
  const name = raw || "—";
  return p.is_bundle ? `bundle:${name}` : `ticket:${name}`;
}

function offeringLineLabel(p: Purchase): string {
  const raw = (p.ticket_name ?? "").trim();
  const name = raw || "Untitled";
  return p.is_bundle ? `${name} (pack)` : name;
}

/**
 * Extra logs (auto-select, filter snapshot). Fetch logs are always printed via
 * console.info("[admin-purchases] …") so you see them without localStorage.
 */
function logAdminPurchasesVerbose(...args: unknown[]) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("admin_debug_purchases") !== "1") return;
  console.info("[admin-purchases]", ...args);
}

interface EventInfo {
  event_id: string;
  event_title: string;
  event_date_text: string;
  total_purchases: number;
  total_tickets: number;
  scanned_tickets: number;
  last_purchase_date: string;
}

interface ScanLog {
  id: string;
  ticket_identifier: string;
  event_id: string;
  event_title: string;
  customer_name: string;
  customer_email: string;
  attempt_timestamp: string;
  success: boolean;
  error_code: string | null;
  error_message: string | null;
  scanner_email: string | null;
}

export default function AdminClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [authError, setAuthError] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [emailActionLoading, setEmailActionLoading] = useState(false);

  // Event filtering state
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("paid");
  const [admissionFilter, setAdmissionFilter] = useState<string>("all"); // 'all', 'scanned' (fully or partially admitted), 'unscanned' (no scans yet)
  /** 'all' or offeringLineKey — options rebuilt from loaded purchases */
  const [offeringFilter, setOfferingFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Guest invitation state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteGuestName, setInviteGuestName] = useState("");
  const [inviteGuestEmail, setInviteGuestEmail] = useState("");
  const [inviteGuestPhone, setInviteGuestPhone] = useState("");
  const [inviteTicketCount, setInviteTicketCount] = useState(1);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Scanner Tab State
  const [activeTab, setActiveTab] = useState("purchases");
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);

  /** Detect overlapping loadPurchases() calls (e.g. mount + selectedEvent auto-select). */
  const loadPurchasesGeneration = useRef(0);

  /** Legacy: match abandoned resolution by paid rows (customer_id or typo-normalized email). */
  const paidLegacyKeys = useMemo(() => {
    const s = new Set<string>();
    for (const p of purchases) {
      if (p.status !== "paid") continue;
      const ev = String(p.event_id ?? "");
      s.add(`id:${p.customer_id}::${ev}`);
      s.add(`em:${normalizeEmailForRecoveryMatch(p.customer_email)}::${ev}`);
    }
    return s;
  }, [purchases]);

  const isAbandonmentResolvedByPaidOrder = useCallback(
    (purchase: Purchase) => {
      if (typeof purchase.abandonment_resolved_by_paid_order === "boolean") {
        return purchase.abandonment_resolved_by_paid_order;
      }
      if (purchase.status !== "payment_failed") return false;
      const ev = String(purchase.event_id ?? "");
      const ne = normalizeEmailForRecoveryMatch(purchase.customer_email);
      return (
        paidLegacyKeys.has(`id:${purchase.customer_id}::${ev}`) ||
        paidLegacyKeys.has(`em:${ne}::${ev}`)
      );
    },
    [paidLegacyKeys],
  );

  /** Failed checkout with no later paid order for this event / identity (may still be non-actionable if email is a typo). */
  const isAbandonedCartRow = useCallback(
    (purchase: Purchase) =>
      purchase.status === "payment_failed" &&
      !isAbandonmentResolvedByPaidOrder(purchase),
    [isAbandonmentResolvedByPaidOrder],
  );

  /** Show recovery email UI only when SQL (or legacy) says the address is usable. */
  const isRecoveryEmailActionable = useCallback(
    (purchase: Purchase) => {
      if (typeof purchase.recovery_email_eligible === "boolean") {
        return purchase.recovery_email_eligible;
      }
      return (
        purchase.status === "payment_failed" &&
        !isAbandonmentResolvedByPaidOrder(purchase) &&
        isPlausibleRecoveryEmail(purchase.customer_email)
      );
    },
    [isAbandonmentResolvedByPaidOrder],
  );

  // Helper function to format relative time
  const formatRelativeTime = (timestamp: string | null) => {
    if (!timestamp) return "-";
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const paidGuestRowsForPdf = useMemo(
    () => buildPaidGuestPdfRows(purchases, selectedEvent),
    [purchases, selectedEvent],
  );

  const downloadPaidGuestsPdf = useCallback(() => {
    if (!selectedEvent || paidGuestRowsForPdf.length === 0) return;
    const eventTitle =
      events.find((e) => e.event_id === selectedEvent)?.event_title ?? "Event";
    downloadPaidGuestsPdfFile({
      purchases,
      selectedEvent,
      eventTitle,
      bodyRows: paidGuestRowsForPdf,
    });
  }, [selectedEvent, paidGuestRowsForPdf, purchases, events]);

  // Check authentication on mount
  useEffect(() => {
    const authStatus = localStorage.getItem("admin_authenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
      loadEvents();
      // loadPurchases: deferred to the [selectedEvent, isAuthenticated] effect so we
      // do not race get_admin_purchases (100 cap) against get_admin_purchases_by_event.
    }
  }, []);

  // Auto-select the most recent event when events are loaded
  useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      logAdminPurchasesVerbose("auto-select event", {
        event_id: events[0].event_id,
        event_title: events[0].event_title,
      });
      setSelectedEvent(events[0].event_id);
    }
  }, [events, selectedEvent]);

  // Reload when event scope or auth changes — not statusFilter (that is client-only).
  useEffect(() => {
    if (isAuthenticated) {
      console.info("[admin-purchases] effect reload", {
        selectedEvent,
      });
      loadEvents();
      loadPurchases();
      loadScanLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent, isAuthenticated]);

  const loadScanLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc(
        "get_admin_verification_logs",
        {
          p_event_id: selectedEvent,
          p_limit: 50,
        },
      );
      if (error) {
        console.error("Error loading scan logs:", error);
      } else {
        setScanLogs(data || []);
      }
    } catch (error) {
      console.error("Error loading scan logs:", error);
    }
  }, [selectedEvent]);

  // Load logs when tab changes to scans
  useEffect(() => {
    if (isAuthenticated && activeTab === "scans") {
      loadScanLogs();
    }
  }, [activeTab, selectedEvent, isAuthenticated, loadScanLogs]);

  const handleAuth = async () => {
    setAuthError("");
    try {
      const { data, error } = await supabase.rpc("verify_staff_pin", {
        p_pin: pin,
      });

      if (error) {
        setAuthError("Authentication failed. Please try again.");
        return;
      }

      if (data === true) {
        setIsAuthenticated(true);
        localStorage.setItem("admin_authenticated", "true");
        loadEvents();
        loadScanLogs();
        // loadPurchases runs from [selectedEvent, isAuthenticated] effect
      } else {
        setAuthError("Invalid PIN. Please try again.");
      }
    } catch {
      setAuthError("Authentication failed. Please try again.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("admin_authenticated");
    setPin("");
    setPurchases([]);
  };

  const loadPurchases = async () => {
    const gen = ++loadPurchasesGeneration.current;
    const eventAtRequestStart = selectedEvent;
    const rpcName = eventAtRequestStart
      ? "get_admin_purchases_by_event"
      : "get_admin_purchases";
    console.info("[admin-purchases] load start", {
      gen,
      eventAtRequestStart,
      rpcName,
    });
    setLoading(true);
    try {
      if (eventAtRequestStart) {
        // Load purchases for specific event
        const { data, error } = await supabase.rpc(
          "get_admin_purchases_by_event",
          {
            p_event_id: eventAtRequestStart,
          },
        );
        const rowCount = data?.length ?? 0;
        const stale = gen !== loadPurchasesGeneration.current;
        if (error) {
          console.error("Error loading purchases:", error);
        } else if (stale) {
          console.info("[admin-purchases] load end (stale, ignored)", {
            gen,
            rpcName,
            rowCount,
            latestGen: loadPurchasesGeneration.current,
          });
        } else {
          console.info("[admin-purchases] load end", {
            gen,
            rpcName,
            eventAtRequestStart,
            rowCount,
          });
          setPurchases(data || []);
        }
      } else {
        // Load all purchases
        const { data, error } = await supabase.rpc("get_admin_purchases");
        const rowCount = data?.length ?? 0;
        const stale = gen !== loadPurchasesGeneration.current;
        if (error) {
          console.error("Error loading purchases:", error);
        } else if (stale) {
          console.info("[admin-purchases] load end (stale, ignored)", {
            gen,
            rpcName,
            rowCount,
            latestGen: loadPurchasesGeneration.current,
          });
        } else {
          console.info("[admin-purchases] load end", {
            gen,
            rpcName,
            rowCount,
          });
          setPurchases(data || []);
        }
      }
    } catch (error) {
      console.info("[admin-purchases] load threw", {
        gen,
        error: String(error),
        latestGen: loadPurchasesGeneration.current,
      });
      console.error("Error loading purchases:", error);
    } finally {
      if (gen === loadPurchasesGeneration.current) {
        setLoading(false);
      }
    }
  };

  const loadEvents = async () => {
    try {
      // Always use "all" for event list so the dropdown stays stable when switching
      // status filters (paid/pending/failed). Otherwise, clicking "Failed" would
      // replace the list with only events that have failed purchases, causing the
      // selected event to disappear and the dropdown to show "All Events" or blank.
      const { data, error } = await supabase.rpc("get_admin_events_list", {
        p_status_filter: "all",
      });
      if (error) {
        console.error("Error loading events:", error);
      } else {
        // Filter out events with null/empty event_id to prevent "event without title"
        // (can occur when purchases have null event_id - they group into one row)
        const validEvents = (data || []).filter(
          (e: EventInfo) => e.event_id && String(e.event_id).trim() !== "",
        );
        setEvents(validEvents);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const handleInviteGuest = async () => {
    if (!selectedEvent || !inviteGuestEmail.trim() || !inviteGuestName.trim()) {
      return;
    }

    const selectedEventData = events.find((e) => e.event_id === selectedEvent);
    if (!selectedEventData) {
      return;
    }

    setInviteLoading(true);
    try {
      // Call the issue_guest_ticket RPC
      const { data, error } = await supabase.rpc("issue_guest_ticket", {
        p_event_id: selectedEvent,
        p_event_title: selectedEventData.event_title,
        p_event_date_text: selectedEventData.event_date_text || "TBA",
        p_event_time_text: "TBA",
        p_event_venue_name: "TBA",
        p_guest_name: inviteGuestName.trim(),
        p_guest_email: inviteGuestEmail.trim(),
        p_guest_phone: inviteGuestPhone.trim() || null,
        p_ticket_type_name: "Guest List",
        p_quantity: inviteTicketCount,
        p_notes: "Invited via admin panel",
      });

      if (error) {
        console.error("Error creating guest ticket:", error);
        return;
      }

      if (!data || data.length === 0) {
        return;
      }

      const result = data[0];

      // Optionally trigger email send
      const { error: emailError } = await supabase.functions.invoke(
        "send-ticket-email",
        {
          body: { purchase_id: result.purchase_id },
        },
      );

      if (emailError) {
        console.error("Ticket created but email failed to send:", emailError);
      }

      // Reset form and close dialog
      setIsInviteDialogOpen(false);
      setInviteGuestName("");
      setInviteGuestEmail("");
      setInviteGuestPhone("");
      setInviteTicketCount(1);
      loadPurchases(); // Refresh the list
    } catch (error) {
      console.error("Error inviting guest:", error);
    } finally {
      setInviteLoading(false);
    }
  };

  const searchPurchases = async () => {
    if (!searchQuery.trim()) {
      loadPurchases();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("search_admin_purchases", {
        p_search_query: searchQuery.trim(),
      });
      if (error) {
        console.error("Error searching purchases:", error);
      } else {
        setPurchases(data || []);
      }
    } catch (error) {
      console.error("Error searching purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAction = async () => {
    if (!selectedPurchase) return;

    setEmailActionLoading(true);
    try {
      // First update customer information if provided
      if (newEmail || newName || newPhone) {
        const { error: updateError } = await supabase.rpc(
          "update_customer_for_resend",
          {
            p_customer_id: selectedPurchase.customer_id,
            p_new_email: newEmail || selectedPurchase.customer_email,
            p_new_name: newName || selectedPurchase.customer_name,
            p_new_phone: newPhone || selectedPurchase.customer_phone,
          },
        );

        if (updateError) {
          console.error("Error updating customer:", updateError);
          // Show more specific error message
          let errorMessage = "Failed to update customer information";
          if (updateError.message?.includes("duplicate key")) {
            errorMessage = "Email already exists for another customer";
          } else if (updateError.message?.includes("customer_email_valid")) {
            errorMessage = "Invalid email format";
          } else if (updateError.message?.includes("Manual review required")) {
            errorMessage =
              "Email already exists for a different customer. Manual review required.";
          } else if (
            updateError.message?.includes(
              "already exists for a different customer",
            )
          ) {
            errorMessage = updateError.message; // Use the full message from the function
          }
          console.error(errorMessage);
          return;
        }
      }

      // Reset email dispatch status to allow sending/resending
      const { error: resetError } = await supabase.rpc(
        "reset_email_dispatch_status",
        {
          p_purchase_id: selectedPurchase.purchase_id,
        },
      );

      if (resetError) {
        console.error("Error resetting email status:", resetError);
        return;
      }

      const isRecoverySend = isRecoveryEmailActionable(selectedPurchase);

      const { error: emailError } = await supabase.functions.invoke(
        isRecoverySend ? "send-recovery-email" : "send-ticket-email",
        {
          body: { purchase_id: selectedPurchase.purchase_id },
        },
      );

      if (emailError) {
        console.error(
          isRecoverySend
            ? "Failed to send recovery email"
            : "Failed to send email",
        );
      }

      const isFirstTime =
        selectedPurchase.email_dispatch_status === "NOT_INITIATED" ||
        selectedPurchase.email_dispatch_attempts === 0;
      if (isRecoverySend) {
        console.log("Recovery email sent successfully!");
      } else {
        console.log(
          isFirstTime
            ? "Email sent successfully!"
            : "Email resent successfully!",
        );
      }
      setIsEmailDialogOpen(false);
      setSelectedPurchase(null);
      setNewEmail("");
      setNewName("");
      setNewPhone("");
      loadPurchases(); // Refresh the list
    } catch (error) {
      console.error("Error sending email:", error);
    } finally {
      setEmailActionLoading(false);
    }
  };

  const openEmailDialog = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setNewEmail(purchase.customer_email);
    setNewName(purchase.customer_name);
    setNewPhone(purchase.customer_phone || "");
    setIsEmailDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT_SUCCESSFULLY":
        return (
          <Badge className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 rounded-sm min-w-[80px] justify-center text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case "DISPATCH_FAILED":
        return (
          <Badge className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 rounded-sm min-w-[80px] justify-center text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "DISPATCH_IN_PROGRESS":
        return (
          <Badge className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700 rounded-sm min-w-[80px] justify-center text-xs">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "PENDING_DISPATCH":
        return (
          <Badge className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 rounded-sm min-w-[80px] justify-center text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "NOT_INITIATED":
        return (
          <Badge className="bg-gray-900/30 text-gray-300 border-gray-700 rounded-sm min-w-[80px] justify-center text-xs">
            Not Initiated
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-900/30 text-gray-300 border-gray-700 rounded-sm min-w-[80px] justify-center text-xs">
            Unknown
          </Badge>
        );
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 rounded-sm text-xs">
            Paid
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700 rounded-sm text-xs">
            Pending
          </Badge>
        );
      case "payment_failed":
        return (
          <Badge className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 rounded-sm text-xs">
            Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-zinc-900/90 dark:bg-black/50 text-zinc-100 dark:text-sage-100 border-zinc-800 rounded-sm text-xs">
            {status}
          </Badge>
        );
    }
  };

  const canSendEmail = (purchase: Purchase) => {
    return (
      purchase.status === "paid" ||
      purchase.status === "pending_payment" ||
      isRecoveryEmailActionable(purchase)
    );
  };

  /** Recovery emails are one-shot from admin: show Sent badge but no action after success. */
  const canShowEmailActionButton = (purchase: Purchase) => {
    if (!canSendEmail(purchase)) return false;
    if (
      isRecoveryEmailActionable(purchase) &&
      purchase.email_dispatch_status === "SENT_SUCCESSFULLY"
    )
      return false;
    return true;
  };

  const getEmailButtonText = (purchase: Purchase) => {
    const isFirstTime =
      purchase.email_dispatch_status === "NOT_INITIATED" ||
      purchase.email_dispatch_attempts === 0;
    if (isRecoveryEmailActionable(purchase)) {
      return isFirstTime ? "Recovery Email" : "Retry Recovery";
    }
    return isFirstTime ? "Send Email" : "Resend Email";
  };

  const getEmailButtonIcon = (purchase: Purchase) => {
    if (isRecoveryEmailActionable(purchase)) return MailWarning;
    const isFirstTime =
      purchase.email_dispatch_status === "NOT_INITIATED" ||
      purchase.email_dispatch_attempts === 0;
    return isFirstTime ? Send : Mail;
  };

  // Filter purchases by status only (for table display)
  const statusFilteredPurchases = purchases.filter((purchase) => {
    if (statusFilter === "paid" && purchase.status !== "paid") return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "pending" && purchase.status !== "pending_payment")
      return false;
    if (statusFilter === "failed" && purchase.status !== "payment_failed")
      return false;
    return true;
  });

  // Item names from data (ticket_name from Sanity / checkout) — scoped by status + event
  const offeringOptions = useMemo(() => {
    const statusFiltered = purchases.filter((purchase) => {
      if (statusFilter === "paid" && purchase.status !== "paid") return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "pending" && purchase.status !== "pending_payment")
        return false;
      if (statusFilter === "failed" && purchase.status !== "payment_failed")
        return false;
      return true;
    });
    const scoped = statusFiltered
      .filter(isEventTicketPurchase)
      .filter(
        (p) =>
          !selectedEvent ||
          (p.event_id != null && String(p.event_id) === selectedEvent),
      );
    const map = new Map<string, string>();
    for (const p of scoped) {
      const key = offeringLineKey(p);
      if (!map.has(key)) map.set(key, offeringLineLabel(p));
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      );
  }, [purchases, statusFilter, selectedEvent]);

  useEffect(() => {
    if (offeringFilter === "all") return;
    if (!offeringOptions.some((o) => o.value === offeringFilter)) {
      setOfferingFilter("all");
    }
  }, [offeringFilter, offeringOptions]);

  // Filter purchases by status AND search (for table display)
  const filteredPurchases = statusFilteredPurchases.filter((purchase) => {
    if (!isEventTicketPurchase(purchase)) return false;

    // Event filter: when an event is selected, only show its purchases
    // (defense-in-depth: backend should filter, but search/race conditions can mix data)
    if (selectedEvent && purchase.event_id !== selectedEvent) return false;

    // Admission filter (aligned with scanned_count / multi-ticket rows)
    const admissionScan = getAdmissionScanState(purchase);
    if (admissionFilter === "scanned" && admissionScan === "none") return false;
    if (admissionFilter === "unscanned" && admissionScan !== "none")
      return false;

    if (
      offeringFilter !== "all" &&
      offeringLineKey(purchase) !== offeringFilter
    ) {
      return false;
    }

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      purchase.customer_name?.toLowerCase().includes(query) ||
      purchase.customer_email?.toLowerCase().includes(query) ||
      purchase.event_title?.toLowerCase().includes(query) ||
      purchase.ticket_name?.toLowerCase().includes(query) ||
      purchase.purchase_id.toLowerCase().includes(query)
    );
  });

  // Calculate current event stats from PAID purchases only (always show real business metrics)
  const currentEventStats = selectedEvent
    ? (() => {
        const paidPurchases = purchases.filter(
          (p) => p.event_id === selectedEvent && p.status === "paid",
        );
        const totalPurchases = paidPurchases.length;
        const totalTickets = paidPurchases.reduce(
          (sum, p) => sum + getAdmissionTotal(p),
          0,
        );
        const scannedTickets = paidPurchases.reduce(
          (sum, p) => sum + getScannedCount(p),
          0,
        );

        return {
          total_purchases: totalPurchases,
          total_tickets: totalTickets,
          scanned_tickets: scannedTickets,
          event_id: selectedEvent,
        };
      })()
    : null;

  useEffect(() => {
    const byStatus = (s: string) =>
      purchases.filter((p) => {
        if (s === "paid") return p.status === "paid";
        if (s === "all") return true;
        if (s === "pending") return p.status === "pending_payment";
        if (s === "failed") return p.status === "payment_failed";
        return true;
      }).length;
    logAdminPurchasesVerbose("ui row counts", {
      raw_purchases: purchases.length,
      after_status_filter: statusFilteredPurchases.length,
      table_rows_filteredPurchases: filteredPurchases.length,
      statusFilter,
      paid_rows_in_buffer: byStatus("paid"),
      card_total_purchases_paid_only:
        currentEventStats?.total_purchases ?? null,
      selectedEvent,
      admissionFilter,
      offeringFilter,
      search_nonempty: Boolean(searchQuery.trim()),
    });
  }, [
    purchases,
    statusFilteredPurchases.length,
    filteredPurchases.length,
    statusFilter,
    selectedEvent,
    admissionFilter,
    offeringFilter,
    searchQuery,
    currentEventStats?.total_purchases,
  ]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-sm border-slate-700 bg-card/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-100">
              Admin Access
            </CardTitle>
            <CardDescription className="text-gray-300">
              Enter your PIN to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin" className="text-gray-200">
                PIN
              </Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAuth()}
                placeholder="Enter PIN"
                className="rounded-sm bg-background border-slate-700 text-gray-100 placeholder:text-gray-400"
              />
            </div>
            {authError && (
              <div className="rounded-sm border border-red-700 bg-red-900/30 p-3 text-red-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{authError}</span>
                </div>
              </div>
            )}
            <Button
              onClick={handleAuth}
              className="w-full rounded-sm"
              disabled={!pin.trim()}
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header - Mobile Optimized */}
        <div className="pt-4 sm:pt-12 mb-6 sm:mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 sm:mb-6">
            <div className="flex-1 max-w-4xl">
              <h1 className="text-3xl sm:text-5xl md:text-7xl tracking-tighter font-regular text-white mb-3 sm:mb-6">
                Admin panel
              </h1>
              <p className="text-zinc-200 text-sm sm:text-base md:text-xl leading-relaxed tracking-tight max-w-3xl">
                Manage purchases, track email dispatch status, and oversee
                ticket sales for Djaouli events.
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="rounded-sm border-slate-700 text-gray-100 hover:bg-card/70 shrink-0 w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Event Filter */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <Label className="text-zinc-200 font-medium text-xs sm:text-sm uppercase tracking-wider mb-3 sm:mb-4 block">
                Event Filter
              </Label>
              <select
                value={selectedEvent || ""}
                onChange={(e) => setSelectedEvent(e.target.value || null)}
                className="rounded-sm bg-card/30 backdrop-blur-sm border-slate-700 text-gray-100 h-10 sm:h-12 px-3 pr-8 text-sm sm:text-base w-full appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 0.5rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.5em 1.5em",
                  paddingRight: "2.5rem",
                }}
              >
                <option value="">All Events</option>
                {events.map((event) => (
                  <option key={event.event_id} value={event.event_id}>
                    {event.event_title}
                  </option>
                ))}
              </select>
            </div>

            {/* Invite Guest Button */}
            {selectedEvent && (
              <div className="shrink-0">
                <Button
                  onClick={() => setIsInviteDialogOpen(true)}
                  className="rounded-sm bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Guest
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards - Below Event Filter */}
        {currentEventStats && (
          <div className="mb-6 sm:mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card className="rounded-sm border-slate-700 bg-purple-900/20">
                <CardContent className="p-2 sm:p-3">
                  <div className="text-xs text-purple-300">Purchases</div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-100">
                    {currentEventStats.total_purchases}
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-sm border-slate-700 bg-blue-900/20">
                <CardContent className="p-2 sm:p-3">
                  <div className="text-xs text-blue-300">Total Tickets</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-100">
                    {currentEventStats.total_tickets}
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-sm border-slate-700 bg-green-900/20">
                <CardContent className="p-2 sm:p-3">
                  <div className="text-xs text-green-300">Scanned</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-100">
                    {currentEventStats.scanned_tickets}
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-sm border-slate-700 bg-orange-900/20">
                <CardContent className="p-2 sm:p-3">
                  <div className="text-xs text-orange-300">Remaining</div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-100">
                    {(currentEventStats.total_tickets || 0) -
                      (currentEventStats.scanned_tickets || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="w-full space-y-6">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("purchases")}
              className={`rounded-sm text-xs sm:text-sm ${
                activeTab === "purchases"
                  ? "bg-slate-700 text-white hover:bg-slate-600"
                  : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white"
              }`}
            >
              Purchases
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("scans")}
              className={`rounded-sm text-xs sm:text-sm ${
                activeTab === "scans"
                  ? "bg-slate-700 text-white hover:bg-slate-600"
                  : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white"
              }`}
            >
              Logs
            </Button>
          </div>

          {activeTab === "purchases" && (
            <div className="space-y-6">
              {/* Filters and Search - Mobile Optimized */}
              <div className="mb-6 sm:mb-12">
                <div className="flex flex-col gap-4">
                  {/* Mobile Filter Toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200 font-medium text-xs sm:text-sm uppercase tracking-wider">
                      Purchases ({filteredPurchases.length})
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="rounded-sm border-slate-700 text-gray-100 hover:bg-card/70 sm:hidden"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </div>

                  {/* Filters - Collapsible on mobile */}
                  <div
                    className={`space-y-3 ${showFilters ? "block" : "hidden sm:block"}`}
                  >
                    {/* Status Filter */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusFilter("paid")}
                        className={`rounded-sm text-xs sm:text-sm ${
                          statusFilter === "paid"
                            ? "bg-slate-700 text-white hover:bg-slate-600"
                            : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        }`}
                      >
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Paid Only
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusFilter("all")}
                        className={`rounded-sm text-xs sm:text-sm ${
                          statusFilter === "all"
                            ? "bg-slate-700 text-white hover:bg-slate-600"
                            : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        }`}
                      >
                        All Status
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusFilter("pending")}
                        className={`rounded-sm text-xs sm:text-sm ${
                          statusFilter === "pending"
                            ? "bg-slate-700 text-white hover:bg-slate-600"
                            : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        }`}
                      >
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Pending
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusFilter("failed")}
                        className={`rounded-sm text-xs sm:text-sm ${
                          statusFilter === "failed"
                            ? "bg-slate-700 text-white hover:bg-slate-600"
                            : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        }`}
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Failed
                      </Button>
                    </div>

                    {/* Admission Filter */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAdmissionFilter("all")}
                        className={`rounded-sm text-xs sm:text-sm ${
                          admissionFilter === "all"
                            ? "bg-slate-700 text-white hover:bg-slate-600"
                            : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        }`}
                      >
                        All Admission
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAdmissionFilter("scanned")}
                        className={`rounded-sm text-xs sm:text-sm ${
                          admissionFilter === "scanned"
                            ? "bg-slate-700 text-white hover:bg-slate-600"
                            : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        }`}
                      >
                        <QrCode className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Scanned
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAdmissionFilter("unscanned")}
                        className={`rounded-sm text-xs sm:text-sm ${
                          admissionFilter === "unscanned"
                            ? "bg-slate-700 text-white hover:bg-slate-600"
                            : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        }`}
                      >
                        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Not Scanned
                      </Button>
                    </div>

                    {/* Search, product type, and actions */}
                    <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-stretch">
                        <div className="flex min-w-0 flex-1 gap-2">
                          <Input
                            id="search"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 flex-1 rounded-sm border-slate-700 bg-card/30 text-sm text-gray-100 placeholder:text-gray-400 backdrop-blur-sm sm:h-10 sm:text-base"
                          />
                          <Button
                            onClick={searchPurchases}
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 shrink-0 touch-manipulation rounded-sm border-slate-700 p-0 text-gray-100 hover:bg-card/70 sm:h-10 sm:w-10"
                            disabled={loading}
                            aria-label="Search purchases"
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="w-full shrink-0 sm:w-[min(100%,20rem)]">
                          <Label htmlFor="offering-filter" className="sr-only">
                            Ticket or pack
                          </Label>
                          <Select
                            value={offeringFilter}
                            onValueChange={setOfferingFilter}
                          >
                            <SelectTrigger
                              id="offering-filter"
                              className="h-8 w-full max-w-full touch-manipulation rounded-sm border-slate-700 bg-card/30 text-gray-100 backdrop-blur-sm focus:ring-slate-600 sm:h-10 [&>svg]:text-slate-400"
                              aria-label="Filter by item"
                            >
                              <SelectValue placeholder="Item" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[min(24rem,70vh)] border-slate-700 bg-slate-950 text-gray-100">
                              <SelectItem value="all">All items</SelectItem>
                              {offeringOptions.map(({ value, label }) => (
                                <SelectItem key={value} value={value}>
                                  <span className="line-clamp-2 text-left">
                                    {label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2 lg:shrink-0">
                        <Button
                          onClick={loadPurchases}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 touch-manipulation rounded-sm border-slate-700 p-0 text-gray-100 hover:bg-card/70 sm:h-10 sm:w-10"
                          disabled={loading}
                          aria-label="Refresh purchases"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                          />
                          <span className="ml-2 sm:hidden">Refresh</span>
                        </Button>
                        <Button
                          onClick={downloadPaidGuestsPdf}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 touch-manipulation rounded-sm border-slate-700 p-0 text-gray-100 hover:bg-card/70 sm:h-10 sm:w-10"
                          disabled={
                            loading ||
                            !selectedEvent ||
                            paidGuestRowsForPdf.length === 0
                          }
                          title={
                            !selectedEvent
                              ? "Select an event to export a PDF guest list"
                              : "Download paid guest list as PDF (includes Purchases & Total tickets)"
                          }
                          aria-label="Export paid guests as PDF"
                        >
                          <Download className="h-4 w-4" />
                          <span className="ml-2 sm:hidden">PDF</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchases Table - Mobile-Friendly */}
              <Card className="rounded-sm border-slate-700 bg-card/30 backdrop-blur-sm">
                <CardContent className="p-0">
                  {loading ? (
                    <LoadingSpinner />
                  ) : filteredPurchases.length === 0 ? (
                    <motion.div
                      className="text-center py-12 sm:py-20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">
                        No purchases found
                      </h2>
                      <p className="text-zinc-400 mb-6 text-sm sm:text-base">
                        Try adjusting your filters or search query
                      </p>
                    </motion.div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-left w-[18%]">
                            Customer
                          </TableHead>
                          {!selectedEvent && (
                            <TableHead className="text-left hidden sm:table-cell w-[11%]">
                              Event
                            </TableHead>
                          )}
                          <TableHead
                            className={`text-left hidden sm:table-cell ${
                              selectedEvent ? "w-[22%]" : "w-[11%]"
                            }`}
                          >
                            Item
                          </TableHead>
                          <TableHead className="text-center w-[10%]">
                            Tickets
                          </TableHead>
                          <TableHead className="text-center w-[12%]">
                            Admission
                          </TableHead>
                          <TableHead className="text-center w-[12%]">
                            Payment
                          </TableHead>
                          <TableHead className="text-center w-[14%]">
                            Email
                          </TableHead>
                          <TableHead className="text-center w-[14%]">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPurchases.map((purchase) => {
                          const EmailIcon = getEmailButtonIcon(purchase);
                          const recoveryRow =
                            isRecoveryEmailActionable(purchase);
                          const admissionScan = getAdmissionScanState(purchase);
                          return (
                            <TableRow key={purchase.purchase_id}>
                              {/* Customer Info */}
                              <TableCell className="w-[18%]">
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-100 truncate max-w-[120px] sm:max-w-none">
                                    {purchase.customer_name}
                                  </div>
                                  <div className="text-xs text-gray-400 truncate max-w-[120px] sm:max-w-none">
                                    {purchase.customer_email}
                                  </div>
                                  <div className="mt-1.5 space-y-0.5 sm:hidden text-xs text-gray-500">
                                    <div
                                      className="truncate"
                                      title={purchase.event_title ?? undefined}
                                    >
                                      {purchase.event_title || "—"}
                                    </div>
                                    <div className="truncate text-gray-400">
                                      {purchase.is_bundle ? (
                                        <>
                                          <span className="text-gray-300">
                                            {purchase.ticket_name || "—"}
                                          </span>
                                          <span>
                                            {" "}
                                            × {purchase.quantity} pack ·{" "}
                                            {getAdmissionTotal(purchase)}{" "}
                                            tickets
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          {purchase.ticket_name || "—"} ×{" "}
                                          {purchase.quantity}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              {!selectedEvent && (
                                <TableCell className="hidden sm:table-cell w-[11%]">
                                  <div
                                    className="text-sm text-gray-100 truncate max-w-[140px]"
                                    title={purchase.event_title ?? undefined}
                                  >
                                    {purchase.event_title || "—"}
                                  </div>
                                </TableCell>
                              )}

                              <TableCell
                                className={`hidden sm:table-cell ${
                                  selectedEvent ? "w-[22%]" : "w-[11%]"
                                }`}
                              >
                                <div
                                  className={`text-xs text-gray-400 truncate ${
                                    selectedEvent
                                      ? "max-w-[240px]"
                                      : "max-w-[140px]"
                                  }`}
                                >
                                  {purchase.is_bundle ? (
                                    <>
                                      <div
                                        className="text-sm text-gray-100 truncate"
                                        title={purchase.ticket_name}
                                      >
                                        {purchase.ticket_name || "—"}
                                      </div>
                                      <span>
                                        × {purchase.quantity} pack ·{" "}
                                        {getAdmissionTotal(purchase)} tickets
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span
                                        className="text-sm text-gray-100"
                                        title={purchase.ticket_name}
                                      >
                                        {purchase.ticket_name || "—"}
                                      </span>{" "}
                                      × {purchase.quantity}
                                    </>
                                  )}
                                </div>
                              </TableCell>

                              {/* Tickets & Amount */}
                              <TableCell className="text-center w-[10%]">
                                <div className="text-sm font-medium text-gray-100">
                                  <span className="text-green-400">
                                    {getScannedCount(purchase)}
                                  </span>
                                  <span className="text-gray-500 mx-1">/</span>
                                  {getAdmissionTotal(purchase)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {purchase.total_amount}{" "}
                                  {purchase.currency_code}
                                </div>
                              </TableCell>

                              {/* Admission Status */}
                              <TableCell className="text-center w-[12%]">
                                {admissionScan === "full" ? (
                                  <Badge className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 rounded-sm text-xs">
                                    <QrCode className="h-3 w-3 mr-1" />
                                    Scanned
                                  </Badge>
                                ) : admissionScan === "partial" ? (
                                  <Badge className="bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 rounded-sm text-xs">
                                    <ScanLine className="h-3 w-3 mr-1" />
                                    Partially scanned
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-800/50 text-slate-300 border-slate-700 rounded-sm text-xs">
                                    Not Scanned
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Payment Status */}
                              <TableCell className="text-center w-[12%]">
                                <div className="flex flex-col items-center gap-1">
                                  {isAbandonedCartRow(purchase) ? (
                                    <Badge className="bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 rounded-sm text-xs max-w-[100px] sm:max-w-none whitespace-normal sm:whitespace-nowrap">
                                      Abandoned Cart
                                    </Badge>
                                  ) : (
                                    getPaymentStatusBadge(purchase.status)
                                  )}
                                </div>
                              </TableCell>

                              {/* Email Status */}
                              <TableCell className="text-center w-[14%]">
                                <div className="flex flex-col items-center gap-1">
                                  {canSendEmail(purchase) ? (
                                    getStatusBadge(
                                      purchase.email_dispatch_status,
                                    )
                                  ) : (
                                    <span className="text-xs text-gray-500">
                                      —
                                    </span>
                                  )}
                                  {purchase.pdf_ticket_sent_at && (
                                    <span className="text-xs text-gray-500">
                                      {formatRelativeTime(
                                        purchase.pdf_ticket_sent_at,
                                      )}
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="text-center w-[14%]">
                                {canShowEmailActionButton(purchase) ? (
                                  <Button
                                    size="sm"
                                    onClick={() => openEmailDialog(purchase)}
                                    className={`rounded-sm text-white text-xs ${
                                      recoveryRow
                                        ? "bg-amber-600 hover:bg-amber-700"
                                        : "bg-blue-600 hover:bg-blue-700"
                                    }`}
                                  >
                                    <EmailIcon className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline ml-1">
                                      {getEmailButtonText(purchase)}
                                    </span>
                                    <span className="sm:hidden">
                                      {recoveryRow ? "Recovery" : "Email"}
                                    </span>
                                  </Button>
                                ) : (
                                  <span className="text-xs text-gray-500">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "scans" && (
            <div className="space-y-6">
              {/* Scan Logs */}
              <Card className="rounded-sm border-slate-700 bg-card/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-100">
                    Scan history
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Recent verification attempts help identify issues with
                    scanning.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-slate-800 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                        <tr>
                          <th className="px-4 py-3">Time</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Event</th>
                          <th className="px-4 py-3">Scanner</th>
                          <th className="px-4 py-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {scanLogs.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-slate-500"
                            >
                              No scan logs found
                            </td>
                          </tr>
                        ) : (
                          scanLogs.map((log) => (
                            <tr
                              key={log.id}
                              className="bg-slate-900/20 hover:bg-slate-900/40"
                            >
                              <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                                {formatRelativeTime(log.attempt_timestamp)}
                                <div className="text-xs text-slate-500">
                                  {new Date(
                                    log.attempt_timestamp,
                                  ).toLocaleTimeString()}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {log.success ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                                    SUCCESS
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400">
                                    FAILED
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                <div
                                  className="truncate max-w-[150px]"
                                  title={log.customer_name}
                                >
                                  {log.customer_name || "Unknown"}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                  {log.customer_email}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                <div
                                  className="truncate max-w-[150px]"
                                  title={log.event_title}
                                >
                                  {log.event_title || "Unknown Event"}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                <div className="text-xs text-slate-400 truncate max-w-[120px]">
                                  {log.scanner_email || "System"}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                {log.success ? (
                                  <div className="text-green-400 text-xs">
                                    {log.error_message ||
                                      "Verified successfully"}
                                  </div>
                                ) : log.error_message ? (
                                  <div className="text-red-400 text-xs">
                                    {log.error_message}
                                  </div>
                                ) : (
                                  <div className="text-slate-500 text-xs">
                                    Verification failed
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Email Dialog */}
        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
          <DialogContent className="rounded-sm border-slate-700 bg-card/90 backdrop-blur-sm shadow-2xl max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-gray-100 text-base sm:text-lg">
                {selectedPurchase &&
                  (() => {
                    const recovery =
                      isRecoveryEmailActionable(selectedPurchase);
                    const first =
                      selectedPurchase.email_dispatch_status ===
                        "NOT_INITIATED" ||
                      selectedPurchase.email_dispatch_attempts === 0;
                    if (recovery) {
                      return "Send Recovery Email";
                    }
                    return first ? "Send Ticket Email" : "Resend Ticket Email";
                  })()}
              </DialogTitle>
              <DialogDescription className="text-gray-300 text-xs sm:text-sm">
                {selectedPurchase && isRecoveryEmailActionable(selectedPurchase)
                  ? "Update contact details if needed, then send the abandoned checkout recovery message."
                  : "Update customer information and send the ticket email"}
              </DialogDescription>
            </DialogHeader>
            {selectedPurchase && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label
                      htmlFor="newName"
                      className="text-gray-200 text-xs sm:text-sm"
                    >
                      Customer Name
                    </Label>
                    <Input
                      id="newName"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter correct name"
                      className="rounded-sm bg-background border-slate-700 text-gray-100 placeholder:text-gray-400 text-sm"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="newPhone"
                      className="text-gray-200 text-xs sm:text-sm"
                    >
                      Phone Number
                    </Label>
                    <Input
                      id="newPhone"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="Enter correct phone"
                      className="rounded-sm bg-background border-slate-700 text-gray-100 placeholder:text-gray-400 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="newEmail"
                    className="text-gray-200 text-xs sm:text-sm"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter correct email"
                    className="rounded-sm bg-background border-slate-700 text-gray-100 placeholder:text-gray-400 text-sm"
                  />
                </div>
                <div className="bg-card/50 backdrop-blur-sm p-3 rounded-sm border border-slate-700">
                  <h4 className="font-medium mb-2 text-gray-100 text-sm">
                    Purchase Details
                  </h4>
                  <div className="text-xs sm:text-sm space-y-1 text-gray-300">
                    <div className="truncate">
                      Event: {selectedPurchase.event_title}
                    </div>
                    <div>
                      Ticket: {selectedPurchase.ticket_name}
                      {selectedPurchase.is_bundle ? (
                        <span>
                          {" "}
                          — {selectedPurchase.quantity} pack (
                          {getAdmissionTotal(selectedPurchase)} tickets)
                        </span>
                      ) : (
                        <span> × {selectedPurchase.quantity}</span>
                      )}
                    </div>
                    <div>
                      Amount: {selectedPurchase.total_amount}{" "}
                      {selectedPurchase.currency_code}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEmailDialogOpen(false)}
                    className="rounded-sm border-slate-700 text-gray-100 hover:bg-card/70 w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEmailAction}
                    disabled={emailActionLoading || !newEmail.trim()}
                    className="rounded-sm w-full sm:w-auto"
                  >
                    {emailActionLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : isRecoveryEmailActionable(selectedPurchase) ? (
                      <>
                        <MailWarning className="h-4 w-4 mr-2" />
                        Send Recovery Email
                      </>
                    ) : (
                      <>
                        {selectedPurchase.email_dispatch_status ===
                          "NOT_INITIATED" ||
                        selectedPurchase.email_dispatch_attempts === 0 ? (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Email
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Resend Email
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Invite Guest Dialog */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent className="rounded-sm border-slate-700 bg-card/90 backdrop-blur-sm shadow-2xl max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-gray-100 text-base sm:text-lg">
                Invite Guest
              </DialogTitle>
              <DialogDescription className="text-gray-300 text-xs sm:text-sm">
                Create a ticket for a guest and send them an email with their QR
                code.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label
                    htmlFor="inviteGuestName"
                    className="text-gray-200 text-xs sm:text-sm"
                  >
                    Guest Name *
                  </Label>
                  <Input
                    id="inviteGuestName"
                    value={inviteGuestName}
                    onChange={(e) => setInviteGuestName(e.target.value)}
                    placeholder="Enter guest name"
                    className="rounded-sm bg-background border-slate-700 text-gray-100 placeholder:text-gray-400 text-sm"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="inviteGuestPhone"
                    className="text-gray-200 text-xs sm:text-sm"
                  >
                    Phone Number
                  </Label>
                  <Input
                    id="inviteGuestPhone"
                    value={inviteGuestPhone}
                    onChange={(e) => setInviteGuestPhone(e.target.value)}
                    placeholder="Optional"
                    className="rounded-sm bg-background border-slate-700 text-gray-100 placeholder:text-gray-400 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label
                  htmlFor="inviteGuestEmail"
                  className="text-gray-200 text-xs sm:text-sm"
                >
                  Email Address *
                </Label>
                <Input
                  id="inviteGuestEmail"
                  type="email"
                  value={inviteGuestEmail}
                  onChange={(e) => setInviteGuestEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="rounded-sm bg-background border-slate-700 text-gray-100 placeholder:text-gray-400 text-sm"
                />
              </div>
              <div>
                <Label
                  htmlFor="inviteTicketCount"
                  className="text-gray-200 text-xs sm:text-sm"
                >
                  Number of Tickets
                </Label>
                <Input
                  id="inviteTicketCount"
                  type="number"
                  min={1}
                  max={10}
                  value={inviteTicketCount}
                  onChange={(e) =>
                    setInviteTicketCount(
                      Math.max(1, Math.min(10, parseInt(e.target.value) || 1)),
                    )
                  }
                  className="rounded-sm bg-background border-slate-700 text-gray-100 text-sm w-24"
                />
              </div>
              {selectedEvent && (
                <div className="bg-purple-900/30 p-3 rounded-sm border border-purple-700">
                  <h4 className="font-medium mb-2 text-purple-100 text-sm">
                    Event
                  </h4>
                  <div className="text-xs sm:text-sm text-purple-200">
                    {events.find((e) => e.event_id === selectedEvent)
                      ?.event_title || "Selected Event"}
                  </div>
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsInviteDialogOpen(false);
                    setInviteGuestName("");
                    setInviteGuestEmail("");
                    setInviteGuestPhone("");
                    setInviteTicketCount(1);
                  }}
                  className="rounded-sm border-slate-700 text-gray-100 hover:bg-card/70 w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInviteGuest}
                  disabled={
                    inviteLoading ||
                    !inviteGuestEmail.trim() ||
                    !inviteGuestName.trim()
                  }
                  className="rounded-sm bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  {inviteLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send ticket
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
