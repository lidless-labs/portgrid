import { NextRequest, NextResponse } from "next/server";
import { createDataSourceAdapter } from "@/lib/adapters";
import {
  authorizePortGridRequest,
  createPortGridUnauthorizedHeaders,
} from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  const auth = authorizePortGridRequest(request.headers);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: auth.status,
        headers: createPortGridUnauthorizedHeaders(auth),
      }
    );
  }

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
    return NextResponse.json(
      { error: "Failed to fetch port data" },
      { status: 502 }
    );
  }
}
