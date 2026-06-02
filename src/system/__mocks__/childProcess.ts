import { vi } from "vitest";
import { fs } from "memfs";

import { FILENAME_OPTIONS } from "../../config.js";

export const createVideoSegment = (script: string[]) => {
    const filenameRegex = new RegExp(`_\\d{3,4}.${FILENAME_OPTIONS.EXTENSION_NAME}`, "i");
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
        (_segmentListFilename: string, outputFilename: string) => {
            fs.writeFileSync(outputFilename, "something")
        }
    )

export const getVideoDuration = vi.fn(
    () => {
        throw new Error(`Mock return value for "getVideoDuration" is not implemented.`)
    })

export const suspendSystem = () => vi.fn();