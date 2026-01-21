import { NextResponse } from "next/server";
import { createDataSourceAdapter } from "@/lib/adapters";

export async function GET() {
  try {
    const adapter = createDataSourceAdapter();
    const devices = await adapter.fetchDevicesWithPorts();
    return NextResponse.json({ devices });
  } catch (error) {
    console.error("Error fetching port data:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch data";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
