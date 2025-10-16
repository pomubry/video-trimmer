import type {ExecSyncOptions} from "node:child_process";

export const offset = 0; // offset in seconds.
export const fps = 0; // override in case of low fps from VFR inputs.
export const hevc = false; // encoding defaults to h264.
export const execSyncOptions: ExecSyncOptions = {stdio: "inherit"};
export const supportedExtensions = [
    "webm",
    "mkv",
    "flv",
    "avi",
    "ts",
    "mov",
    "wmv",
    "amv",
    "mp4",
    "m4p",
    "m4v",
    "mpg",
    "mpeg"
];
export const extensionName = "mp4";
export const tsInput = "timestamps.txt"
export const segmentListFilename = "mylist.txt"
