import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import TopTaskbar from "@/components/TopTaskbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRequiredLegalCompliance } from "@/hooks/useRequiredLegalCompliance";
import {
  type LegalAcceptanceRow,
  type LegalDocumentRow,
  latestDocByKey,
  missingRequiredAcceptances,
  REQUIRED_DOC_KEYS,
  signedRequiredAgreements,
} from "@/lib/requiredLegal";

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  cell_number: string | null;
  full_name_business: string | null;
  email_subscribed: boolean;
  country: string | null;
  state: string | null;
  city: string | null;
  street: string | null;
  suburb: string | null;
  po_box: string | null;
};

const LEGAL_DISPLAY: Record<(typeof REQUIRED_DOC_KEYS)[number], string> = {
  privacy_policy: "Privacy policy",
  user_agreement: "User agreement",
  data_use_agreement: "Data use agreement",
  product_agreement: "Product agreement",
};

function agreementHeading(documentKey: string, dbTitle: string) {
  const k = documentKey as (typeof REQUIRED_DOC_KEYS)[number];
  if (LEGAL_DISPLAY[k] && (!dbTitle || dbTitle === documentKey)) return LEGAL_DISPLAY[k];
  return dbTitle || LEGAL_DISPLAY[k] || documentKey.replace(/_/g, " ");
}

