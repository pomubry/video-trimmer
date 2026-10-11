import path from "node:path";
import { spawnSync } from "node:child_process";

import type { ExecSyncOptions } from "node:child_process";

export function createVideoSegment(
  args: string[],
  execSyncOptions: ExecSyncOptions,
) {
  return spawnSync("ffmpeg", args, execSyncOptions);
}

export function mergeVideoSegments(
  segmentListFilename: string,
  outputFilename: string,
  execSyncOptions: ExecSyncOptions,
) {
  const args = [
    "-v",
    "warning",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    segmentListFilename,
    "-c",
    "copy",
    outputFilename,
  ];
  spawnSync(`ffmpeg`, args, execSyncOptions);
}

export function getVideoDuration(baseOutputPath: string, file: string) {
  const fullPath = path.join(baseOutputPath, file);
  const args = [
    "-v",
    "warning",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    fullPath,
  ];
  const res = spawnSync("ffprobe", args, { encoding: "utf8" });

  return Number(res.stdout);
}

export function suspendSystem() {
  switch (process.platform) {
    case "linux":
      spawnSync("systemctl", ["suspend"]);
      break;
    default:
      break;
  }
}
