import {vi} from "vitest";
import {fs} from "memfs";
import {type ExecSyncOptions} from "node:child_process";

import {FILENAME_OPTIONS} from "../../config.js";

export const createVideoSegment = (script: string, _execSyncOptions: ExecSyncOptions) => {
    const filenameRegex = new RegExp(`".+${FILENAME_OPTIONS.EXTENSION_NAME}"$`, "i");
    const filename = script.match(filenameRegex)![0];
    fs.writeFileSync(filename.slice(1, -1), "something")
};

export const mergeVideoSegments =
    vi.fn(
        (_segmentListFilename: string, outputFilename: string, _execSyncOptions: ExecSyncOptions) => {
            fs.writeFileSync(outputFilename, "something")
        }
    )

export const getVideoDuration = vi.fn(
    (_baseOutputPath: string, _file: string) => {
        throw new Error(`Mock return value for "getVideoDuration" is not implemented.`)
    })