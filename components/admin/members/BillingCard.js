import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const BillingCard = ({ billing, config }) => {

  const formatCurrency = (val) => `₹${val || 0}`;

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Billing & Fees</CardTitle>
        <div className="flex gap-2">
          {billing?.isOverdue && (
            <Badge variant="destructive" className="animate-pulse">Overdue</Badge>
          )}
          <Badge variant={billing?.totalPending > 0 ? "outline" : "secondary"}>
            {billing?.totalPending > 0 ? "Payment Due" : "Settled"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 ">
        {/* 1. Status Overview Snapshot */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 p-3 rounded-xl border bg-muted/30">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Pending</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(billing?.totalPending)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Paid</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(billing?.totalPaid)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cycle</p>
            <p className="text-lg font-bold capitalize">{config?.billingCycle || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rate</p>
            <p className="text-lg font-bold">{formatCurrency(config?.baseAmount)}</p>
          </div>
        </div>

        {/* 2. Detailed Configuration Fields (Disabled) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Fee per Individual</Label>
            <Input 
              value={`${formatCurrency(config?.baseAmount)} per ${config?.billingCycle || 'cycle'}`} 
              disabled 
              className="bg-muted/50 font-medium opacity-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Billing Frequency</Label>
            <Input 
              value={config?.billingCycle?.toUpperCase() || 'NOT CONFIGURED'} 
              disabled 
              className="bg-muted/50 font-medium opacity-100"
            />
          </div>

          {config?.billingCycle === 'term' && (
             <div className="space-y-2">
                <Label className="text-muted-foreground">Term Breakdown</Label>
                <Input 
                  value={`${config?.termDetails?.divisionsPerYear || 1} Terms per year`} 
                  disabled 
                  className="bg-muted/50 font-medium opacity-100"
                />
             </div>
          )}

          <div className="space-y-2">
            <Label className="text-muted-foreground">Last Payment Date</Label>
            <Input 
              value={billing?.lastPaymentDate ? new Date(billing.lastPaymentDate.seconds * 1000).toLocaleDateString() : "No payments recorded"} 
              disabled 
              className="bg-muted/50 font-medium opacity-100"
            />
          </div>
        </div>

        {/* 3. Logic Explanation Footer */}
        <div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
          <p>
            * These settings are managed at the Team Level. Charges are applied 
            <b> {config?.billingCycle}ly </b> based on the total member count at the time of invoicing.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default BillingCard