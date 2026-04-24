import {main} from "./main.js";
import {readTimestamps} from "../repositories/filesystem.js";
import {getTimestampArray} from "../utils/timestamp.js";
import {checkTimestampInput} from "../utils/validator.js";
import {APP_OPTIONS} from "../config.js";

export const init = () => {
    const ts = readTimestamps();

    if (ts.includes(APP_OPTIONS.BATCH_SEPARATOR)) {
        const timestampBatch = ts
            .split(APP_OPTIONS.BATCH_SEPARATOR)
            .filter(ts => ts.trim() !== "")
            .map(getTimestampArray)

        const mainArgs = timestampBatch.map(checkTimestampInput)
        mainArgs.forEach(arg => main(arg))
    } else {
        const timestampArr = getTimestampArray(ts);
        const args = checkTimestampInput(timestampArr);
        main(args)
    }
}