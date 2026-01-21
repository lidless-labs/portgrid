import { NextResponse } from "next/server";
import { createDataSourceAdapter } from "@/lib/adapters";
import { parseFilterPatterns } from "@/lib/utils";
import type { SectionConfig } from "@/types/port";

function parseSectionConfig(): SectionConfig[] {
  const sectionsEnv = process.env.DEVICE_SECTIONS;
  if (!sectionsEnv || sectionsEnv.trim() === "") {
    return [];
  }

  const sectionNames = sectionsEnv.split(",").map((s) => s.trim()).filter(Boolean);

  return sectionNames.map((name) => {
    // Convert section name to env var format: "My Section" -> "MY_SECTION"
    const envKey = `SECTION_${name.toUpperCase().replace(/\s+/g, "_")}_PATTERNS`;
    const patterns = parseFilterPatterns(process.env[envKey]);
    return { name, patterns };
  });
}

export async function GET() {
  try {
    console.log("API /ports called, DATA_SOURCE:", process.env.DATA_SOURCE || "librenms (default)");
    console.log("LIBRENMS_URL configured:", !!process.env.LIBRENMS_URL);
    console.log("LIBRENMS_API_TOKEN configured:", !!process.env.LIBRENMS_API_TOKEN);

    const adapter = createDataSourceAdapter();
    const devices = await adapter.fetchDevicesWithPorts();
    const sections = parseSectionConfig();

    console.log(`Returning ${devices.length} devices, ${sections.length} sections`);
    return NextResponse.json({ devices, sections });
  } catch (error) {
    console.error("Error fetching port data:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch data";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
