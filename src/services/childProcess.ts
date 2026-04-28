import path from "node:path";
import {execSync} from "node:child_process";

import type {ExecSyncOptions} from "node:child_process";

export const createVideoSegment = (script: string, execSyncOptions: ExecSyncOptions) => execSync(script, execSyncOptions);

export const mergeVideoSegments = (segmentListFilename: string, outputFilename: string, execSyncOptions: ExecSyncOptions) => {
    execSync(`ffmpeg -v warning -f concat -safe 0 -i ${segmentListFilename} -c copy "${outputFilename}"`, execSyncOptions);
}

export const getVideoDuration = (baseOutputPath: string, file: string) => Number(
    execSync(
        `ffprobe -v warning -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${path.join(baseOutputPath, file)}"`
    ).toString()
)