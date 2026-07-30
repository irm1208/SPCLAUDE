#!/usr/bin/env node
// Generate the guided-tour voiceover clips.
//
//   node --env-file=.env scripts/generate-tour-voiceover.mjs [--only step-id]
//
// Primary engine: ElevenLabs (reads ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID
// from the environment — use --env-file=.env or export them). Falls back to
// Microsoft Edge neural TTS (msedge-tts, no key needed) with --engine edge.
//
// Reads narration from the tour script's JSON source of truth and writes one
// MP3 per step to artifacts/peps-anonymous/public/tour-audio/<id>.mp3, where
// GuidedTour.tsx expects them.

import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const narrationPath = path.join(root, "artifacts/peps-anonymous/src/pages/organiser-v2/tour/tour-narration.json");
const outputDir = path.join(root, "artifacts/peps-anonymous/public/tour-audio");

const argv = process.argv.slice(2);
const flag = name => {
  const at = argv.indexOf(name);
  return at !== -1 ? argv[at + 1] : null;
};
const only = flag("--only");
const engine = flag("--engine") ?? "elevenlabs";

// ─── ElevenLabs ──────────────────────────────────────────────────────────────
// eleven_multilingual_v2 is the quality model for narration; 128kbps MP3 is
// plenty for voice. Voice settings tuned for tutorial delivery: high
// stability (consistent tone across 33 separate clips) with natural style.
// speed: 1.0 = native pace; supported range 0.7–1.2. Override per run with
// --speed 1.15.
const ELEVEN_MODEL = "eleven_multilingual_v2";
const ELEVEN_OUTPUT = "mp3_44100_128";
const ELEVEN_SPEED = Number(flag("--speed") ?? 1.2);

async function synthesiseElevenLabs(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    throw new Error("ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID not set — run with node --env-file=.env, or use --engine edge");
  }
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${ELEVEN_OUTPUT}`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL,
        voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true, speed: ELEVEN_SPEED },
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs ${response.status}: ${detail.slice(0, 200)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

// ─── Edge TTS fallback (no API key required) ─────────────────────────────────
const EDGE_VOICE = "en-GB-SoniaNeural";

async function synthesiseEdge(text) {
  const require = createRequire(path.join(root, "scripts/package.json"));
  const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
  const tts = new MsEdgeTTS();
  await tts.setMetadata(EDGE_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = await tts.toStream(text, { rate: "+0%" });
  const chunks = [];
  for await (const chunk of audioStream) chunks.push(chunk);
  tts.close();
  return Buffer.concat(chunks);
}

// ─── Main ────────────────────────────────────────────────────────────────────
const synthesise = engine === "edge" ? synthesiseEdge : synthesiseElevenLabs;

const narration = JSON.parse(await readFile(narrationPath, "utf8"));
const steps = only ? narration.filter(step => step.id === only) : narration;
if (steps.length === 0) {
  console.error(only ? `No narration step named "${only}".` : "No narration entries found.");
  process.exit(1);
}

await mkdir(outputDir, { recursive: true });

let failures = 0;
for (const step of steps) {
  const outFile = path.join(outputDir, `${step.id}.mp3`);
  try {
    const audio = await synthesise(step.text);
    if (audio.length < 1000) throw new Error(`suspiciously small output (${audio.length} bytes)`);
    await writeFile(outFile, audio);
    console.log(`✓ ${step.id} (${(audio.length / 1024).toFixed(0)} KB)`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${step.id}: ${String(error.message ?? error).split("\n")[0]}`);
    if (engine !== "edge" && /401|invalid_api_key|quota/i.test(String(error.message))) {
      console.error("Stopping: the ElevenLabs key looks invalid or out of quota.");
      break;
    }
  }
}

console.log(`\n${steps.length - failures}/${steps.length} clips written via ${engine} to ${path.relative(root, outputDir)}`);
if (failures > 0) process.exit(1);
