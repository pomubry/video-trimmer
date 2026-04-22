import {FFMPEG_OPTIONS} from "../config.js";

export interface MergeOptions {
    videoSegments: string[],
    basename: string,
    isVideoSegmentKept: string,
    videoDuration: number,
    elapsedTime: number
}

export interface FFmpegArguments {
    input: string,
    timestampPairs: string[][],
    dir: string[],
}

export type FFmpegConfig = typeof FFMPEG_OPTIONS

export type RemoveVideoSegmentArguments = Omit<MergeOptions, "videoDuration" | "elapsedTime">

export interface ReadlineQA {
    question: string,
    answer: string,
}

export interface ReadlineCloseCallback {
    close: () => void
}

export type ReadlineMergeCallback = (answer: string, mergeOptions: MergeOptions, readlineInterface: ReadlineCloseCallback) => void;