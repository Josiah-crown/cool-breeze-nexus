import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Copy, ChevronDown, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ApiKeyManager from "@/components/ApiKeyManager";

type Props = {
  machineId: string;
  machineApiKey?: string | null;
  onKeysUpdated?: () => void;
};

const MachineOnSiteSetup: React.FC<Props> = ({ machineId, machineApiKey, onKeysUpdated }) => {
  const [showKey, setShowKey] = useState(false);

  const copy = async (text: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
      } else {
        toast.error("Clipboard not available");
      }
    } catch {
      toast.error("Copy failed");
    }
  };

  const displayKey = machineApiKey ?? "";
  const masked =
    displayKey.length > 14 ? `${displayKey.slice(0, 10)}…${displayKey.slice(-4)}` : displayKey || "—";

  return (
    <Card className="bg-card border-[3px] border-[#8FB83D]">
      <CardHeader className="border-b-[3px] border-[#8FB83D]">
        <CardTitle className="text-lg" style={{ color: "#8FB83D" }}>
          ESP32
        </CardTitle>
        <p className="text-sm font-normal text-muted-foreground pt-1">
          Copy the machine ID and API key into the device. Standard Cmonitor firmware already uses the correct cloud
          connection for your environment.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-4 text-sm">
        <div>
          <p className="font-semibold text-foreground mb-1">Machine ID</p>
          <div className="flex gap-2 items-center flex-wrap">
            <code className="flex-1 min-w-0 break-all rounded border border-border bg-muted/50 p-2 text-xs">{machineId}</code>
            <Button type="button" size="sm" variant="outline" onClick={() => copy(machineId, "Machine ID")}>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>
        </div>

        <div>
          <p className="font-semibold text-foreground mb-1">API key</p>
          {displayKey ? (
            <div className="flex gap-2 items-center flex-wrap">
              <code className="flex-1 min-w-0 break-all rounded border border-border bg-muted/50 p-2 text-xs">
                {showKey ? displayKey : masked}
              </code>
              <Button type="button" size="icon" variant="outline" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? "Hide key" : "Show key"}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => copy(displayKey, "API key")}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
          ) : (
            <p className="text-xs text-amber-700 dark:text-amber-300">No key on file yet — open Replace key below or refresh.</p>
          )}
        </div>

        <Collapsible className="group rounded-lg border border-border bg-muted/20">
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium",
              "hover:bg-muted/60 rounded-t-lg",
            )}
          >
            <span>Replace API key</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border px-3 pb-3 pt-2">
            <p className="text-xs text-muted-foreground mb-2">Only if you are moving this unit to another provisioned key.</p>
            <ApiKeyManager machineId={machineId} mode="assign" assignVariant="replaceOnly" onKeysUpdated={onKeysUpdated} />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default MachineOnSiteSetup;
