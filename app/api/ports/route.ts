import { NextRequest, NextResponse } from "next/server";
import { createDataSourceAdapter } from "@/lib/adapters";

function checkAuth(request: NextRequest): NextResponse | null {
  const expectedToken = process.env.PORTGRID_API_TOKEN;
  if (!expectedToken) {
    // No token configured — dev mode, allow unauthenticated
    return null;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const token = authHeader.slice("Bearer ".length);
  if (token !== expectedToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

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
