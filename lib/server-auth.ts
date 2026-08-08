import { createHash, timingSafeEqual } from "node:crypto";

export const PORTGRID_AUTH_REALM = "PortGrid";

type Env = Record<string, string | undefined>;

type AuthorizedAuthResult = {
  authorized: true;
  mode: "basic" | "bearer" | "development-bypass";
};

type RejectedAuthResult = {
  authorized: false;
  status: 401;
  wwwAuthenticate: string;
  reason: "missing_auth_config" | "missing_credentials" | "invalid_credentials";
};

export type PortGridAuthResult = AuthorizedAuthResult | RejectedAuthResult;

function authChallenge() {
  return `Basic realm="${PORTGRID_AUTH_REALM}", charset="UTF-8"`;
}

function reject(reason: RejectedAuthResult["reason"]): RejectedAuthResult {
  return {
    authorized: false,
    status: 401,
    wwwAuthenticate: authChallenge(),
    reason,
  };
}

function configured(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function secureEqual(actual: string, expected: string) {
  const actualDigest = createHash("sha256").update(actual).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

function parseBasicAuth(authHeader: string) {
  if (!authHeader.startsWith("Basic ")) return null;

  const encoded = authHeader.slice("Basic ".length);
  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return null;
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) return null;

  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

function isDevelopmentBypass(env: Env) {
  return env.NODE_ENV !== "production" && env.PORTGRID_AUTH_BYPASS === "development";
}

function hasBearerConfig(env: Env) {
  return configured(env.PORTGRID_API_TOKEN);
}

function hasBasicConfig(env: Env) {
  return configured(env.PORTGRID_AUTH_USERNAME) && configured(env.PORTGRID_AUTH_PASSWORD);
}

export function createPortGridUnauthorizedHeaders(result: RejectedAuthResult) {
  return {
    "WWW-Authenticate": result.wwwAuthenticate,
    "Cache-Control": "no-store",
  };
}

export function authorizePortGridRequest(
  headers: Pick<Headers, "get">,
  env: Env = process.env
): PortGridAuthResult {
  if (isDevelopmentBypass(env)) {
    return { authorized: true, mode: "development-bypass" };
  }

  const bearerConfigured = hasBearerConfig(env);
  const basicConfigured = hasBasicConfig(env);

  if (!bearerConfigured && !basicConfigured) {
    return reject("missing_auth_config");
  }

  const authHeader = headers.get("authorization");
  if (!authHeader) {
    return reject("missing_credentials");
  }

  if (bearerConfigured && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    if (secureEqual(token, env.PORTGRID_API_TOKEN!)) {
      return { authorized: true, mode: "bearer" };
    }
  }

  if (basicConfigured) {
    const basic = parseBasicAuth(authHeader);
    if (
      basic &&
      secureEqual(basic.username, env.PORTGRID_AUTH_USERNAME!) &&
      secureEqual(basic.password, env.PORTGRID_AUTH_PASSWORD!)
    ) {
      return { authorized: true, mode: "basic" };
    }
  }

  return reject("invalid_credentials");
}
