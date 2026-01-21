"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PortGridTable } from "@/components/port-grid-table";
import type { DeviceWithPorts } from "@/types/port";
import { Server } from "lucide-react";

interface SwitchAccordionProps {
  devices: DeviceWithPorts[];
}

export function SwitchAccordion({ devices }: SwitchAccordionProps) {
  if (devices.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No devices found matching your filters.
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-2">
      {devices.map((device) => {
        const upPorts = device.ports.filter(
          (p) => p.ifAdminStatus === "up" && p.ifOperStatus === "up"
        ).length;
        const downPorts = device.ports.filter(
          (p) => p.ifAdminStatus === "up" && p.ifOperStatus === "down"
        ).length;
        const disabledPorts = device.ports.filter(
          (p) => p.ifAdminStatus === "down"
        ).length;

        return (
          <AccordionItem
            key={device.device_id}
            value={`device-${device.device_id}`}
            className="border rounded-lg px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-4">
                <Server className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">{device.hostname}</span>
                <div className="flex gap-2">
                  <Badge variant="default" className="bg-green-600">
                    {upPorts} up
                  </Badge>
                  {downPorts > 0 && (
                    <Badge variant="default" className="bg-amber-500">
                      {downPorts} inactive
                    </Badge>
                  )}
                  {disabledPorts > 0 && (
                    <Badge variant="destructive">{disabledPorts} disabled</Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({device.ports.length} total)
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <PortGridTable ports={device.ports} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
