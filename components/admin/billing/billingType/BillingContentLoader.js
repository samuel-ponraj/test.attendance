"use client";

import { Loader2 } from "lucide-react";

const BillingContentLoader = () => {
  return (
    <div className="flex min-h-[320px] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
};

export default BillingContentLoader;
