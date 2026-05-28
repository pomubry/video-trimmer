import { vi } from "vitest";
import { fs } from "memfs";

import { FILENAME_OPTIONS } from "../../config.js";

import { type ExecSyncOptions } from "node:child_process";

export const createVideoSegment = (script: string[], _execSyncOptions: ExecSyncOptions) => {
    const filenameRegex = new RegExp(`_\\d{3,4}\.${FILENAME_OPTIONS.EXTENSION_NAME}`, "i");
    const filename = script.find(scr => {
        return filenameRegex.test(scr)
    });

    if (filename === undefined) {
        throw new Error("Filename not found during the testing.")
    }

    fs.writeFileSync(filename.slice(), "something")
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

export const suspendSystem = () => vi.fn();