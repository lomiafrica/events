"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import supabase from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/Bouncer";

interface Purchase {
    purchase_id: string;
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    event_id: string;
    event_title: string;
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

interface VerificationError {
    id: string;
    ticket_identifier: string;
    event_id: string;
    event_title: string;
    attempt_timestamp: string;
    error_code: string;
    error_message: string;
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
    const [verificationErrors, setVerificationErrors] = useState<VerificationError[]>([]);

    // New: Status filter (defaults to 'paid' only)
    const [statusFilter, setStatusFilter] = useState<string>("paid");
    const [showFilters, setShowFilters] = useState(false);

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

    // Download CSV function
    const downloadCSV = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.rpc("export_admin_purchases_csv");

            if (error) {
                toast.error("Failed to export data");
                console.error("Export error:", error);
                return;
            }

            if (!data || data.length === 0) {
                toast.error("No data to export");
                return;
            }

            // Convert to CSV
            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(","),
                ...data.map((row: Record<string, unknown>) =>
                    headers
                        .map(
                            (header) => `"${String(row[header] || "").replace(/"/g, '""')}"`,
                        )
                        .join(","),
                ),
            ].join("\n");

            // Download file
            const blob = new Blob([csvContent], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `purchases-export-${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success("Data exported successfully!");
        } catch (error) {
            toast.error("Failed to export data");
            console.error("Download error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Check authentication on mount
    useEffect(() => {
        const authStatus = localStorage.getItem("admin_authenticated");
        if (authStatus === "true") {
            setIsAuthenticated(true);
            loadEvents();
            loadPurchases();
            loadVerificationErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reload data when selected event or status filter changes
    useEffect(() => {
        if (isAuthenticated) {
            loadPurchases();
            loadVerificationErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEvent, statusFilter, isAuthenticated]);

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
                loadPurchases();
                loadVerificationErrors();
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
        setLoading(true);
        try {
            if (selectedEvent) {
                // Load purchases for specific event
                const { data, error } = await supabase.rpc("get_admin_purchases_by_event", {
                    p_event_id: selectedEvent,
                });
                if (error) {
                    toast.error("Failed to load purchases");
                    console.error("Error loading purchases:", error);
                } else {
                    setPurchases(data || []);
                }
            } else {
                // Load all purchases
                const { data, error } = await supabase.rpc("get_admin_purchases");
                if (error) {
                    toast.error("Failed to load purchases");
                    console.error("Error loading purchases:", error);
                } else {
                    setPurchases(data || []);
                }
            }
        } catch (error) {
            toast.error("Failed to load purchases");
            console.error("Error loading purchases:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadEvents = async () => {
        try {
            const { data, error } = await supabase.rpc("get_admin_events_list");
            if (error) {
                console.error("Error loading events:", error);
            } else {
                setEvents(data || []);
            }
        } catch (error) {
            console.error("Error loading events:", error);
        }
    };

    const loadVerificationErrors = async () => {
        try {
            const { data, error } = await supabase.rpc("get_recent_verification_errors", {
                p_limit: 20,
                p_event_id: selectedEvent,
            });
            if (error) {
                console.error("Error loading verification errors:", error);
            } else {
                setVerificationErrors(data || []);
            }
        } catch (error) {
            console.error("Error loading verification errors:", error);
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
                toast.error("Failed to search purchases");
                console.error("Error searching purchases:", error);
            } else {
                setPurchases(data || []);
            }
        } catch (error) {
            toast.error("Failed to search purchases");
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
                    toast.error("Failed to update customer information");
                    console.error("Error updating customer:", updateError);
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
                toast.error("Failed to reset email status");
                console.error("Error resetting email status:", resetError);
                return;
            }

            // Trigger email send
            const { error: emailError } = await supabase.functions.invoke(
                "send-ticket-email",
                {
                    body: { purchase_id: selectedPurchase.purchase_id },
                },
            );

            if (emailError) {
                toast.error("Failed to send email");
                console.error("Error sending email:", emailError);
                return;
            }

            const isFirstTime =
                selectedPurchase.email_dispatch_status === "NOT_INITIATED" ||
                selectedPurchase.email_dispatch_attempts === 0;
            toast.success(
                isFirstTime ? "Email sent successfully!" : "Email resent successfully!",
            );
            setIsEmailDialogOpen(false);
            setSelectedPurchase(null);
            setNewEmail("");
            setNewName("");
            setNewPhone("");
            loadPurchases(); // Refresh the list
        } catch (error) {
            toast.error("Failed to send email");
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
        // Allow sending if payment is paid, or if it's pending but customer wants to receive the email anyway
        return purchase.status === "paid" || purchase.status === "pending_payment";
    };

    const getEmailButtonText = (purchase: Purchase) => {
        const isFirstTime =
            purchase.email_dispatch_status === "NOT_INITIATED" ||
            purchase.email_dispatch_attempts === 0;
        return isFirstTime ? "Send Email" : "Resend Email";
    };

    const getEmailButtonIcon = (purchase: Purchase) => {
        const isFirstTime =
            purchase.email_dispatch_status === "NOT_INITIATED" ||
            purchase.email_dispatch_attempts === 0;
        return isFirstTime ? Send : Mail;
    };

    // Filter purchases by status
    const filteredPurchases = purchases.filter((purchase) => {
        // Status filter
        if (statusFilter === "paid" && purchase.status !== "paid") return false;
        if (statusFilter === "all") return true;
        if (statusFilter === "pending" && purchase.status !== "pending_payment") return false;
        if (statusFilter === "failed" && purchase.status !== "payment_failed") return false;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return (
                purchase.customer_name?.toLowerCase().includes(query) ||
                purchase.customer_email?.toLowerCase().includes(query) ||
                purchase.event_title?.toLowerCase().includes(query) ||
                purchase.purchase_id.toLowerCase().includes(query)
            );
        }

        return true;
    });

    // Get current event stats
    const currentEventStats = selectedEvent
        ? events.find(e => e.event_id === selectedEvent)
        : null;

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
                                ticket sales for Kamayakoi events.
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

                {/* Event Filter and Stats - Mobile Optimized */}
                <div className="mb-6 sm:mb-8">
                    <Label className="text-zinc-200 font-medium text-xs sm:text-sm uppercase tracking-wider mb-3 sm:mb-4 block">
                        Event Filter
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <select
                            value={selectedEvent || ""}
                            onChange={(e) => setSelectedEvent(e.target.value || null)}
                            className="rounded-sm bg-card/30 backdrop-blur-sm border-slate-700 text-gray-100 h-10 sm:h-12 px-3 text-sm sm:text-base"
                        >
                            <option value="">All Events</option>
                            {events.map((event) => (
                                <option key={event.event_id} value={event.event_id}>
                                    {event.event_title}
                                </option>
                            ))}
                        </select>

                        {currentEventStats && (
                            <>
                                <Card className="rounded-sm border-slate-700 bg-blue-900/20">
                                    <CardContent className="p-2 sm:p-3">
                                        <div className="text-xs text-blue-300">Total Tickets</div>
                                        <div className="text-xl sm:text-2xl font-bold text-blue-100">{currentEventStats.total_tickets}</div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-sm border-slate-700 bg-green-900/20">
                                    <CardContent className="p-2 sm:p-3">
                                        <div className="text-xs text-green-300">Scanned</div>
                                        <div className="text-xl sm:text-2xl font-bold text-green-100">{currentEventStats.scanned_tickets}</div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-sm border-slate-700 bg-orange-900/20">
                                    <CardContent className="p-2 sm:p-3">
                                        <div className="text-xs text-orange-300">Remaining</div>
                                        <div className="text-xl sm:text-2xl font-bold text-orange-100">
                                            {(currentEventStats.total_tickets || 0) - (currentEventStats.scanned_tickets || 0)}
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </div>

                {/* Verification Errors - Mobile Optimized */}
                {verificationErrors.length > 0 && (
                    <Card className="rounded-sm border-red-700 bg-red-900/20 mb-6 sm:mb-8">
                        <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-6">
                            <CardTitle className="text-red-100 text-base sm:text-lg flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                                Recent Errors ({verificationErrors.length})
                            </CardTitle>
                            <CardDescription className="text-red-200 text-xs sm:text-sm">
                                Failed ticket scans
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                            <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                                {verificationErrors.slice(0, 5).map((error) => (
                                    <div key={error.id} className="bg-card/30 backdrop-blur-sm p-2 sm:p-3 rounded-sm border border-red-700/50">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs sm:text-sm font-medium text-gray-100 truncate">
                                                    {error.event_title || "Unknown Event"}
                                                </div>
                                                <div className="text-xs text-red-300 font-mono mt-1 truncate">
                                                    {error.ticket_identifier.substring(0, 8)}...
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {error.error_code}
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 whitespace-nowrap">
                                                {formatRelativeTime(error.attempt_timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

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
                        <div className={`space-y-3 ${showFilters ? 'block' : 'hidden sm:block'}`}>
                            {/* Status Filter */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <Button
                                    variant={statusFilter === "paid" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter("paid")}
                                    className="rounded-sm text-xs sm:text-sm"
                                >
                                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                    Paid Only
                                </Button>
                                <Button
                                    variant={statusFilter === "all" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter("all")}
                                    className="rounded-sm text-xs sm:text-sm"
                                >
                                    All Status
                                </Button>
                                <Button
                                    variant={statusFilter === "pending" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter("pending")}
                                    className="rounded-sm text-xs sm:text-sm"
                                >
                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                    Pending
                                </Button>
                                <Button
                                    variant={statusFilter === "failed" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter("failed")}
                                    className="rounded-sm text-xs sm:text-sm"
                                >
                                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                    Failed
                                </Button>
                            </div>

                            {/* Search and Actions */}
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                <div className="flex-1 flex gap-2">
                                    <Input
                                        id="search"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="rounded-sm bg-card/30 backdrop-blur-sm border-slate-700 text-gray-100 placeholder:text-gray-400 h-9 sm:h-12 flex-1 text-sm sm:text-base"
                                    />
                                    <Button
                                        onClick={searchPurchases}
                                        variant="outline"
                                        size="sm"
                                        className="rounded-sm border-slate-700 text-gray-100 hover:bg-card/70 h-9 sm:h-12 px-2 sm:px-3 shrink-0"
                                        disabled={loading}
                                    >
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={loadPurchases}
                                        variant="outline"
                                        size="sm"
                                        className="rounded-sm border-slate-700 text-gray-100 hover:bg-card/70 h-9 sm:h-12 px-2 sm:px-3 flex-1 sm:flex-none"
                                        disabled={loading}
                                    >
                                        <RefreshCw
                                            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                                        />
                                        <span className="ml-2 sm:hidden">Refresh</span>
                                    </Button>
                                    <Button
                                        onClick={downloadCSV}
                                        variant="outline"
                                        size="sm"
                                        className="rounded-sm border-slate-700 text-gray-100 hover:bg-card/70 h-9 sm:h-12 px-2 sm:px-3 flex-1 sm:flex-none"
                                        disabled={loading}
                                    >
                                        <Download className="h-4 w-4" />
                                        <span className="ml-2 sm:hidden">Export</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Purchases - Mobile-First Card View */}
                <Card className="rounded-sm border-slate-700 bg-card/30 backdrop-blur-sm">
                    <CardContent className="p-3 sm:p-6">
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
                                <p className="text-zinc-400 max-w-md mx-auto">
                                    Try adjusting your search or filters to find what you&apos;re looking for.
                                </p>
                            </motion.div>
                        ) : (
                            <div className="space-y-4">
                                {/* Desktop Table View - Hidden on Mobile */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-700/50">
                                                <th className="text-left p-4 text-zinc-400 font-medium text-sm uppercase tracking-wider">Customer</th>
                                                <th className="text-left p-4 text-zinc-400 font-medium text-sm uppercase tracking-wider">Event</th>
                                                <th className="text-left p-4 text-zinc-400 font-medium text-sm uppercase tracking-wider">Status</th>
                                                <th className="text-left p-4 text-zinc-400 font-medium text-sm uppercase tracking-wider">Email</th>
                                                <th className="text-left p-4 text-zinc-400 font-medium text-sm uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPurchases.map((purchase) => {
                                                const EmailIcon = getEmailButtonIcon(purchase);
                                                return (
                                                    <tr
                                                        key={purchase.purchase_id}
                                                        className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                                                    >
                                                        <td className="p-4">
                                                            <div>
                                                                <div className="font-medium text-gray-100">
                                                                    {purchase.customer_name}
                                                                </div>
                                                                <div className="text-sm text-gray-400">
                                                                    {purchase.customer_email}
                                                                </div>
                                                                {purchase.customer_phone && (
                                                                    <div className="text-sm text-gray-500">
                                                                        {purchase.customer_phone}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div>
                                                                <div className="font-medium text-gray-100">
                                                                    {purchase.event_title}
                                                                </div>
                                                                <div className="text-sm text-gray-400">
                                                                    {purchase.ticket_name} x {purchase.quantity}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {purchase.total_amount} {purchase.currency_code}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col gap-2">
                                                                {getPaymentStatusBadge(purchase.status)}
                                                                <div className="text-xs text-gray-500">
                                                                    {formatRelativeTime(purchase.created_at)}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                {getStatusBadge(purchase.email_dispatch_status)}
                                                                {purchase.email_dispatch_error && (
                                                                    <div
                                                                        className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/50 cursor-help"
                                                                        title={purchase.email_dispatch_error}
                                                                    >
                                                                        <AlertCircle className="w-3 h-3 text-red-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => openEmailDialog(purchase)}
                                                                className="rounded-sm bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-800/50"
                                                                disabled={!canSendEmail(purchase)}
                                                            >
                                                                <EmailIcon className="h-3.5 w-3.5 mr-2" />
                                                                {getEmailButtonText(purchase)}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View - Visible on Mobile */}
                                <div className="lg:hidden space-y-4">
                                    {filteredPurchases.map((purchase) => {
                                        const EmailIcon = getEmailButtonIcon(purchase);
                                        return (
                                            <Card
                                                key={purchase.purchase_id}
                                                className="rounded-sm border-slate-700 bg-card/30 backdrop-blur-sm"
                                            >
                                                <CardContent className="p-3 sm:p-4">
                                                    <div className="space-y-3">
                                                        {/* Header: Customer and Status */}
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-gray-100 text-sm sm:text-base truncate">
                                                                    {purchase.customer_name}
                                                                </div>
                                                                <div className="text-xs sm:text-sm text-gray-400 truncate">
                                                                    {purchase.customer_email}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-1 items-end">
                                                                {getPaymentStatusBadge(purchase.status)}
                                                                {purchase.is_used && (
                                                                    <Badge className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 rounded-sm text-xs">
                                                                        <QrCode className="h-3 w-3 mr-1" />
                                                                        Scanned
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Event Info */}
                                                        <div className="bg-muted/30 rounded-sm p-2">
                                                            <div className="text-xs font-medium text-gray-400 mb-1">
                                                                Event
                                                            </div>
                                                            <div className="text-sm font-medium text-gray-100">
                                                                {purchase.event_title}
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-1">
                                                                {purchase.ticket_name} × {purchase.quantity} • {purchase.total_amount} {purchase.currency_code}
                                                            </div>
                                                        </div>

                                                        {/* Email Status */}
                                                        <div className="flex items-center justify-between gap-2 text-xs">
                                                            <div className="flex items-center gap-2">
                                                                {getStatusBadge(purchase.email_dispatch_status)}
                                                                {purchase.pdf_ticket_sent_at && (
                                                                    <span className="text-gray-500">
                                                                        {formatRelativeTime(purchase.pdf_ticket_sent_at)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex gap-2 pt-2 border-t border-slate-700">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => openEmailDialog(purchase)}
                                                                className="rounded-sm bg-blue-600 hover:bg-blue-700 text-white flex-1 text-xs sm:text-sm"
                                                                disabled={!canSendEmail(purchase)}
                                                            >
                                                                <EmailIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                                                                {getEmailButtonText(purchase)}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Email Dialog */}
                <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                    <DialogContent className="rounded-sm border-slate-700 bg-background max-w-md mx-4">
                        <DialogHeader>
                            <DialogTitle className="text-gray-100">
                                {selectedPurchase &&
                                    (selectedPurchase.email_dispatch_status === "NOT_INITIATED" ||
                                        selectedPurchase.email_dispatch_attempts === 0)
                                    ? "Send Ticket Email"
                                    : "Resend Ticket Email"}
                            </DialogTitle>
                            <DialogDescription className="text-gray-300">
                                Update customer information and send the ticket email
                            </DialogDescription>
                        </DialogHeader>
                        {selectedPurchase && (
                            <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-200">
                                        Email Address
                                    </Label>
                                    <Input
                                        id="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder={selectedPurchase.customer_email}
                                        className="rounded-sm bg-background border-slate-700 text-gray-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-gray-200">
                                        Customer Name
                                    </Label>
                                    <Input
                                        id="name"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder={selectedPurchase.customer_name}
                                        className="rounded-sm bg-background border-slate-700 text-gray-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-gray-200">
                                        Phone Number (Optional)
                                    </Label>
                                    <Input
                                        id="phone"
                                        value={newPhone}
                                        onChange={(e) => setNewPhone(e.target.value)}
                                        placeholder={selectedPurchase.customer_phone || "No phone number"}
                                        className="rounded-sm bg-background border-slate-700 text-gray-100"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsEmailDialogOpen(false)}
                                        className="rounded-sm border-slate-700 text-gray-100 hover:bg-slate-800"
                                        disabled={emailActionLoading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleEmailAction}
                                        className="rounded-sm bg-blue-600 hover:bg-blue-700 text-white"
                                        disabled={emailActionLoading}
                                    >
                                        {emailActionLoading ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4 mr-2" />
                                                Send Email
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
