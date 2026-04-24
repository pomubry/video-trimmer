import {FFMPEG_OPTIONS} from "../config.js";

export interface MergeOptions {
    videoSegments: string[],
    basename: string,
    videoDuration: number,
    elapsedTime: number
}

export interface FFmpegArguments {
    input: string,
    timestampPairs: string[][],
    videoSegments: string[],
}

export type FFmpegConfig = typeof FFMPEG_OPTIONS

export type RemoveVideoSegmentArguments = Omit<MergeOptions, "videoDuration" | "elapsedTime">