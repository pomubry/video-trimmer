import {FFMPEG_OPTIONS} from "../utils/config.js";

export interface MergeOptions {
    videoSegments: string[],
    nameOnly: string,
    baseOutputPath: string,
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