"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VlanFilterProps {
  vlans: number[];
  value: string;
  onChange: (value: string) => void;
}

export function VlanFilter({ vlans, value, onChange }: VlanFilterProps) {
  const sortedVlans = [...vlans].sort((a, b) => a - b);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="All VLANs" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All VLANs</SelectItem>
        {sortedVlans.map((vlan) => (
          <SelectItem key={vlan} value={vlan.toString()}>
            VLAN {vlan}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
