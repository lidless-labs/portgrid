import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  authorizePortGridRequest,
  createPortGridUnauthorizedHeaders,
} from "./lib/server-auth";

export function proxy(request: NextRequest) {
  const auth = authorizePortGridRequest(request.headers);
  if (auth.authorized) return NextResponse.next();

  return new NextResponse("Unauthorized", {
    status: auth.status,
    headers: createPortGridUnauthorizedHeaders(auth),
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|next.svg|vercel.svg|globe.svg|window.svg|file.svg).*)",
  ],
};
