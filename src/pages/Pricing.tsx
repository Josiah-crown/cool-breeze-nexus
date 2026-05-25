import React from "react";
import TopTaskbar from "@/components/TopTaskbar";
import PricingPlansSection from "@/components/PricingPlansSection";

const Pricing: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopTaskbar subtitle="Pricing" />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12">
        <PricingPlansSection intro="full" deviceQtyInputId="pricing-device-qty" />
      </main>
    </div>
  );
};

export default Pricing;
