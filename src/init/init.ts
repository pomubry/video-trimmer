import { main } from "./main.js";
import { readTimestamps, renameFile } from "../system/filesystem.js";
import { suspendSystem } from "../system/childProcess.js";
import { getMainArgs } from "../utils/timestamp.js";
import { errorMsgFormatter } from "../utils/formatter.js";
import { getTimestampArray } from "../utils/timestamp.js";
import { EndErrorLogger } from "../utils/endErrorLogger.js";
import { APP_OPTIONS } from "../config.js";

export const init = (endErrorLogger: EndErrorLogger) => {
    const ts = readTimestamps();

    if (ts.includes(APP_OPTIONS.BATCH_SEPARATOR)) {
        const timestampBatch = getTimestampArray(ts, APP_OPTIONS.BATCH_SEPARATOR);

        const mainArgs = timestampBatch
            .map((ts) => getTimestampArray(ts, "\n"))
            .map(timestampArr => {
                const args = getMainArgs(timestampArr);
                renameFile(timestampArr, args.videoFilename)
                return args
            })

        mainArgs.forEach((arg, i) => {
            if (timestampBatch[i] === undefined)
                throw new Error(
                    errorMsgFormatter(
                        `Index ${i} of the timestamp batch is undefined.${timestampBatch}`
                    )
                )

            main(arg, endErrorLogger.addError)
        })
    } else {
        const timestampArr = getTimestampArray(ts, "\n");
        const args = getMainArgs(timestampArr);
        renameFile(timestampArr, args.videoFilename)
        main(args, endErrorLogger.addError)
    }

    endErrorLogger.logErrors();
    suspendSystem();
}