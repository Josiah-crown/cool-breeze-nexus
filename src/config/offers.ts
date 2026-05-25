export type OfferPricing =
  | { type: "custom_quote" }
  | { type: "per_device_monthly"; currency: "ZAR"; amountPerDevice: number; minimumDevices?: number };

export type Offer = {
  id: "monitoring" | "essential_sla" | "comfort_sla";
  name: string;
  tagline: string;
  description: string;
  pricing: OfferPricing;
  includedBullets: string[];
  purchasableOnline: boolean;
};

export const OFFERS: Offer[] = [
  {
    id: "monitoring",
    name: "Monitoring",
    tagline: "Live dashboard access for your machines.",
    description:
      "Cmonitor provides real-time visibility, fault detection, and historical trends for each supported unit on your site. Crown Technologies monitors remotely and contacts you when something needs attention.",
    pricing: { type: "per_device_monthly", currency: "ZAR", amountPerDevice: 99, minimumDevices: 1 },
    includedBullets: [
      "Live dashboard access for your machines",
      "Real-time readings and historical data",
      "Fault detection and Crown Technologies notification",
      "Configurable alert thresholds per device",
      "Client account and login included",
    ],
    // June 1: this is the simplest SKU to sell online.
    purchasableOnline: true,
  },
  {
    id: "essential_sla",
    name: "Essential SLA",
    tagline: "Maintenance plan with priority scheduling.",
    description:
      "Scheduled maintenance with clear priority breakdown scheduling. Recommended for sites that want predictable upkeep and preferential scheduling without full breakdown cover.",
    pricing: { type: "custom_quote" },
    includedBullets: [
      "Scheduled maintenance visits (scope per site)",
      "Priority scheduling breakdown",
      "Monitoring can be added per device",
      "Reporting and service history",
      "Escalation path for urgent issues",
    ],
    purchasableOnline: false,
  },
  {
    id: "comfort_sla",
    name: "Comfort SLA",
    tagline: "Full cover: maintenance + monitoring + breakdowns.",
    description:
      "Full SLA including scheduled maintenance, remote monitoring, and breakdown response/repairs as defined per site. Built for operations that cannot afford downtime.",
    pricing: { type: "custom_quote" },
    includedBullets: [
      "Scheduled maintenance",
      "Remote monitoring",
      "Breakdown response and repairs (per agreement)",
      "Priority technician response",
      "Single accountability: one partner, one call",
    ],
    purchasableOnline: false,
  },
];

export function getOfferById(id: Offer["id"]): Offer {
  const offer = OFFERS.find((o) => o.id === id);
  if (!offer) throw new Error(`Unknown offer id: ${id}`);
  return offer;
}

/** Crown Technologies booking / sales entry (monitoring purchases hand off here). */
const DEFAULT_PARTNER_STOREFRONT = "https://crowntechnologies.co.za/booking";

/**
 * Crown Technologies site where assessment booking and sales run (not on Cmonitor).
 * Set `VITE_PARENT_CHECKOUT_URL` in `.env` to override (e.g. staging URL).
 * Appends `?offer=<id>` (or `&offer=` if the base URL already has a query string).
 */
export function getExternalSalesUrlForOffer(offerId: Offer["id"] | string): string {
  const raw = import.meta.env.VITE_PARENT_CHECKOUT_URL?.trim();
  const base = raw && raw.length > 0 ? raw.replace(/\/$/, "") : DEFAULT_PARTNER_STOREFRONT;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}offer=${encodeURIComponent(offerId)}`;
}