const Account: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const requireLegalNotice = Boolean((location.state as { requireLegal?: boolean } | null)?.requireLegal);

  const { state: legalState, docs, acceptances, reload } = useRequiredLegalCompliance(user?.id);

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const latestMap = useMemo(() => latestDocByKey(docs as LegalDocumentRow[]), [docs]);
  const missingRequired = useMemo(
    () => missingRequiredAcceptances(docs as LegalDocumentRow[], acceptances as LegalAcceptanceRow[]),
    [docs, acceptances],
  );
  const signedList = useMemo(
    () => signedRequiredAgreements(docs as LegalDocumentRow[], acceptances as LegalAcceptanceRow[]),
    [docs, acceptances],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!user) return;
      setIsLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, name, email, cell_number, full_name_business, email_subscribed, country, state, city, street, suburb, po_box",
          )
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        if (!cancelled) setProfile(profileData as ProfileRow);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load account");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  type ProfilePatch = Partial<
    Pick<
      ProfileRow,
      | "name"
      | "cell_number"
      | "full_name_business"
      | "email_subscribed"
      | "country"
      | "state"
      | "city"
      | "street"
      | "suburb"
      | "po_box"
    >
  >;

  const updateProfile = async (patch: ProfilePatch) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) throw error;
    setProfile((p) => (p ? { ...p, ...patch } : p));
  };

  const blurSave = (patch: ProfilePatch) => async () => {
    try {
      await updateProfile(patch);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update profile");
    }
  };

  const acceptLatest = async (document_key: string) => {
    if (!user) return;
    const doc = latestMap.get(document_key);
    if (!doc) {
      toast.error("Document not available");
      return;
    }
    const { error } = await supabase.from("legal_acceptances").insert({
      user_id: user.id,
      document_key: doc.document_key,
      document_version: doc.version,
      user_agent: navigator.userAgent,
    });
    if (error) throw error;
    toast.success(`Signed: ${agreementHeading(doc.document_key, doc.title)}`);
    await reload();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white text-[#1A2B1C]">
        <TopTaskbar subtitle="Account" />
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <p className="text-sm text-[#4A6B4D]">Please sign in to view your account.</p>
        </main>
      </div>
    );
  }

  const legalBlockLoading = legalState === "loading";

  return (
    <div className="min-h-screen bg-white text-[#1A2B1C]">
      <TopTaskbar subtitle="Account" />

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {isLoading ? (
          <div className="text-sm text-[#4A6B4D]">Loading…</div>
        ) : (
          <>
            {requireLegalNotice && missingRequired.length > 0 ? (
              <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[#1A2B1C]">
                Please sign the required agreements below before using the dashboard. This records your electronic
                acceptance (timestamp and browser information).
              </div>
            ) : null}

            <header className="mb-8 max-w-3xl space-y-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#1A2B1C]">Account</h1>
              <p className="text-sm leading-relaxed text-[#4A6B4D]">
                <strong className="text-[#1A2B1C]">Machines, sites, and monitoring</strong> live on the{" "}
                <Link className="font-medium text-[#3D9E40] underline underline-offset-2" to="/dashboard">
                  Dashboard
                </Link>
                . This page is your <strong className="text-[#1A2B1C]">Cmonitor profile</strong> and{" "}
                <strong className="text-[#1A2B1C]">signed agreements</strong> (read them anytime below). Edits here are
                saved only in Cmonitor (Supabase)—you are not changing payment or CRM accounts from this screen. After a
                successful online payment, we may pre-fill empty contact fields from the payer record where available.
              </p>
              <p className="text-xs text-[#7A9B7D]">
                Signed in as <span className="font-medium text-[#1A2B1C]">{user.name}</span> · Role:{" "}
                <span className="font-medium text-[#1A2B1C]">{user.role.replace("_", " ")}</span>
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  to="/dashboard"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-black/20 bg-white px-4 text-sm font-medium text-[#1A2B1C] hover:bg-black/5"
                >
                  Open dashboard
                </Link>
                <Link
                  to="/dashboard/sites"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-black/20 bg-white px-4 text-sm font-medium text-[#1A2B1C] hover:bg-black/5"
                >
                  Sites
                </Link>
              </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-black/10 bg-white">
                <CardHeader>
                  <CardTitle className="text-[#1A2B1C]">Profile</CardTitle>
                  <CardDescription className="text-[#4A6B4D]">
                    Details from signup, payment, installer, or admin provisioning. Keep them accurate—updates are stored
                    here with a last-updated timestamp for support and compliance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#1A2B1C]">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={profile?.name ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, name: e.target.value } : p))}
                      onBlur={blurSave({ name: profile?.name ?? "" })}
                      placeholder="Your name"
                      className="border-black/20 text-[#1A2B1C]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#1A2B1C]">Email</Label>
                    <Input value={profile?.email ?? ""} readOnly className="border-black/20 bg-black/5 text-[#1A2B1C]" />
                    <p className="text-xs text-[#7A9B7D]">Set at signup / checkout. Contact support to change email.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cell" className="text-[#1A2B1C]">
                      Cell number
                    </Label>
                    <Input
                      id="cell"
                      value={profile?.cell_number ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, cell_number: e.target.value } : p))}
                      onBlur={blurSave({ cell_number: profile?.cell_number ?? "" })}
                      placeholder="e.g. +27 …"
                      className="border-black/20 text-[#1A2B1C]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business" className="text-[#1A2B1C]">
                      Business name
                    </Label>
                    <Input
                      id="business"
                      value={profile?.full_name_business ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, full_name_business: e.target.value } : p))}
                      onBlur={blurSave({ full_name_business: profile?.full_name_business ?? "" })}
                      placeholder="Company or site name (optional)"
                      className="border-black/20 text-[#1A2B1C]"
                    />
                  </div>

                  <div className="space-y-2 border-t border-black/10 pt-4">
                    <p className="text-sm font-semibold text-[#1A2B1C]">Address (optional)</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="street" className="text-[#1A2B1C]">
                          Street
                        </Label>
                        <Input
                          id="street"
                          value={profile?.street ?? ""}
                          onChange={(e) => setProfile((p) => (p ? { ...p, street: e.target.value } : p))}
                          onBlur={blurSave({ street: profile?.street ?? "" })}
                          className="border-black/20 text-[#1A2B1C]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="suburb" className="text-[#1A2B1C]">
                          Suburb
                        </Label>
                        <Input
                          id="suburb"
                          value={profile?.suburb ?? ""}
                          onChange={(e) => setProfile((p) => (p ? { ...p, suburb: e.target.value } : p))}
                          onBlur={blurSave({ suburb: profile?.suburb ?? "" })}
                          className="border-black/20 text-[#1A2B1C]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-[#1A2B1C]">
                          City
                        </Label>
                        <Input
                          id="city"
                          value={profile?.city ?? ""}
                          onChange={(e) => setProfile((p) => (p ? { ...p, city: e.target.value } : p))}
                          onBlur={blurSave({ city: profile?.city ?? "" })}
                          className="border-black/20 text-[#1A2B1C]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-[#1A2B1C]">
                          State / province
                        </Label>
                        <Input
                          id="state"
                          value={profile?.state ?? ""}
                          onChange={(e) => setProfile((p) => (p ? { ...p, state: e.target.value } : p))}
                          onBlur={blurSave({ state: profile?.state ?? "" })}
                          className="border-black/20 text-[#1A2B1C]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-[#1A2B1C]">
                          Country
                        </Label>
                        <Input
                          id="country"
                          value={profile?.country ?? ""}
                          onChange={(e) => setProfile((p) => (p ? { ...p, country: e.target.value } : p))}
                          onBlur={blurSave({ country: profile?.country ?? "" })}
                          className="border-black/20 text-[#1A2B1C]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="po_box" className="text-[#1A2B1C]">
                          PO Box
                        </Label>
                        <Input
                          id="po_box"
                          value={profile?.po_box ?? ""}
                          onChange={(e) => setProfile((p) => (p ? { ...p, po_box: e.target.value } : p))}
                          onBlur={blurSave({ po_box: profile?.po_box ?? "" })}
                          className="border-black/20 text-[#1A2B1C]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-black/10 p-4">
                    <div>
                      <div className="text-sm font-semibold text-[#1A2B1C]">Email updates</div>
                      <div className="text-xs text-[#4A6B4D]">Marketing and product email (separate from alert emails on machines).</div>
                    </div>
                    <Switch
                      checked={Boolean(profile?.email_subscribed)}
                      onCheckedChange={async (checked) => {
                        try {
                          await updateProfile({ email_subscribed: checked });
                          toast.success(checked ? "Email updates enabled" : "Email updates disabled");
                        } catch (e: any) {
                          toast.error(e?.message || "Failed to update preference");
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-black/10 bg-white">
                <CardHeader>
                  <CardTitle className="text-[#1A2B1C]">Agreements</CardTitle>
                  <CardDescription className="text-[#4A6B4D]">
                    Electronic signature: clicking <strong>Sign</strong> records acceptance of the document version
                    shown, with time and browser information. You can read any signed agreement again below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {legalBlockLoading ? (
                    <p className="text-sm text-[#4A6B4D]">Loading agreements…</p>
                  ) : (
                    <>
                      {missingRequired.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-[#1A2B1C]">Action required</p>
                          {missingRequired.map((m) => (
                            <div key={`${m.key}:${m.version}`} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-[#1A2B1C]">
                                    {agreementHeading(m.key, m.title)}
                                  </div>
                                  <div className="text-xs text-[#7A9B7D]">Version {m.version} — not signed yet</div>
                                  <div className="mt-2">
                                    <Link className="text-xs text-[#3D9E40] underline" to={`/legal/${m.key}`}>
                                      Read full document
                                    </Link>
                                  </div>
                                </div>
                                <Button
                                  className="shrink-0 bg-[#0D2211] text-white hover:bg-[#1A3A1E]"
                                  onClick={async () => {
                                    try {
                                      await acceptLatest(m.key);
                                    } catch (e: any) {
                                      toast.error(e?.message || "Failed to record acceptance");
                                    }
                                  }}
                                >
                                  Sign
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-black/10 bg-[#5BBF5E]/10 p-4 text-sm text-[#1A2B1C]">
                          All required agreements are signed for the current versions.
                        </div>
                      )}

                      {signedList.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-[#1A2B1C]">Your signed agreements</p>
                          <div className="space-y-2">
                            {signedList.map((s) => (
                              <div
                                key={`${s.key}:${s.version}`}
                                className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <div className="text-sm font-semibold text-[#1A2B1C]">
                                    {agreementHeading(s.key, s.title)}
                                  </div>
                                  <div className="text-xs text-[#7A9B7D]">
                                    Version {s.version} · Signed{" "}
                                    {new Date(s.signedAt).toLocaleString(undefined, {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    })}
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-[#5BBF5E]/20 px-2 py-0.5 text-xs font-medium text-[#1A2B1C]">
                                    Signed
                                  </span>
                                  <Link className="text-xs text-[#3D9E40] underline" to={`/legal/${s.key}`}>
                                    Read
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="text-xs text-[#7A9B7D]">
                        Records include timestamp and user agent. IP can be added server-side if counsel requires it.
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Account;
