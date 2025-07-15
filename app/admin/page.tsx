"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

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

export default function AdminPage() {
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
      loadPurchases();
    }
  }, []);

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
        loadPurchases();
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
      const { data, error } = await supabase.rpc("get_admin_purchases");
      if (error) {
        toast.error("Failed to load purchases");
        console.error("Error loading purchases:", error);
      } else {
        setPurchases(data || []);
      }
    } catch (error) {
      toast.error("Failed to load purchases");
      console.error("Error loading purchases:", error);
    } finally {
      setLoading(false);
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
          <Badge className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 rounded-sm min-w-[80px] justify-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case "DISPATCH_FAILED":
        return (
          <Badge className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 rounded-sm min-w-[80px] justify-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "DISPATCH_IN_PROGRESS":
        return (
          <Badge className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700 rounded-sm min-w-[80px] justify-center">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "PENDING_DISPATCH":
        return (
          <Badge className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 rounded-sm min-w-[80px] justify-center">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "NOT_INITIATED":
        return (
          <Badge className="bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 rounded-sm min-w-[80px] justify-center">
            Not Initiated
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 rounded-sm min-w-[80px] justify-center">
            Unknown
          </Badge>
        );
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 rounded-sm">
            Paid
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700 rounded-sm">
            Pending
          </Badge>
        );
      case "payment_failed":
        return (
          <Badge className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 rounded-sm">
            Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-zinc-900/90 dark:bg-black/50 text-zinc-100 dark:text-sage-100 border-zinc-800 rounded-sm">
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

  const filteredPurchases = purchases.filter(
    (purchase) =>
      purchase.customer_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      purchase.customer_email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      purchase.event_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.purchase_id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-sm border-slate-700">
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Admin panel</h1>
            <p className="text-gray-300">Manage purchases and email dispatch</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="rounded-sm border-slate-700 text-gray-100 hover:bg-slate-800"
          >
            <X className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Search and Actions */}
        <Card className="mb-6 rounded-sm border-slate-700 bg-background">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search" className="text-gray-200">
                  Search purchases
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="search"
                    placeholder="Search by name, email, event, or purchase ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-sm bg-background border-slate-700 text-gray-100 placeholder:text-gray-400"
                  />
                  <Button
                    onClick={searchPurchases}
                    variant="outline"
                    size="sm"
                    className="rounded-sm border-slate-700 text-gray-100 hover:bg-slate-800 h-10 px-3"
                    disabled={loading}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                onClick={loadPurchases}
                variant="outline"
                className="rounded-sm border-slate-700 text-gray-100 hover:bg-slate-800"
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                onClick={downloadCSV}
                variant="outline"
                className="rounded-sm border-slate-700 text-gray-100 hover:bg-slate-800"
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Purchases Table */}
        <Card className="rounded-sm border-slate-700 bg-background">
          <CardHeader>
            <CardTitle className="text-gray-100">
              Purchases ({filteredPurchases.length})
            </CardTitle>
            <CardDescription className="text-gray-300">
              Manage customer purchases and email dispatch status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No purchases found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-3 text-gray-200">
                          Customer
                        </th>
                        <th className="text-left p-3 text-gray-200">Event</th>
                        <th className="text-left p-3 text-gray-200">Payment</th>
                        <th className="text-left p-3 text-gray-200">
                          Email Status
                        </th>
                        <th className="text-left p-3 text-gray-200">
                          Email Sent
                        </th>
                        <th className="text-left p-3 text-gray-200">
                          Verified
                        </th>
                        <th className="text-left p-3 text-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.map((purchase) => {
                        const EmailIcon = getEmailButtonIcon(purchase);
                        return (
                          <tr
                            key={purchase.purchase_id}
                            className="border-b border-slate-700 hover:bg-slate-800/50"
                          >
                            <td className="p-3">
                              <div>
                                <div className="font-medium text-gray-100">
                                  {purchase.customer_name}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {purchase.customer_email}
                                </div>
                                {purchase.customer_phone && (
                                  <div className="text-sm text-gray-400">
                                    {purchase.customer_phone}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div>
                                <div className="font-medium text-gray-100">
                                  {purchase.event_title}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {purchase.ticket_name} x {purchase.quantity}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {purchase.total_amount}{" "}
                                  {purchase.currency_code}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              {getPaymentStatusBadge(purchase.status)}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {getStatusBadge(purchase.email_dispatch_status)}
                                {purchase.email_dispatch_attempts > 0 && (
                                  <div className="text-xs text-gray-400">
                                    Attempts: {purchase.email_dispatch_attempts}
                                  </div>
                                )}
                                {purchase.email_dispatch_error && (
                                  <div
                                    className="w-4 h-4 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 cursor-help"
                                    title={purchase.email_dispatch_error}
                                  >
                                    <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-400">
                                {formatRelativeTime(
                                  purchase.pdf_ticket_sent_at,
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-400">
                                {purchase.is_used ? (
                                  <div>
                                    <div className="text-green-400">✓ Used</div>
                                    <div>
                                      {formatRelativeTime(purchase.used_at)}
                                    </div>
                                    {purchase.verified_by && (
                                      <div className="text-xs">
                                        by {purchase.verified_by}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-orange-400">
                                    Not used
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <Button
                                size="sm"
                                onClick={() => openEmailDialog(purchase)}
                                className="rounded-sm bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
                                disabled={!canSendEmail(purchase)}
                              >
                                <EmailIcon className="h-4 w-4 mr-2" />
                                {getEmailButtonText(purchase)}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {filteredPurchases.map((purchase) => {
                    const EmailIcon = getEmailButtonIcon(purchase);
                    return (
                      <Card
                        key={purchase.purchase_id}
                        className="rounded-sm border-slate-700 bg-background"
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Customer Info */}
                            <div>
                              <div className="font-medium text-gray-100">
                                {purchase.customer_name}
                              </div>
                              <div className="text-sm text-gray-400">
                                {purchase.customer_email}
                              </div>
                            </div>

                            {/* Event Info */}
                            <div>
                              <div className="font-medium text-gray-100 text-sm">
                                {purchase.event_title}
                              </div>
                              <div className="text-sm text-gray-400">
                                {purchase.ticket_name} x {purchase.quantity} •{" "}
                                {purchase.total_amount} {purchase.currency_code}
                              </div>
                            </div>

                            {/* Status Row */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {getPaymentStatusBadge(purchase.status)}
                                {getStatusBadge(purchase.email_dispatch_status)}
                              </div>
                              {purchase.email_dispatch_attempts > 0 && (
                                <div className="text-xs text-gray-400">
                                  Attempts: {purchase.email_dispatch_attempts}
                                </div>
                              )}
                            </div>

                            {/* Timestamps */}
                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                              <div>
                                <div className="font-medium">Email Sent</div>
                                <div>
                                  {formatRelativeTime(
                                    purchase.pdf_ticket_sent_at,
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="font-medium">Ticket Status</div>
                                <div
                                  className={
                                    purchase.is_used
                                      ? "text-green-400"
                                      : "text-orange-400"
                                  }
                                >
                                  {purchase.is_used ? "✓ Used" : "Not used"}
                                </div>
                                {purchase.is_used && (
                                  <div>
                                    {formatRelativeTime(purchase.used_at)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => openEmailDialog(purchase)}
                                className="flex-1 rounded-sm bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={!canSendEmail(purchase)}
                              >
                                <EmailIcon className="h-4 w-4 mr-2" />
                                {getEmailButtonText(purchase)}
                              </Button>
                              {purchase.email_dispatch_error && (
                                <div
                                  className="w-9 h-9 flex items-center justify-center rounded-sm bg-red-100 dark:bg-red-900/30 cursor-help"
                                  title={purchase.email_dispatch_error}
                                >
                                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </div>
                              )}
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
          <DialogContent className="rounded-sm border-slate-700 bg-background">
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newName" className="text-gray-200">
                      Customer Name
                    </Label>
                    <Input
                      id="newName"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter correct name"
                      className="rounded-sm bg-background border-slate-700 text-gray-100 placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPhone" className="text-gray-200">
                      Phone Number
                    </Label>
                    <Input
                      id="newPhone"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="Enter correct phone"
                      className="rounded-sm bg-background border-slate-700 text-gray-100 placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="newEmail" className="text-gray-200">
                    Email Address
                  </Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter correct email"
                    className="rounded-sm bg-background border-slate-700 text-gray-100 placeholder:text-gray-400"
                  />
                </div>
                <div className="bg-slate-800/50 p-4 rounded-sm border border-slate-700">
                  <h4 className="font-medium mb-2 text-gray-100">
                    Purchase Details
                  </h4>
                  <div className="text-sm space-y-1 text-gray-300">
                    <div>Event: {selectedPurchase.event_title}</div>
                    <div>
                      Ticket: {selectedPurchase.ticket_name} x{" "}
                      {selectedPurchase.quantity}
                    </div>
                    <div>
                      Amount: {selectedPurchase.total_amount}{" "}
                      {selectedPurchase.currency_code}
                    </div>
                    <div>Purchase ID: {selectedPurchase.purchase_id}</div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEmailDialogOpen(false)}
                    className="rounded-sm border-slate-700 text-gray-100 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEmailAction}
                    disabled={emailActionLoading || !newEmail.trim()}
                    className="rounded-sm"
                  >
                    {emailActionLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
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
      </div>
    </div>
  );
}
