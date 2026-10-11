import type { ExecSyncOptions } from "node:child_process";
import type { EndErrorLogger } from "../utils/errors/endErrorLogger.js";

export interface FFmpegArguments {
  input: string;
  timestampPairs: string[][];
  videoSegments: string[];
}

export interface MainArg {
  timestampPairs: string[][];
  videoSegmentDurations: number[];
  videoFilename: string;
  oldFilename: string;
}

export interface FFmpegConfig {
  OFFSET: number;
  FPS: number;
  HEVC: boolean;
  EXEC_SYNC_OPTIONS: ExecSyncOptions;
}

export type AddError = Pick<EndErrorLogger, "addError">["addError"];
