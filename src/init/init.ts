import {main} from "./main.js";
import {readTimestamps, renameFile} from "../repositories/filesystem.js";
import {getTimestampArray} from "../utils/timestamp.js";
import {checkTimestampInput} from "../utils/validator.js";
import {errorMsgFormatter} from "../utils/formatter.js";
import {suspendSystem} from "../services/childProcess.js";

import {APP_OPTIONS} from "../config.js";

import {EndLogError} from "../types/errors.js";

export const init = () => {
    const ts = readTimestamps();
    const errorLogger = new EndLogError()

    if (ts.includes(APP_OPTIONS.BATCH_SEPARATOR)) {
        const timestampBatch = getTimestampArray(ts, APP_OPTIONS.BATCH_SEPARATOR);

        const mainArgs = timestampBatch
            .map((ts) => getTimestampArray(ts, "\n"))
            .map(timestampArr => {
                const args = checkTimestampInput(timestampArr);
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

            main(arg, errorLogger.addError)
        })
    } else {
        const timestampArr = getTimestampArray(ts, "\n");
        const args = checkTimestampInput(timestampArr);
        renameFile(timestampArr, args.videoFilename)
        main(args, errorLogger.addError)
    }

    errorLogger.logErrors();
    suspendSystem();
}