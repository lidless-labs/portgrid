import { NextResponse } from "next/server";
import { createDataSourceAdapter } from "@/lib/adapters";

export async function GET() {
  try {
    console.log("API /ports called, DATA_SOURCE:", process.env.DATA_SOURCE || "librenms (default)");
    console.log("LIBRENMS_URL configured:", !!process.env.LIBRENMS_URL);
    console.log("LIBRENMS_API_TOKEN configured:", !!process.env.LIBRENMS_API_TOKEN);

    const adapter = createDataSourceAdapter();
    const devices = await adapter.fetchDevicesWithPorts();

    console.log(`Returning ${devices.length} devices`);
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
