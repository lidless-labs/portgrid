import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

async function loadAuthModule() {
  const source = await readFile(new URL("../lib/server-auth.ts", import.meta.url), "utf8");
  const js = stripTypeScriptTypes(source);
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

function basic(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

test("production auth fails closed when no PortGrid auth config is present", async () => {
  const { authorizePortGridRequest } = await loadAuthModule();

  const result = authorizePortGridRequest(new Headers(), {
    NODE_ENV: "production",
  });

  assert.equal(result.authorized, false);
  assert.equal(result.status, 401);
  assert.match(result.wwwAuthenticate, /^Basic realm="PortGrid"/);
  assert.equal(result.reason, "missing_auth_config");
});

test("explicit development bypass only works outside production", async () => {
  const { authorizePortGridRequest } = await loadAuthModule();

  assert.deepEqual(
    authorizePortGridRequest(new Headers(), {
      NODE_ENV: "development",
      PORTGRID_AUTH_BYPASS: "development",
    }),
    { authorized: true, mode: "development-bypass" }
  );

  const productionResult = authorizePortGridRequest(new Headers(), {
    NODE_ENV: "production",
    PORTGRID_AUTH_BYPASS: "development",
  });

  assert.equal(productionResult.authorized, false);
  assert.equal(productionResult.reason, "missing_auth_config");
});

test("development bypass is denied when the bypass flag is absent", async () => {
  const { authorizePortGridRequest } = await loadAuthModule();

  const result = authorizePortGridRequest(new Headers(), {
    NODE_ENV: "development",
  });

  assert.equal(result.authorized, false);
  assert.equal(result.reason, "missing_auth_config");
});

test("configured but missing credentials are rejected before credential checks", async () => {
  const { authorizePortGridRequest } = await loadAuthModule();

  const result = authorizePortGridRequest(new Headers(), {
    NODE_ENV: "production",
    PORTGRID_AUTH_USERNAME: "portgrid",
    PORTGRID_AUTH_PASSWORD: "browser-password",
    PORTGRID_API_TOKEN: "api-token",
  });

  assert.equal(result.authorized, false);
  assert.equal(result.status, 401);
  assert.equal(result.reason, "missing_credentials");
});

test("malformed Authorization headers are rejected", async () => {
  const { authorizePortGridRequest } = await loadAuthModule();
  const headers = new Headers({
    authorization: "Basic not-valid-for-portgrid",
  });

  const result = authorizePortGridRequest(headers, {
    NODE_ENV: "production",
    PORTGRID_AUTH_USERNAME: "portgrid",
    PORTGRID_AUTH_PASSWORD: "browser-password",
  });

  assert.equal(result.authorized, false);
  assert.equal(result.status, 401);
  assert.equal(result.reason, "invalid_credentials");
});

test("wrong bearer tokens are rejected", async () => {
  const { authorizePortGridRequest } = await loadAuthModule();
  const headers = new Headers({
    authorization: "Bearer wrong-token",
  });

  const result = authorizePortGridRequest(headers, {
    NODE_ENV: "production",
    PORTGRID_API_TOKEN: "api-token",
  });

  assert.equal(result.authorized, false);
  assert.equal(result.status, 401);
  assert.equal(result.reason, "invalid_credentials");
});

test("browser Basic auth succeeds without exposing a bearer token to client JavaScript", async () => {
  const { authorizePortGridRequest } = await loadAuthModule();
  const headers = new Headers({
    authorization: basic("portgrid", "browser-password"),
  });

  const result = authorizePortGridRequest(headers, {
    NODE_ENV: "production",
    PORTGRID_AUTH_USERNAME: "portgrid",
    PORTGRID_AUTH_PASSWORD: "browser-password",
  });

  assert.deepEqual(result, { authorized: true, mode: "basic" });
});

test("API bearer auth succeeds when an API token is configured", async () => {
  const { authorizePortGridRequest } = await loadAuthModule();
  const headers = new Headers({
    authorization: "Bearer api-token",
  });

  const result = authorizePortGridRequest(headers, {
    NODE_ENV: "production",
    PORTGRID_API_TOKEN: "api-token",
  });

  assert.deepEqual(result, { authorized: true, mode: "bearer" });
});

test("wrong credentials are rejected", async () => {
  const { authorizePortGridRequest } = await loadAuthModule();
  const headers = new Headers({
    authorization: basic("portgrid", "wrong-password"),
  });

  const result = authorizePortGridRequest(headers, {
    NODE_ENV: "production",
    PORTGRID_AUTH_USERNAME: "portgrid",
    PORTGRID_AUTH_PASSWORD: "browser-password",
    PORTGRID_API_TOKEN: "api-token",
  });

  assert.equal(result.authorized, false);
  assert.equal(result.status, 401);
  assert.equal(result.reason, "invalid_credentials");
});
