"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { NoteCell } from "@/components/note-cell";
import type { EnrichedPort } from "@/types/port";

interface ColumnsConfig {
  getNote: (portId: number) => string;
  setNote: (portId: number, note: string) => void;
}

export function createColumns({ getNote, setNote }: ColumnsConfig): ColumnDef<EnrichedPort>[] {
  return [
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
      accessorKey: "port_id",
      header: "Notes",
      cell: ({ row }) => (
        <NoteCell
          portId={row.original.port_id}
          note={getNote(row.original.port_id)}
          onNoteChange={(note) => setNote(row.original.port_id, note)}
        />
      ),
    },
    {
      accessorKey: "ifAdminStatus",
      header: "Admin",
      cell: ({ row }) => {
        const status = row.getValue("ifAdminStatus") as string;
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
      accessorKey: "ifOperStatus",
      header: "Oper",
      cell: ({ row }) => {
        const status = row.getValue("ifOperStatus") as string;
        const adminStatus = row.original.ifAdminStatus;
        // If admin is down, oper status is irrelevant - show gray
        if (adminStatus === "down") {
          return (
            <Badge variant="secondary">
              {status}
            </Badge>
          );
        }
        return (
          <Badge
            variant="default"
            className={status === "up" ? "bg-green-600" : "bg-amber-500"}
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
}

// Keep backward compatibility - static columns without notes
export const columns: ColumnDef<EnrichedPort>[] = createColumns({
  getNote: () => "",
  setNote: () => {},
});
