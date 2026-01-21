"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { EnrichedPort } from "@/types/port";

export const columns: ColumnDef<EnrichedPort>[] = [
  {
    accessorKey: "ifName",
    header: "Port",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue("ifName")}</span>
    ),
  },
  {
    accessorKey: "ifAlias",
    header: "Description",
    cell: ({ row }) => {
      const desc = row.getValue("ifAlias") as string | null;
      if (!desc || desc.trim() === "") {
        return <span className="text-red-500 italic">No description</span>;
      }
      return <span className="truncate max-w-[200px] block">{desc}</span>;
    },
  },
  {
    accessorKey: "ifAdminStatus",
    header: "Admin",
    cell: ({ row }) => {
      const status = row.getValue("ifAdminStatus") as string;
      return (
        <Badge variant={status === "up" ? "default" : "secondary"}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "ifOperStatus",
    header: "Oper",
    cell: ({ row }) => {
      const status = row.getValue("ifOperStatus") as string;
      return (
        <Badge
          variant={status === "up" ? "default" : "destructive"}
          className={status === "up" ? "bg-green-600" : ""}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "ifVlan",
    header: "VLAN",
    cell: ({ row }) => {
      const vlan = row.getValue("ifVlan") as number | null;
      return <span className="font-mono">{vlan ?? "-"}</span>;
    },
  },
  {
    accessorKey: "ifPhysAddress",
    header: "MAC",
    cell: ({ row }) => {
      const mac = row.getValue("ifPhysAddress") as string | null;
      return <span className="font-mono text-xs">{mac ?? "-"}</span>;
    },
  },
  {
    accessorKey: "neighbor",
    header: "Neighbor",
    cell: ({ row }) => {
      const neighbor = row.getValue("neighbor") as string | null;
      return neighbor ? (
        <span className="text-blue-600 dark:text-blue-400">{neighbor}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
];
