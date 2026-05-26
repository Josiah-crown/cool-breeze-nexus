import React from "react";
import { Outlet } from "react-router-dom";
import TopTaskbar from "@/components/TopTaskbar";
import { Button } from "@/components/ui/button";

const CROWN_CONTACT_URL = "https://crowntechnologies.co.za/contact-us";

/** Public marketing demo — client view only (Sites), no login required. */
const DemoDashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopTaskbar
        subtitle="Client view · live demo site"
        logoHref="/dashboard/demo"
        rightActions={
          <Button asChild className="bg-foreground text-primary-foreground hover:bg-foreground/90">
            <a href={CROWN_CONTACT_URL} target="_blank" rel="noreferrer">
              Contact us
            </a>
          </Button>
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
