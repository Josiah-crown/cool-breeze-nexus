import React from "react";
import { Link } from "react-router-dom";
import TopTaskbar from "@/components/TopTaskbar";
import { Button } from "@/components/ui/button";

/**
 * Legacy URL: Paystack used to return here with `?reference=`.
 * Purchases now complete on the Crown Technologies website; this page explains that and points users onward.
 */
const CheckoutSuccess: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopTaskbar subtitle="Purchase" />

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow)]">
          <div className="font-mono text-[11px] uppercase tracking-wider text-accent">Checkout</div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Thank you</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Checkout and payment happen on the Crown Technologies website. After a successful payment, your{" "}
            <span className="font-medium text-foreground">AirComms account</span> is created automatically—check your email
            for an invite to set a password, then sign in here to use <span className="font-medium text-foreground">Cmonitor</span> monitoring and complete{" "}
            <span className="font-medium text-foreground">Account</span> (profile and agreements).
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-foreground text-primary-foreground hover:bg-foreground/90">
              <Link to="/pricing">View pricing</Link>
            </Button>
            <Button asChild variant="outline" className="border-black/20">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutSuccess;
