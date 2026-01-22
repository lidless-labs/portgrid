"use client";

import { useState, useMemo } from "react";
import { usePorts } from "@/hooks/use-ports";
import { SwitchAccordion } from "@/components/switch-accordion";
import { SearchInput } from "@/components/search-input";
import { VlanFilter } from "@/components/vlan-filter";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { RefreshCw, Github } from "lucide-react";
import type { DeviceWithPorts, EnrichedPort } from "@/types/port";

export default function Home() {
  const { data, isLoading, isError, error, refetch, isFetching } = usePorts();
  const [search, setSearch] = useState("");
  const [vlanFilter, setVlanFilter] = useState("all");

  // Extract unique VLANs from all ports
  const uniqueVlans = useMemo(() => {
    if (!data?.devices) return [];
    const vlans = new Set<number>();
    data.devices.forEach((device) => {
      device.ports.forEach((port) => {
        if (port.ifVlan !== null) {
          vlans.add(port.ifVlan);
        }
      });
    });
    return Array.from(vlans);
  }, [data]);

  // Filter devices and ports based on search and VLAN filter
  const filteredDevices = useMemo(() => {
    if (!data?.devices) return [];

    const searchLower = search.toLowerCase();

    return data.devices
      .map((device): DeviceWithPorts => {
        const filteredPorts = device.ports.filter((port: EnrichedPort) => {
          // VLAN filter
          if (vlanFilter !== "all") {
            if (port.ifVlan === null || port.ifVlan.toString() !== vlanFilter) {
              return false;
            }
          }

          // Search filter
          if (search) {
            const searchableFields = [
              port.ifName,
              port.ifAlias,
              port.ifDescr,
              port.ifPhysAddress,
              port.neighbor,
              port.ifVlan?.toString(),
              device.hostname,
            ]
              .filter(Boolean)
              .map((f) => f!.toLowerCase());

            return searchableFields.some((field) => field.includes(searchLower));
          }

          return true;
        });

        return {
          ...device,
          ports: filteredPorts,
        };
      })
      .filter((device) => device.ports.length > 0);
  }, [data, search, vlanFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!filteredDevices.length) return { devices: 0, ports: 0, up: 0, inactive: 0, disabled: 0 };

    let ports = 0;
    let up = 0;
    let inactive = 0;
    let disabled = 0;

    filteredDevices.forEach((device) => {
      ports += device.ports.length;
      device.ports.forEach((port) => {
        if (port.ifAdminStatus === "up" && port.ifOperStatus === "up") up++;
        if (port.ifAdminStatus === "up" && port.ifOperStatus === "down") inactive++;
        if (port.ifAdminStatus === "down") disabled++;
      });
    });

    return { devices: filteredDevices.length, ports, up, inactive, disabled };
  }, [filteredDevices]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Color accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500" />
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Custom logo with port status colors */}
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 p-1">
                  <div className="rounded-sm bg-green-500" />
                  <div className="rounded-sm bg-green-500" />
                  <div className="rounded-sm bg-amber-500" />
                  <div className="rounded-sm bg-green-500" />
                  <div className="rounded-sm bg-red-500" />
                  <div className="rounded-sm bg-green-500" />
                  <div className="rounded-sm bg-amber-500" />
                  <div className="rounded-sm bg-green-500" />
                  <div className="rounded-sm bg-green-500" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Port<span className="text-green-500">Grid</span>
                </h1>
                <p className="text-xs text-muted-foreground">Network Port Visualization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={`h-5 w-5 ${isFetching ? "animate-spin" : ""}`}
                />
                <span className="sr-only">Refresh data</span>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filter bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} />
          <VlanFilter
            vlans={uniqueVlans}
            value={vlanFilter}
            onChange={setVlanFilter}
          />
        </div>

        {/* Stats bar */}
        {!isLoading && !isError && (
          <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{totals.devices}</strong>{" "}
              {totals.devices === 1 ? "device" : "devices"}
            </span>
            <span>
              <strong className="text-foreground">{totals.ports}</strong>{" "}
              {totals.ports === 1 ? "port" : "ports"}
            </span>
            <span>
              <strong className="text-green-600">{totals.up}</strong> up
            </span>
            {totals.inactive > 0 && (
              <span>
                <strong className="text-amber-500">{totals.inactive}</strong> inactive
              </span>
            )}
            {totals.disabled > 0 && (
              <span>
                <strong className="text-red-600">{totals.disabled}</strong> disabled
              </span>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg border bg-muted"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
            <p className="text-red-600 dark:text-red-400">
              Failed to load port data:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </div>
        )}

        {/* Device accordions */}
        {!isLoading && !isError && (
          <SwitchAccordion devices={filteredDevices} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Github className="h-4 w-4" />
          <a
            href="https://github.com/solomonneas/portgrid"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            solomonneas/portgrid
          </a>
        </div>
      </footer>
    </div>
  );
}
