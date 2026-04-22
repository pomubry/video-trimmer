import {errorMsgFormatter, sexagesimalToSeconds, timestampRegex} from "./formatter.js";
import {FFMPEG_OPTIONS} from "../config.js";
import * as formatter from "./formatter.js";

/*
Check if the 1st timestamp of the current iteration is equal to the 2nd timestamp of the previous iteration.
i.e.,
"00:01:00.000000000 00:05:00.000000000"
"00:05:00.00000000 00:10:00.000000000"
will give an error.
*/
const isDuplicateTimestamp = (
    prevTimestamp: string,
    timestamp1: string,
    idx: number
): {
    isDuplicate: boolean,
    message: string,
} => {
    const prevTimestamp2 = prevTimestamp.split(/\s/)[1]
    if (prevTimestamp2 === undefined && idx > 1) {
        return {
            isDuplicate: true,
            message: `\nThe 2nd timestamp from line ${idx} might be undefined.`
        }
    }

    if (timestamp1 === prevTimestamp2) {
        return {
            isDuplicate: true,
            message: `
Duplicate timestamp found at line ${idx} and line ${idx + 1}:
    --- Two instances of timestamp [${timestamp1}] were found.`
        }
    }

    return {
        isDuplicate: false,
        message: ``
    }
}

/*
Check if the 2nd timestamp in each index is lower than the 1st timestamp. Each index will be split first by whitespace to make it into a subarray.

i.e., [[00:06:00.000000000,00:05:00.000000000]] will give an error

because 00:05:00.000000000 is lesser/earlier than 00:06:00.000000000. Time format will be converted to seconds for evaluation.

If the format is valid, add each videos' duration to the variable 'totalTime' for the output's expected total duration.
*/
export const processTimestamps = (timestampArr: string[]) => {
    let tsError = false;
    let totalTime = 0;
    let videoSegmentDurations: number[] = [];

    let arr = timestampArr.reduce((acc, timestamp, idx) => {
        if (idx === 0) return [...acc, timestamp];
        if (timestamp === "" && idx === timestampArr.length - 1) return acc;

        if (timestampRegex.test(timestamp)) {
            let timestamps = timestamp.split(/\s/g) as [string, string];

            // Convert the time string format into seconds.
            let timestamp1 = sexagesimalToSeconds(timestamps[0]);
            let timestamp2 = sexagesimalToSeconds(timestamps[1]);

            // Check for all possible timestamp errors
            if (timestamp2 <= timestamp1) {
                tsError = true;
                console.error(`
Timestamp duration error at line ${idx + 1}:
    --- Timestamp [${timestamps[1]}] should be greater than [${timestamps[0]}].`
                );
                return acc
            }

            const prevTimestamp = timestampArr[idx - 1] || "";
            if (!timestampRegex.test(prevTimestamp) && idx > 1) {
                tsError = true;
                return acc
            }

            const res = isDuplicateTimestamp(prevTimestamp, timestamps[0], idx)
            if (res.isDuplicate) {
                tsError = true;
                console.error(res.message)
                return acc
            }

            totalTime += timestamp2 - timestamp1;
            videoSegmentDurations.push(timestamp2 - timestamp1);

            return [...acc, timestamp];
        } else {
            tsError = true;
            console.error(`\nInvalid timestamp format at line ${idx + 1}: [${timestamp}].`);
            return acc
        }
    }, [] as string[]);

    if (tsError) throw new Error(
        errorMsgFormatter("Timestamps errors were found.")
    )

    return {arr, totalTime, videoSegmentDurations};
}

export const getTimestampPairs = (arr: string[], offset: number) => arr.map((ts) => {
    let tsArr = ts.split(/\s/);

    if (offset !== 0) {
        tsArr = tsArr.map((singleTs) => {
            let tsInSeconds = formatter.sexagesimalToSeconds(singleTs);
            return formatter.sexagesimalFormat(tsInSeconds + FFMPEG_OPTIONS.OFFSET);
        });
    }

    return tsArr;
});