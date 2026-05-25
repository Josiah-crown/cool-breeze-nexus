import React from "react";
import { Link } from "react-router-dom";
import TopTaskbar from "@/components/TopTaskbar";
import PricingPlansSection from "@/components/PricingPlansSection";
import { Button } from "@/components/ui/button";
import { getExternalSalesUrlForOffer } from "@/config/offers";

const Home: React.FC = () => {
  const partnerCheckoutUrl = getExternalSalesUrlForOffer("monitoring");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopTaskbar subtitle="Machine monitoring by Crown Technologies" />

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-14">
          <div className="mx-auto max-w-2xl text-center">
            <div className="font-mono text-[11px] uppercase tracking-wider text-accent">Cmonitor</div>
            <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight sm:text-5xl">
              Manage your sites and machines from one place.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] font-light leading-relaxed text-muted-foreground">
              Cmonitor is Crown Technologies&apos; remote monitoring platform for evaporative coolers, heat pumps, and
              related HVAC equipment. See live status, historical trends, and fault alerts — organised by site so your
              team always knows what needs attention.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/dashboard">View demo dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="border-border">
                <Link to="/login?source=home">Client login</Link>
              </Button>
              <Button asChild variant="outline" className="border-border">
                <a href={partnerCheckoutUrl} target="_blank" rel="noreferrer">
                  Book on Crown Technologies
                </a>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Signed in? Your dashboard shows only your commissioned machines — no sample data mixed in.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="h-px bg-border" />
        </div>

        <section id="pricing" className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-12">
          <PricingPlansSection intro="compact" deviceQtyInputId="home-device-qty" />
        </section>
      </main>

      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-center sm:flex-row sm:text-left sm:px-6">
          <div className="text-sm font-semibold text-foreground">
            <span className="text-primary">C</span>monitor · Crown Technologies
          </div>
          <div className="text-xs text-muted-foreground">
            086 112 7696 · info@crowntechnologies.co.za ·{" "}
            <a
              className="text-foreground/80 hover:text-primary"
              href="https://crowntechnologies.co.za"
              target="_blank"
              rel="noreferrer"
            >
              crowntechnologies.co.za
            </a>
          </div>
          <Link className="text-xs text-muted-foreground hover:text-primary" to="/login?source=home">
            Client login
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Home;
