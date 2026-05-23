"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit as limitResults,
  orderBy,
  query,
} from "firebase/firestore";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Loader2,
  ReceiptIndianRupee,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebase";

const timestampToMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  return 0;
};

const formatDateTime = (timestamp) => {
  const millis = timestampToMillis(timestamp);

  if (!millis) return "Date N/A";

  return new Date(millis).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAmount = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const normalizePaymentMode = (mode = "") =>
  String(mode || "unknown").replace(/_/g, " ");

const getStatusClassName = (status = "") => {
  const normalized = String(status || "success").toLowerCase();

  if (["failed", "cancelled"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
  }

  if (["pending", "created", "partial"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
};

export default function TransactionsTable({
  teams = [],
  limit = 5,
  paginated = false,
  showViewAll = false,
  title = "Recent Transactions",
  description = "Latest payments recorded across all teams.",
}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    teamId: "all",
    paymentMode: "all",
    status: "all",
  });

  const teamLookup = useMemo(
    () =>
      teams.reduce((lookup, team) => {
        lookup[team.id] = team;
        return lookup;
      }, {}),
    [teams],
  );

  useEffect(() => {
    let active = true;

    const loadTransactions = async () => {
      if (!teams.length) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const paymentGroups = await Promise.all(
          teams.map(async (team) => {
            const paymentsRef = collection(db, "teams", team.id, "payments");
            const paymentsQuery = limit
              ? query(
                  paymentsRef,
                  orderBy("createdAt", "desc"),
                  limitResults(limit),
                )
              : query(paymentsRef, orderBy("createdAt", "desc"));
            const snap = await getDocs(paymentsQuery);

            return snap.docs.map((docSnap) => ({
              id: docSnap.id,
              teamId: team.id,
              teamName: team.name || "Untitled team",
              ...docSnap.data(),
            }));
          }),
        );

        const sortedTransactions = paymentGroups
          .flat()
          .sort(
            (a, b) =>
              timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt),
          );

        if (active) {
          setTransactions(
            limit ? sortedTransactions.slice(0, limit) : sortedTransactions,
          );
        }
      } catch (error) {
        console.error("Failed to load transactions:", error);

        if (active) {
          setTransactions([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadTransactions();

    return () => {
      active = false;
    };
  }, [limit, teams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, rowsPerPage, teams]);

  const paymentModeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .map((transaction) => String(transaction.paymentMode || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [transactions],
  );

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .map((transaction) =>
              String(transaction.status || "success").trim(),
            )
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [transactions],
  );

  const filteredTransactions = useMemo(() => {
    const fromMillis = filters.fromDate
      ? new Date(`${filters.fromDate}T00:00:00`).getTime()
      : 0;
    const toMillis = filters.toDate
      ? new Date(`${filters.toDate}T23:59:59.999`).getTime()
      : 0;

    return transactions.filter((transaction) => {
      const createdAtMillis = timestampToMillis(transaction.createdAt);
      const paymentMode = String(transaction.paymentMode || "");
      const status = String(transaction.status || "success");

      if (fromMillis && (!createdAtMillis || createdAtMillis < fromMillis)) {
        return false;
      }

      if (toMillis && (!createdAtMillis || createdAtMillis > toMillis)) {
        return false;
      }

      if (filters.teamId !== "all" && transaction.teamId !== filters.teamId) {
        return false;
      }

      if (
        filters.paymentMode !== "all" &&
        paymentMode.toLowerCase() !== filters.paymentMode.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.status !== "all" &&
        status.toLowerCase() !== filters.status.toLowerCase()
      ) {
        return false;
      }

      return true;
    });
  }, [filters, transactions]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      teamId: "all",
      paymentMode: "all",
      status: "all",
    });
  };

  const totalRows = filteredTransactions.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const visibleTransactions = paginated
    ? filteredTransactions.slice(startIndex, startIndex + rowsPerPage)
    : filteredTransactions;

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ReceiptIndianRupee className="h-5 w-5 text-primary" />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </div>

        {showViewAll && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/admin/transactions">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {paginated && (
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div className="space-y-2">
                <Label htmlFor="transaction-from-date">From Date</Label>
                <Input
                  id="transaction-from-date"
                  type="date"
                  value={filters.fromDate}
                  onChange={(event) =>
                    updateFilter("fromDate", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-to-date">To Date</Label>
                <Input
                  id="transaction-to-date"
                  type="date"
                  value={filters.toDate}
                  onChange={(event) =>
                    updateFilter("toDate", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Team</Label>
                <Select
                  value={filters.teamId}
                  onValueChange={(value) => updateFilter("teamId", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name || "Untitled team"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select
                  value={filters.paymentMode}
                  onValueChange={(value) =>
                    updateFilter("paymentMode", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    {paymentModeOptions.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {normalizePaymentMode(mode)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => updateFilter("status", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  className="w-full"
                  onClick={clearFilters}
                >
                  Clear Filter
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No transactions recorded yet.
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No transactions match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                visibleTransactions.map((transaction) => {
                  const team = teamLookup[transaction.teamId];
                  const teamName =
                    transaction.teamName || team?.name || "Untitled team";
                  const memberName =
                    transaction.memberName || "Unknown member";
                  const memberHref = transaction.memberId
                    ? `/admin/teams/${transaction.teamId}/members/${transaction.memberId}`
                    : `/admin/teams/${transaction.teamId}/billing`;

                  return (
                    <TableRow key={`${transaction.teamId}_${transaction.id}`}>
                      <TableCell className="font-medium">
                        {formatDateTime(transaction.createdAt)}
                      </TableCell>

                      <TableCell>
                        <Button
                          asChild
                          variant="link"
                          className="h-auto p-0 text-foreground"
                        >
                          <Link href={memberHref}>
                            {memberName}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>

                      <TableCell>
                        <Button
                          asChild
                          variant="link"
                          className="h-auto p-0 text-foreground"
                        >
                          <Link href={`/admin/teams/${transaction.teamId}`}>
                            {teamName}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {transaction.periodLabel ||
                            transaction.period ||
                            "General"}
                        </Badge>
                      </TableCell>

                      <TableCell className="capitalize">
                        {normalizePaymentMode(transaction.paymentMode).toUpperCase()}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusClassName(transaction.status)}
                        >
                          {transaction.status || "success"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right font-semibold">
                        {formatAmount(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {paginated && totalRows > 0 && (
          <div className="flex flex-col gap-3 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground">
              Showing {startIndex + 1} to{" "}
              {Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows}{" "}
              transactions
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Rows per page</span>
                <Select
                  value={`${rowsPerPage}`}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue placeholder={rowsPerPage} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="font-medium">
                Page {safeCurrentPage} of {totalPages || 1}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden size-8 sm:inline-flex"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(page - 1, 1))
                  }
                  disabled={safeCurrentPage === 1}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(page + 1, totalPages))
                  }
                  disabled={safeCurrentPage === totalPages || totalPages === 0}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden size-8 sm:inline-flex"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages || totalPages === 0}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
