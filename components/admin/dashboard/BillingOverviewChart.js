"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CreditCard } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/firebase";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatTeamLabel = (value = "") => {
  const label = String(value || "Untitled team");
  return label.length > 16 ? `${label.slice(0, 15)}...` : label;
};

const getTeamBillingValue = (team, key) => {
  const value = team?.billing?.[key];
  return Number.isFinite(Number(value)) ? Number(value) : 0;
};

const getEffectiveBalance = (period) => {
  const amount = Number(period?.amount || 0);
  const paid = Number(period?.paid || 0);
  const discount = Number(period?.discountAmount || 0);

  return Math.max(amount - paid - discount, 0);
};

const getActivePeriods = (periods, config = {}) => {
  const cycle = config?.billingCycle;

  if (!cycle) return periods;

  if (cycle === "term") {
    const validTermKeys = new Set(
      (config?.academicYears || []).flatMap((yearItem) =>
        (yearItem.terms || []).map(
          (term) => `${yearItem.academicYear}_term_${term.termNo}`,
        ),
      ),
    );

    return periods.filter(
      (period) =>
        period.billingCycle === "term" && validTermKeys.has(period.periodKey),
    );
  }

  return periods.filter((period) => period.billingCycle === cycle);
};

export default function BillingOverviewChart({ teams = [] }) {
  const [billingRows, setBillingRows] = useState([]);

  useEffect(() => {
    let active = true;

    const loadBillingRows = async () => {
      if (!teams.length) {
        setBillingRows([]);
        return;
      }

      const rows = await Promise.all(
        teams.map(async (team) => {
          try {
            const membersSnap = await getDocs(
              collection(db, "teams", team.id, "members"),
            );

            const memberRows = await Promise.all(
              membersSnap.docs.map(async (memberSnap) => {
                const member = memberSnap.data();
                const periodsSnap = await getDocs(
                  collection(
                    db,
                    "teams",
                    team.id,
                    "members",
                    memberSnap.id,
                    "billingPeriods",
                  ),
                );
                const periods = periodsSnap.docs.map((periodSnap) =>
                  periodSnap.data(),
                );
                const activePeriods = getActivePeriods(
                  periods,
                  team.billingConfig,
                );

                if (activePeriods.length > 0) {
                  return {
                    paid: activePeriods.reduce(
                      (sum, period) => sum + Number(period.paid || 0),
                      0,
                    ),
                    balance: activePeriods.reduce(
                      (sum, period) => sum + getEffectiveBalance(period),
                      0,
                    ),
                  };
                }

                return {
                  paid: Number(member?.billing?.totalPaid || 0),
                  balance: Number(member?.billing?.totalBalance || 0),
                };
              }),
            );

            const paid = memberRows.reduce((sum, row) => sum + row.paid, 0);
            const balance = memberRows.reduce(
              (sum, row) => sum + row.balance,
              0,
            );

            return {
              id: team.id,
              name: team.name || "Untitled team",
              paid: paid || getTeamBillingValue(team, "totalPaid"),
              balance: balance || getTeamBillingValue(team, "totalBalance"),
            };
          } catch (error) {
            console.error("Failed to load team billing overview:", error);

            return {
              id: team.id,
              name: team.name || "Untitled team",
              paid: getTeamBillingValue(team, "totalPaid"),
              balance: getTeamBillingValue(team, "totalBalance"),
            };
          }
        }),
      );

      if (active) {
        setBillingRows(rows);
      }
    };

    loadBillingRows();

    return () => {
      active = false;
    };
  }, [teams]);

  const { chartData, totalPaid, totalBalance } = useMemo(() => {
    const rows = teams.map((team) => {
      const billingRow = billingRows.find((row) => row.id === team.id);
      const paid = billingRow?.paid ?? getTeamBillingValue(team, "totalPaid");
      const balance =
        billingRow?.balance ?? getTeamBillingValue(team, "totalBalance");

      return {
        name: team.name || "Untitled team",
        paid,
        balance,
      };
    });

    return {
      chartData: rows,
      totalPaid: rows.reduce((sum, row) => sum + row.paid, 0),
      totalBalance: rows.reduce((sum, row) => sum + row.balance, 0),
    };
  }, [billingRows, teams]);

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Billing Overview</CardTitle>
          </div>
          <CardDescription>
            Total paid and total balance across all available teams.
          </CardDescription>
        </div>

        <div className="grid grid-cols-2 gap-3 text-right">
          <div className="rounded-md border px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-lg font-semibold text-emerald-600">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="rounded-md border px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Balance</p>
            <p className="text-lg font-semibold text-red-600">
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            No teams available.
          </div>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 12, right: 16, left: 8, bottom: 48 }}
                
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={64}
                  tickFormatter={formatTeamLabel}
                />
                <YAxis tickFormatter={formatCurrency} width={86} />
                <Tooltip
                  formatter={(value, name, item) => [
                    formatCurrency(value),
                    item?.dataKey === "paid" || name === "Total Paid"
                      ? "Total Paid"
                      : "Total Balance",
                  ]}
                  labelFormatter={(label) => label}
                />
                <Legend wrapperStyle={{ paddingTop: 50 }} />
                <Bar
                  dataKey="paid"
                  name="Total Paid"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="balance"
                  name="Total Balance"
                  fill="#dc2626"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


