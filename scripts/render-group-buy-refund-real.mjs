import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const assetsDir = process.env.TUTORIAL_CAPTURE_DIR ?? "exports/group-buy-refund-customer-tutorial-assets";
const output = process.env.TUTORIAL_OUTPUT ?? "exports/group-buy-refund-customer-tutorial.mp4";
const audio = "artifacts/group-buy-refund-tutorial/public/audio/refund-tutorial-voiceover.mp3";
const ffmpeg = process.env.FFMPEG_PATH ?? "/tmp/updatesp-tools.eSKmJJ/node_modules/ffmpeg-static/ffmpeg";
const concatPath = path.join(assetsDir, "video.concat.txt");
const captionsPath = path.join(assetsDir, "captions.srt");
const playbackRate = 1.08;

await mkdir(path.dirname(output), { recursive: true });

const segments = [
  ["01-orders.png", 12 / playbackRate],
  ["02-refund-action.png", 4 / playbackRate],
  ["03-credit-method.png", 5 / playbackRate],
  ["04-crypto-method.png", 9 / playbackRate],
  ["05-status-requested.png", 4 / playbackRate],
  ["05-status-verifying.png", 5 / playbackRate],
  ["05-status-verification_failed.png", 5 / playbackRate],
  ["05-status-completed.png", 8 / playbackRate],
  ["05-status-completed.png", 6 / playbackRate],
];

const escapeConcat = value => value.replaceAll("'", "'\\''");
const concat = [];
for (const [file, duration] of segments) {
  concat.push(`file '${escapeConcat(path.resolve(assetsDir, file))}'`);
  concat.push(`duration ${duration}`);
}
concat.push(`file '${escapeConcat(path.resolve(assetsDir, segments.at(-1)[0]))}'`);
await writeFile(concatPath, `${concat.join("\n")}\n`);

const toTimestamp = seconds => {
  const ms = Math.round(seconds * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${s},${String(ms % 1000).padStart(3, "0")}`;
};
const captionLines = [
  [0.5, 3.5, "How to request a Group Buy refund"],
  [4.5, 8, "Open the customer portal and navigate to My Orders."],
  [8.5, 11.5, "Select the relevant confirmed Group Buy order."],
  [12.5, 15.2, "Locate and select 'I want a refund'."],
  [15.4, 18.95, "You can choose account credit, or crypto when enabled."],
  [19.1, 23.48, "For crypto, confirm the asset and enter your destination wallet."],
  [23.7, 25.83, "Review the amount and submit."],
  [26.5, 30.3, "Your request will show as 'Requested' while waiting for review."],
  [30.5, 35.52, "Once processing starts, the status updates to 'Being verified'."],
  [35.7, 41.22, "If there is an issue with the wallet or network, it shows as 'Verification failed'."],
  [41.4, 45.25, "When the refund is successfully sent, it shows as 'Completed'."],
  [45.5, 51.02, "Crypto completion may take time while blockchain confirmations arrive."],
  [52.5, 56.5, "You can return to the order at any time to check the status."],
];
const captions = captionLines.map(([start, end, text], index) => `${index + 1}\n${toTimestamp(start / playbackRate)} --> ${toTimestamp(end / playbackRate)}\n${text}\n`).join("\n");
await writeFile(captionsPath, captions);

const subtitlePath = captionsPath.replaceAll("\\", "/").replaceAll(":", "\\:");
const style = "FontName=DejaVu Sans,FontSize=26,PrimaryColour=&H00FFFFFF,OutlineColour=&H99000000,BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=34";
const args = [
  "-y", "-f", "concat", "-safe", "0", "-i", concatPath,
  "-i", audio,
  "-vf", `scale=1707:960:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:0:color=#0f1f38,subtitles=${subtitlePath}:force_style='${style}'`,
  "-map", "0:v:0", "-map", "1:a:0", "-r", "30",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
  "-filter:a", `atempo=${playbackRate}`,
  "-c:a", "aac", "-b:a", "192k", "-t", `${58 / playbackRate}`, output,
];

await new Promise((resolve, reject) => {
  const child = spawn(ffmpeg, args, { stdio: "inherit" });
  child.once("error", reject);
  child.once("exit", code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)));
});

console.log(JSON.stringify({ output, captionsPath, durationSeconds: Number((58 / playbackRate).toFixed(2)), playbackRate }));
