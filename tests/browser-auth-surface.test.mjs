import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

globalThis.AsyncLocalStorage = AsyncLocalStorage;

async function loadProxyConfig() {
  const source = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
  const js = stripTypeScriptTypes(source);
  const match = js.match(/export const config = ([\s\S]*?);\s*$/);

  assert.ok(match, "proxy should export a Next config object");
  return Function(`return (${match[1]})`)();
}

test("proxy protects the browser UI and inventory API at the request boundary", async () => {
  const proxy = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");

  assert.match(proxy, /authorizePortGridRequest\(request\.headers\)/);
  assert.match(proxy, /WWW-Authenticate|createPortGridUnauthorizedHeaders/);
});

test("proxy matcher default-protects future app and API routes but excludes static assets", async () => {
  const { unstable_doesMiddlewareMatch } = await import("next/experimental/testing/server.js");
  const config = await loadProxyConfig();

  for (const url of ["/", "/test", "/api/ports", "/future-page", "/api/future-route"]) {
    assert.equal(
      unstable_doesMiddlewareMatch({ config, url }),
      true,
      `${url} should run through proxy auth`
    );
  }

  for (const url of [
    "/_next/static/chunks/app.js",
    "/_next/image?url=%2Flogo.png&w=128&q=75",
    "/favicon.ico",
    "/icon.svg",
    "/apple-icon.png",
  ]) {
    assert.equal(
      unstable_doesMiddlewareMatch({ config, url }),
      false,
      `${url} should skip proxy auth`
    );
  }
});

test("browser inventory fetch relies on same-origin browser credentials, not a client bearer secret", async () => {
  const hook = await readFile(new URL("../hooks/use-ports.ts", import.meta.url), "utf8");
  const appSources = [
    hook,
    await readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ].join("\n");

  assert.match(hook, /fetch\("\/api\/ports",\s*{[\s\S]*credentials:\s*"same-origin"/);
  assert.doesNotMatch(appSources, /Authorization/i);
  assert.doesNotMatch(appSources, /Bearer/i);
  assert.doesNotMatch(appSources, /NEXT_PUBLIC_.*PORTGRID/i);
});
