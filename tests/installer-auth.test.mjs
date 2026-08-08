import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);

async function assertInstallerAuthConfig(scriptPath) {
  const script = await readFile(new URL(scriptPath, import.meta.url), "utf8");
  const helper = await readFile(new URL("../scripts/portgrid_env.sh", import.meta.url), "utf8");

  assert.match(script, /PORTGRID_AUTH_USERNAME/);
  assert.match(script, /PORTGRID_AUTH_PASSWORD/);
  assert.match(script, /PORTGRID_API_TOKEN/);
  assert.match(script, /(openssl rand|randomBytes\(48\))/);
  assert.match(script, /build_portgrid_env_payload/);
  assert.match(helper, /chmod 600 "\$1"/);
  assert.doesNotMatch(script, /NEXT_PUBLIC_.*TOKEN/);
  assert.doesNotMatch(script, /PORTGRID_AUTH_BYPASS=development/);

  const envWrite = script.search(/build_portgrid_env_payload[\s\S]+\.env\.local|write_proxmox_env_local[\s\S]+\.env\.local/);
  const networkAdvertise = Math.max(
    script.indexOf("Access PortGrid at:"),
    script.indexOf("PortGrid Access:")
  );

  assert.ok(envWrite > -1, "installer should write .env.local");
  assert.ok(networkAdvertise > -1, "installer should advertise network URL after install");
  assert.ok(envWrite < networkAdvertise, "auth config must be written before network URL is advertised");
}

test("Linux installer writes secure PortGrid auth config before network advertising", async () => {
  await assertInstallerAuthConfig("../scripts/install_portgrid.sh");
});

test("Proxmox installer writes secure PortGrid auth config before network advertising", async () => {
  await assertInstallerAuthConfig("../scripts/proxmox_install.sh");
});

test("PortGrid env payload rejects values that dotenv or systemd EnvironmentFile could corrupt", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "portgrid-env-reject-"));
  const rejectLog = join(tempDir, "unexpected");
  const helperPath = new URL("../scripts/portgrid_env.sh", import.meta.url).pathname;

  const { stdout } = await execFileAsync("bash", [
    "-c",
    `
      set -e
      . "$1"
      build_portgrid_env_payload \\
        "https://librenms.example.test" \\
        "librenms-token" \\
        "portgrid-user" \\
        "browser-password" \\
        "api-token"
      if build_portgrid_env_payload "https://example.test" "token" "bad'user" "password" "api" >"$2" 2>&1; then
        exit 11
      fi
      if build_portgrid_env_payload "https://example.test" "token" "user" $'bad\\npassword' "api" >"$2" 2>&1; then
        exit 12
      fi
      if build_portgrid_env_payload "https://example.test" "token" "user" $'bad\\rpassword' "api" >"$2" 2>&1; then
        exit 13
      fi
      if build_portgrid_env_payload "https://example.test" "token" "user:name" "password" "api" >"$2" 2>&1; then
        exit 14
      fi
    `,
    "bash",
    helperPath,
    rejectLog,
  ]);

  assert.match(stdout, /^DATA_SOURCE='librenms'$/m);
  assert.match(stdout, /^PORTGRID_AUTH_USERNAME='portgrid-user'$/m);
  assert.match(stdout, /^PORTGRID_AUTH_PASSWORD='browser-password'$/m);
});

test("PortGrid env payload single-quotes values without corrupting spaces, backslashes, or double quotes", async () => {
  const helperPath = new URL("../scripts/portgrid_env.sh", import.meta.url).pathname;
  const values = {
    librenmsUrl: ' https://librenms.example.test/path\\segment?label="edge" ',
    librenmsToken: "base64+/token==",
    authUsername: "portgrid-user",
    authPassword: ' leading \\browser "password" trailing ',
    apiToken: "base64url_-token",
  };

  const { stdout } = await execFileAsync("bash", [
    "-c",
    `
      set -e
      . "$1"
      build_portgrid_env_payload "$2" "$3" "$4" "$5" "$6"
    `,
    "bash",
    helperPath,
    values.librenmsUrl,
    values.librenmsToken,
    values.authUsername,
    values.authPassword,
    values.apiToken,
  ]);

  assert.equal(
    stdout,
    [
      "DATA_SOURCE='librenms'",
      `LIBRENMS_URL='${values.librenmsUrl}'`,
      `LIBRENMS_API_TOKEN='${values.librenmsToken}'`,
      `PORTGRID_AUTH_USERNAME='${values.authUsername}'`,
      `PORTGRID_AUTH_PASSWORD='${values.authPassword}'`,
      `PORTGRID_API_TOKEN='${values.apiToken}'`,
      "",
    ].join("\n")
  );
});

test("Proxmox installer sends secrets through stdin, not pct argv or output", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "portgrid-pct-recorder-"));
  const pctLog = join(tempDir, "pct.log");
  const stdinLog = join(tempDir, "stdin.log");
  const helperPath = new URL("../scripts/portgrid_env.sh", import.meta.url).pathname;
  const fakePctPath = join(tempDir, "pct");
  const fakePct = `#!/bin/bash
printf 'argv:' >> "$PCT_LOG"
printf ' <%s>' "$@" >> "$PCT_LOG"
printf '\\n' >> "$PCT_LOG"
cat > "$PCT_STDIN_LOG"
printf 'pct recorder complete\\n'
`;

  await writeFile(fakePctPath, fakePct, { mode: 0o755 });

  const env = {
    ...process.env,
    PATH: `${tempDir}:${process.env.PATH}`,
    PCT_LOG: pctLog,
    PCT_STDIN_LOG: stdinLog,
  };
  const { stdout, stderr } = await execFileAsync(
    "bash",
    [
      "-c",
      `
        set -e
        . "$1"
        payload=$(build_portgrid_env_payload \\
          "https://librenms.example.test" \\
          "librenms-secret-token" \\
          "portgrid-user" \\
          "browser-secret-password" \\
          "portgrid-secret-api-token")
        write_proxmox_env_local 123 /opt/portgrid/.env.local "$payload"
      `,
      "bash",
      helperPath,
    ],
    { env }
  );

  const argv = await readFile(pctLog, "utf8");
  const stdin = await readFile(stdinLog, "utf8");
  const combinedOutput = `${stdout}\n${stderr}`;

  for (const secret of [
    "librenms-secret-token",
    "browser-secret-password",
    "portgrid-secret-api-token",
  ]) {
    assert.doesNotMatch(argv, new RegExp(secret));
    assert.doesNotMatch(combinedOutput, new RegExp(secret));
    assert.match(stdin, new RegExp(secret));
  }

  assert.match(argv, /<exec> <123> <--> <bash> <-c> <umask 077; cat > "\$1"; chmod 600 "\$1"> <sh> <\/opt\/portgrid\/\.env\.local>/);
});
