/**
 * End-to-end smoke test: two isolated browser contexts pair over the real
 * signaling channel and move a file across the WebRTC line.
 *
 * Requires the dev server running (npm run dev) and a configured .env.
 * Drives the system-installed Edge via playwright-core; no browser
 * download needed.
 *
 *   node scripts/e2e-smoke.mjs [baseUrl]
 */

import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PAYLOAD_BYTES = 2 * 1024 * 1024;
const STEP_TIMEOUT = 30_000;

function step(name) {
  process.stdout.write(`${name}\n`);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const hostPage = await contextA.newPage();
  const guestPage = await contextB.newPage();

  step("host: open landing");
  await hostPage.goto(BASE, { waitUntil: "networkidle" });

  step("host: pass a line");
  await hostPage.click("button.button--kilo");
  await hostPage.waitForSelector(".session__code-word", {
    timeout: STEP_TIMEOUT,
  });
  const word = (
    await hostPage.textContent(".session__code-word")
  ).trim();
  const digits = (
    await hostPage.textContent(".session__code-digits")
  ).trim();
  step(`host: hailing on ${word}-${digits}`);

  step("guest: open landing and enter code");
  await guestPage.goto(BASE, { waitUntil: "networkidle" });
  await guestPage.selectOption("#code-word", word);
  const slots = guestPage.locator(".code-input__digit");
  for (let i = 0; i < digits.length; i += 1) {
    await slots.nth(i).fill(digits[i]);
  }
  await guestPage.click("button:has-text('Take the line')");

  step("both: waiting for MADE FAST");
  await hostPage
    .locator(".session__state", { hasText: "MADE FAST" })
    .waitFor({ timeout: STEP_TIMEOUT });
  await guestPage
    .locator(".session__state", { hasText: "MADE FAST" })
    .waitFor({ timeout: STEP_TIMEOUT });
  const hostReadout = (await hostPage.textContent(".session__state")).trim();
  step(`both made fast (host readout: ${hostReadout})`);

  step(`host: sending ${PAYLOAD_BYTES} bytes`);
  const payload = Buffer.alloc(PAYLOAD_BYTES);
  for (let i = 0; i < PAYLOAD_BYTES; i += 1) payload[i] = i % 251;
  await hostPage.setInputFiles("input[type=file]", {
    name: "cargo-test.bin",
    mimeType: "application/octet-stream",
    buffer: payload,
  });

  step("guest: waiting for the file to land");
  await guestPage
    .locator(".manifest__name", { hasText: "cargo-test.bin" })
    .waitFor({ timeout: STEP_TIMEOUT * 2 });

  step("host: waiting for the ack (Crossed over)");
  await hostPage
    .locator(".manifest__heading", { hasText: "Crossed over" })
    .waitFor({ timeout: STEP_TIMEOUT });

  step("guest: verifying received bytes");
  const check = await guestPage.evaluate(async () => {
    const link = document.querySelector(".manifest__row a[download]");
    if (!link) return { ok: false, reason: "no save link" };
    const blob = await fetch(link.href).then((r) => r.blob());
    const buf = new Uint8Array(await blob.arrayBuffer());
    for (let i = 0; i < buf.length; i += 1) {
      if (buf[i] !== i % 251) {
        return { ok: false, reason: `byte mismatch at ${i}` };
      }
    }
    return { ok: true, size: buf.length };
  });
  if (!check.ok || check.size !== PAYLOAD_BYTES) {
    throw new Error(`payload verification failed: ${JSON.stringify(check)}`);
  }

  step("guest: casting off");
  await guestPage.click("button:has-text('Cast off')");
  await hostPage
    .locator(".session__state", { hasText: "CAST OFF" })
    .waitFor({ timeout: STEP_TIMEOUT });

  step(
    `E2E PASS — paired on ${word}-${digits}, ${PAYLOAD_BYTES} bytes crossed intact, cast-off propagated`,
  );
} finally {
  await browser.close();
}
