import type {ExecSyncOptions} from "node:child_process";
import type {EndErrorLogger} from "./errors.js";

export interface FFmpegArguments {
    input: string,
    timestampPairs: string[][],
    videoSegments: string[],
}

export interface MainArgs {
    timestamp: string,
    timestampPairs: string[][],
    totalTime: number,
    videoSegmentDurations: number[],
    videoFilename: string
}

export interface FFmpegConfig {
    OFFSET: number,
    FPS: number,
    HEVC: boolean,
    EXEC_SYNC_OPTIONS: ExecSyncOptions
}

export type AddError = Pick<EndErrorLogger, "addError">["addError"]