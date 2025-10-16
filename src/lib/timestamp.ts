import fs from "fs";

import {lineRegex, sexagesimalToSeconds} from "../utils/formatter.js";
import {tsInput} from "./config.js";

export const readTimestamps = () => {
    let ts = "";

    try {
        ts += fs.readFileSync(tsInput);
        if (ts.length === 0) throw new Error(`
        Timestamps not found!`);
    } catch (error) {
        throw error;
    }

    return ts;
}

/*
Check if the 1st timestamp of the current iteration is equal to the 2nd timestamp of the previous iteration.
i.e.,
"00:01:00.000000000 00:05:00.000000000"
"00:05:00.00000000 00:10:00.000000000"
will give an error.
*/
const isDuplicateTimestamp = (
    prevTimestamp: string | undefined,
    timestamp1: number,
    idx: number
) => {
    if (prevTimestamp === undefined) throw new Error(`
    The previous timestamp might be undefined.`);

    const prevTimeStamp2 = prevTimestamp.split(/\s/)[1]
    if (prevTimeStamp2 === undefined) throw new Error(`
    The 2nd timestamp from the previous iteration might be undefined.`);

    if (timestamp1 === Number(prevTimeStamp2)) {
        console.error(`
        Timestamp error at line ${idx} and line ${idx + 1}.
        --- Two instances of timestamp [${timestamp1}] were found.`);
        return true
    }

    return false
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

        if (lineRegex.test(timestamp)) {
            let timeStamps = timestamp.split(/\s/g) as [string, string];

            // Convert the time string format into seconds.
            let timeStamp1 = sexagesimalToSeconds(timeStamps[0]);
            let timeStamp2 = sexagesimalToSeconds(timeStamps[1]);

            // For listing all possible timestamps errors
            if (timeStamp2 <= timeStamp1) {
                tsError = true;
                console.error(`
                Timestamp duration error at line ${idx + 1}. 
                --- Timestamp [${timeStamps[1]}] should be greater than [${
                    timeStamps[0]
                }].`);
                return acc
            } else {
                totalTime += timeStamp2 - timeStamp1;
                videoSegmentDurations.push(timeStamp2 - timeStamp1);

                const res = isDuplicateTimestamp(acc[acc.length - 1], timeStamp1, idx)
                if (res) tsError = true;

                return [...acc, timestamp];
            }
        } else {
            tsError = true;
            console.error(`
            Invalid timestamp format at line ${idx + 1}: [${timestamp}].`
            );
            return acc
        }
    }, [] as string[]);

    if (tsError) {
        throw new Error(`
      = = = = = = = = = = H I N T S : = = = = = = = = = =
      
      * Line 1 should be the video filename including its extension. 
        Example: input.mp4.

      * Timestamp format for each line(except Line 1) should be [timestamp1 timestamp2] without the brackets AND with a single space inbetween.
        Example: 10:00:00.123456789 11:00:00.123456789

      * Timestamp format should be in sexagesimal system and the seconds' format should be 3-9 decimal places long. 
        Example: 12:34:56.123456789.

      * Don't leave any empty lines.
      `)
    }

    return {arr, tsError, totalTime, videoSegmentDurations};
}