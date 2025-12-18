import * as config from "../lib/config.js";

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

export type FFmpegConfig = Pick<typeof config, "fps" | "hevc" | "extensionName">

export type RemoveVideoSegmentArguments = Omit<MergeOptions, "totalTime" | "timeDiff">