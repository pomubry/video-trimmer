import {vi} from "vitest";
import {fs} from "memfs";
import {type ExecSyncOptions} from "node:child_process";

export const mergeVideoSegments =
    vi.fn(
        (_segmentListFilename: string, outputFilename: string, _execSyncOptions: ExecSyncOptions) => {
            fs.writeFileSync(outputFilename, "something")
        }
    )

export const getVideoDuration = vi.fn(
    (_baseOutputPath: string, _file: string) => {
        throw new Error(`Mock return value for ${getVideoDuration.name} is not implemented.`)
    })