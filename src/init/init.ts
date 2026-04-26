import {main} from "./main.js";
import {readTimestamps} from "../repositories/filesystem.js";
import {getTimestampArray} from "../utils/timestamp.js";
import {checkTimestampInput} from "../utils/validator.js";
import {errorMsgFormatter} from "../utils/formatter.js";
import {APP_OPTIONS} from "../config.js";

export const init = () => {
    const ts = readTimestamps();

    if (ts.includes(APP_OPTIONS.BATCH_SEPARATOR)) {
        const timestampBatch = ts
            .split(APP_OPTIONS.BATCH_SEPARATOR)
            .map((ts) => ts.trim())

        const mainArgs = timestampBatch
            .map(getTimestampArray)
            .map(checkTimestampInput)

        mainArgs.forEach((arg, i) => {
            if (timestampBatch[i] === undefined)
                throw new Error(
                    errorMsgFormatter(
                        `Index ${i} of the timestamp batch is undefined.${timestampBatch}`
                    )
                )

            main({
                timestamp: timestampBatch[i],
                ...arg
            })
        })
    } else {
        const timestampArr = getTimestampArray(ts);
        const args = checkTimestampInput(timestampArr);
        main({
            timestamp: ts,
            ...args
        })
    }
}