import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { QuoteClient } from "@/types/quotes";

type Props = {
  client: QuoteClient;
  onChange: (client: QuoteClient) => void;
};

export const ClientDetailsForm: React.FC<Props> = ({ client, onChange }) => {
  const set = (key: keyof QuoteClient, value: string) => onChange({ ...client, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="companyName">Company name</Label>
        <Input id="companyName" value={client.companyName} onChange={(e) => set("companyName", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="contactPerson">Contact person</Label>
        <Input id="contactPerson" value={client.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="salesReference">Sales reference / quote no.</Label>
        <Input id="salesReference" value={client.salesReference} onChange={(e) => set("salesReference", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="tel">Tel</Label>
        <Input id="tel" value={client.tel} onChange={(e) => set("tel", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="cell">Cell</Label>
        <Input id="cell" value={client.cell} onChange={(e) => set("cell", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={client.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="salesPerson">Sales person</Label>
        <Input id="salesPerson" value={client.salesPerson} onChange={(e) => set("salesPerson", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="quoteDate">Quote date</Label>
        <Input id="quoteDate" type="date" value={client.quoteDate} onChange={(e) => set("quoteDate", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="addressLine1">Installation address</Label>
        <Input id="addressLine1" value={client.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="addressLine2">Address line 2</Label>
        <Input id="addressLine2" value={client.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} />
      </div>
    </div>
  );
};
