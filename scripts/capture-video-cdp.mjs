import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import WebSocket from "ws";

const url = process.argv[2];
const outputDir = process.argv[3];
const durationMs = Number(process.argv[4] ?? 58_000);
const debuggingPort = Number(process.argv[5] ?? 9224);

if (!url || !outputDir || !Number.isFinite(durationMs)) {
  throw new Error("Usage: node scripts/capture-video-cdp.mjs <url> <output-dir> <duration-ms> [debug-port]");
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
const profileDir = path.join("/tmp", `refund-video-chrome-${process.pid}`);

const chromium = spawn("/repl/tools/bin/chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--hide-scrollbars",
  "--autoplay-policy=no-user-gesture-required",
  "--force-device-scale-factor=1",
  "--window-size=1920,1080",
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profileDir}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let browserTarget;
for (let attempt = 0; attempt < 100; attempt += 1) {
  try {
    const targets = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then(response => response.json());
    browserTarget = targets.find(target => target.type === "page");
    if (browserTarget?.webSocketDebuggerUrl) break;
  } catch {
    // Chromium is still starting.
  }
  await sleep(100);
}

if (!browserTarget?.webSocketDebuggerUrl) {
  chromium.kill("SIGKILL");
  throw new Error("Chromium DevTools endpoint did not become ready");
}

const socket = new WebSocket(browserTarget.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});

let commandId = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++commandId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

const captured = [];
const frameWrites = [];
let recordingStartedAt = null;
let loadedResolve;
const loaded = new Promise(resolve => { loadedResolve = resolve; });

socket.on("message", async raw => {
  const message = JSON.parse(raw.toString());
  if (message.id) {
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
    return;
  }

  if (message.method === "Page.loadEventFired" && recordingStartedAt === null) {
    recordingStartedAt = performance.now();
    loadedResolve();
    return;
  }

  if (message.method === "Page.screencastFrame") {
    socket.send(JSON.stringify({
      id: ++commandId,
      method: "Page.screencastFrameAck",
      params: { sessionId: message.params.sessionId },
    }));
    if (recordingStartedAt === null) return;
    const elapsedMs = performance.now() - recordingStartedAt;
    if (elapsedMs > durationMs + 500) return;
    const filename = `frame-${String(captured.length).padStart(6, "0")}.jpg`;
    captured.push({ filename, elapsedMs });
    const write = writeFile(path.join(outputDir, filename), Buffer.from(message.params.data, "base64"));
    frameWrites.push(write);
    await write;
  }
});

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.startScreencast", {
  format: "jpeg",
  quality: 92,
  maxWidth: 1920,
  maxHeight: 1080,
  everyNthFrame: 1,
});
await send("Page.navigate", { url });
await loaded;
await sleep(durationMs + 600);
await send("Page.stopScreencast");
await Promise.all(frameWrites);

if (captured.length < 10) {
  socket.close();
  chromium.kill("SIGKILL");
  throw new Error(`Only ${captured.length} frames were captured`);
}

const lines = [];
for (let index = 0; index < captured.length; index += 1) {
  const current = captured[index];
  const next = captured[index + 1];
  const durationSeconds = next
    ? Math.max(0.001, (next.elapsedMs - current.elapsedMs) / 1000)
    : Math.max(0.001, (durationMs - current.elapsedMs) / 1000);
  lines.push(`file '${path.resolve(outputDir, current.filename).replaceAll("'", "'\\''")}'`);
  lines.push(`duration ${durationSeconds.toFixed(6)}`);
}
lines.push(`file '${path.resolve(outputDir, captured.at(-1).filename).replaceAll("'", "'\\''")}'`);
await writeFile(path.join(outputDir, "frames.txt"), `${lines.join("\n")}\n`);
await writeFile(path.join(outputDir, "capture.json"), JSON.stringify({
  durationMs,
  frameCount: captured.length,
  firstFrameMs: captured[0].elapsedMs,
  lastFrameMs: captured.at(-1).elapsedMs,
}, null, 2));

socket.close();
chromium.kill("SIGKILL");
await sleep(100);
await rm(profileDir, { recursive: true, force: true }).catch(() => {});
console.log(JSON.stringify({ durationMs, frameCount: captured.length }));