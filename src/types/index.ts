import {FFMPEG_OPTIONS} from "../config.js";

export interface MergeOptions {
    videoSegments: string[],
    basename: string,
    isVideoSegmentKept: string,
    totalTime: number,
    timeDiff: number
}

export interface FFmpegArguments {
    input: string,
    tsArray: string[][],
    dir: string[],
}

export type FFmpegConfig = typeof FFMPEG_OPTIONS

export type RemoveVideoSegmentArguments = Omit<MergeOptions, "totalTime" | "timeDiff">