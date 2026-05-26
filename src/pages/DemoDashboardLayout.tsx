import React from "react";
import { Link } from "react-router-dom";
import { Outlet } from "react-router-dom";
import TopTaskbar from "@/components/TopTaskbar";
import { Button } from "@/components/ui/button";
import { getExternalSalesUrlForOffer } from "@/config/offers";

/** Public marketing demo — client view only (Sites), no login required. */
const DemoDashboardLayout: React.FC = () => {
  const partnerCheckoutUrl = getExternalSalesUrlForOffer("monitoring");

  return (
    <div className="min-h-screen bg-background">
      <TopTaskbar
        subtitle="Client view · live demo site"
        rightActions={
          <>
            <Button asChild variant="outline" className="border-border">
              <Link to="/login?source=demo">Client login</Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <a href={partnerCheckoutUrl} target="_blank" rel="noreferrer">
                Book on Crown Technologies
              </a>
            </Button>
          </>
        }
      />

      <div className="border-b border-border bg-muted/40 px-4 py-2 sm:px-6">
        <p className="mx-auto max-w-[1600px] text-center text-xs text-muted-foreground sm:text-left">
          <span className="font-medium text-foreground">Demo mode</span> — read-only client view of a real site
          (machines, ERF map, buildings). Log in for your own dashboard and settings.
        </p>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-border bg-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DemoDashboardLayout;
