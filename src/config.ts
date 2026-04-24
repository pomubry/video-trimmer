import type {ExecSyncOptions} from "node:child_process";

export const FFMPEG_OPTIONS: { OFFSET: number, FPS: number, HEVC: boolean, EXEC_SYNC_OPTIONS: ExecSyncOptions } =
    {
        OFFSET: 0, // offset in seconds.
        FPS: 0, // override in case of low fps from VFR inputs.
        HEVC: false, // encoding defaults to h264.
        EXEC_SYNC_OPTIONS: {stdio: "inherit"}
    }

export const FILENAME_OPTIONS = {
    EXTENSION_NAME: "mp4",
    TIMESTAMPS_FILENAME: "timestamps.txt" as string,
    SEGMENT_LIST_FILENAME: "mylist.txt",
    SUPPORTED_EXTENSIONS: [
        "webm",
        "mkv",
        "flv",
        "avi",
        "ts",
        "mov",
        "mp4",
    ]
}

export const APP_OPTIONS = {
    IS_BATCH: false,
    IGNORE_ERRORS: true,
    KEEP_VIDEO_SEGMENTS: true,
    BATCH_SEPARATOR: "@batch@",
    BATCH_INPUT: "batch.txt"
}