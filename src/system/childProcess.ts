import path from "node:path";
import { spawnSync } from "node:child_process";

import { APP_OPTIONS } from "../config.js";

import type { ExecSyncOptions } from "node:child_process";

export const createVideoSegment = (
  args: string[],
  execSyncOptions: ExecSyncOptions,
) => spawnSync("ffmpeg", args, execSyncOptions);

export const mergeVideoSegments = (
  segmentListFilename: string,
  outputFilename: string,
  execSyncOptions: ExecSyncOptions,
) => {
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
};

export const getVideoDuration = (baseOutputPath: string, file: string) => {
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
};

export const suspendSystem = () => {
  if (APP_OPTIONS.AUTO_SUSPEND) {
    switch (process.platform) {
      case "linux":
        spawnSync("systemctl", ["suspend"]);
        break;
      default:
        break;
    }
  }
};
