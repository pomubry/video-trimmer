import {fs} from "memfs";
import {type ExecSyncOptions} from "node:child_process";

export const mergeVideoSegments = (_segmentListFilename: string, outputFilename: string, _execSyncOptions: ExecSyncOptions) => {
    fs.writeFileSync(outputFilename, "something")
}
