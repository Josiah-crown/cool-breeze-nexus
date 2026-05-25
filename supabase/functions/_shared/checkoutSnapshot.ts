// Shared: partner checkout → Cmonitor profile fields (no card data).

export type CheckoutSnapshot = {
  email: string;
  name?: string;
  cell_number?: string;
  full_name_business?: string;
  country?: string;
  state?: string;
  city?: string;
  street?: string;
  suburb?: string;
  po_box?: string;
  /** Facility / site label from partner form */
  site_name?: string;
  /** Single-line site address when partner does not split address fields */
  site_address?: string;
  /** Partner channel identifier, e.g. aircomms */
  source?: string;
};

export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (!e || !e.includes("@")) return null;
  return e;
}

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

export function isBlank(v: unknown): boolean {
  return v == null || String(v).trim() === "";
}

/** Parse `customer` object from partner / paystack-init body. */
export function parseCheckoutSnapshot(body: Record<string, unknown>): CheckoutSnapshot | null {
  const customer = (body.customer ?? body.checkout ?? body) as Record<string, unknown>;
  const email = normalizeEmail(
    str(customer.email ?? body.email ?? ""),
  );
  if (!email) return null;

  const name = str(customer.name ?? customer.full_name ?? body.name);
  const siteAddress = str(customer.site_address ?? customer.siteAddress ?? body.site_address);
  const streetRaw = str(customer.street ?? body.street);
  const street = streetRaw || siteAddress;

  const siteName = str(customer.site_name ?? customer.siteName ?? body.site_name);
  const business = str(
    customer.full_name_business ??
      customer.business_name ??
      body.full_name_business ??
      siteName,
  );

  return {
    email,
    name: name || undefined,
    cell_number: str(customer.cell_number ?? customer.phone ?? body.cell_number) || undefined,
    full_name_business: business || undefined,
    country: str(customer.country ?? body.country) || undefined,
    state: str(customer.state ?? customer.province ?? body.state) || undefined,
    city: str(customer.city ?? body.city) || undefined,
    street: street || undefined,
    suburb: str(customer.suburb ?? body.suburb) || undefined,
    po_box: str(customer.po_box ?? customer.poBox ?? body.po_box) || undefined,
    site_name: siteName || undefined,
    site_address: siteAddress || undefined,
    source: str(customer.source ?? body.source) || undefined,
  };
}

export function displayNameFromSnapshot(snap: CheckoutSnapshot): string {
  if (snap.name) return snap.name;
  if (snap.full_name_business) return snap.full_name_business;
  const local = snap.email.split("@")[0];
  return local || "User";
}

type ProfileLike = {
  name?: string | null;
  email?: string | null;
  cell_number?: string | null;
  full_name_business?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  street?: string | null;
  suburb?: string | null;
  po_box?: string | null;
};

/** Build profile row fields from snapshot. `provision` fills all snapshot values; `merge` only empty columns. */
export function profilePatchFromSnapshot(
  snap: CheckoutSnapshot,
  existing: ProfileLike | null,
  mode: "provision" | "merge",
): Record<string, string> {
  const candidates: Record<string, string | undefined> = {
    email: snap.email,
    name: snap.name ?? displayNameFromSnapshot(snap),
    cell_number: snap.cell_number,
    full_name_business: snap.full_name_business ?? snap.site_name,
    country: snap.country,
    state: snap.state,
    city: snap.city,
    street: snap.street ?? snap.site_address,
    suburb: snap.suburb,
    po_box: snap.po_box,
  };

  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(candidates)) {
    if (!value) continue;
    if (mode === "provision") {
      patch[key] = value;
    } else {
      const cur = existing ? (existing as Record<string, unknown>)[key] : null;
      if (isBlank(cur)) patch[key] = value;
    }
  }
  return patch;
}

export function snapshotForPaystackMetadata(snap: CheckoutSnapshot): Record<string, string> {
  return {
    checkout_email: snap.email,
    checkout_name: snap.name ?? "",
    checkout_phone: snap.cell_number ?? "",
  };
}
