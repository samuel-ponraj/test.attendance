"use client";

import { useMemo } from "react";
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

export default function BillingOverviewChart({ teams = [] }) {
  const { chartData, totalPaid, totalBalance } = useMemo(() => {
    const rows = teams.map((team) => {
      const paid = getTeamBillingValue(team, "totalPaid");
      const balance = getTeamBillingValue(team, "totalBalance");

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
  }, [teams]);

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
          <div className="h-[340px] w-full">
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
                  formatter={(value, name) => [
                    formatCurrency(value),
                    name === "paid" ? "Total Paid" : "Total Balance",
                  ]}
                  labelFormatter={(label) => label}
                />
                <Legend />
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
