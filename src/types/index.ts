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
    output: string
    tsArray: string[][],
    path: string,
    dir: string[],
}

export type RemoveVideoSegmentArguments = Omit<MergeOptions, "totalTime" | "timeDiff">