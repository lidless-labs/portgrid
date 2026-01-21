import { useQuery } from "@tanstack/react-query";
import type { PortsApiResponse } from "@/types/port";

async function fetchPorts(): Promise<PortsApiResponse> {
  const response = await fetch("/api/ports");
  if (!response.ok) {
    throw new Error("Failed to fetch ports");
  }
  return response.json();
}

export function usePorts() {
  return useQuery({
    queryKey: ["ports"],
    queryFn: fetchPorts,
  });
}
