import path from "node:path";

import { checkVideoFile } from "../system/filesystem.js";
import { errorMsgFormatter, greenText, removeIndent } from "./formatter.js";
import { APP_OPTIONS, FFMPEG_OPTIONS, FILENAME_OPTIONS } from "../config.js";

import type { MainArgs } from "../types/index.js";

// Timestamp in HMS format: '12:34:56.123456789 12:34:56.123456789'
const timestampPattern = "\\d{2}:\\d{2}:\\d{2}\\.\\d{3,9}"; // note double backslash
const timestampRegex = new RegExp(`^${timestampPattern} ${timestampPattern}$`);

const specialCharsRegex = /[`~!@#$%^&*()=[\]{}\\|;:'",<>?]/g;

/*
Check if the 1st timestamp of the current iteration is equal to the 2nd timestamp of the previous iteration.
i.e.,
"00:01:00.000000000 00:05:00.000000000"
"00:05:00.00000000 00:10:00.000000000"
will give an error.
*/
const checkDuplicateTimestamp = (
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
            message: `\nThe 2nd timestamp from line ${(idx).toString()} might be undefined.`
        }
    }

    if (timestamp1 === prevTimestamp2) {
        return {
            isDuplicate: true,
            message: removeIndent(`
            Duplicate timestamp found at line ${(idx).toString()} and line ${(idx + 1).toString()}:
                --- Two instances of timestamp [${timestamp1}] were found.`)
        }
    }

    return {
        isDuplicate: false,
        message: ``
    }
}

const hmsToSeconds = (sexagesimal: string) => {
    const timeArr = sexagesimal.split(":");
    return timeArr.reduce(
        (acc, current, index) => acc + Number(current) * Math.pow(60, 2 - index),
        0
    );
}

/*
Split the strings inside the array by whitespaces.
The result would be in the form: [timestamp1,timestamp2]
*/
const getTimestampPair = (timestamp: string, offset: number) => {
    let timestampPair = timestamp.split(/\s/);

    if (offset !== 0) {
        timestampPair = timestampPair.map((singleTs) => {
            const tsInSeconds = hmsToSeconds(singleTs);
            return secondsToHms(tsInSeconds + offset);
        });
    }

    return timestampPair;
};

const processTimestamps = (timestampArr: string[]) => {
    let tsError = false;
    let totalTime = 0;
    const videoSegmentDurations: number[] = [];
    let videoFilename = "";

    if (timestampArr.length <= 1) {
        tsError = true;
        console.error("Unexpected error: Timestamp array is empty.")
    }

    const timestampPairs = timestampArr.reduce<string[][]>((acc, timestamp, idx) => {
        if (idx === 0) {
            videoFilename = timestamp;
            return [];
        }

        if (timestamp === "" && idx === timestampArr.length - 1) return acc;

        if (timestampRegex.test(timestamp)) {
            const timestamps = timestamp.split(/\s/g) as [string, string];

            // Convert the time string format into seconds.
            const timestamp1 = hmsToSeconds(timestamps[0]);
            const timestamp2 = hmsToSeconds(timestamps[1]);

            // Check for all possible timestamp errors
            if (timestamp2 <= timestamp1) {
                tsError = true;
                const unindent = removeIndent(`
                Timestamp duration error at line ${(idx + 1).toString()}:
                    --- Timestamp [${timestamps[1]}] should be greater than [${timestamps[0]}].`)

                console.error(unindent);
                return acc
            }

            const prevTimestamp = timestampArr[idx - 1]
            if (prevTimestamp === undefined) throw new Error(errorMsgFormatter("Unexpected error: Previous timestamp is undefined."))

            const res = checkDuplicateTimestamp(prevTimestamp, timestamps[0], idx)
            if (res.isDuplicate) {
                tsError = true;
                console.error(res.message)
                return acc
            }

            totalTime += timestamp2 - timestamp1;
            videoSegmentDurations.push(timestamp2 - timestamp1);

            return [...acc, getTimestampPair(timestamp, FFMPEG_OPTIONS.OFFSET)];
        } else {
            tsError = true;
            console.error(`\nInvalid timestamp format at line ${(idx + 1).toString()}: [${timestamp}].`);
            return acc
        }
    }, []);

    if (tsError) throw new Error(
        errorMsgFormatter('Timestamp errors were found.')
    )

    return { timestampPairs, totalTime, videoSegmentDurations, videoFilename };
}

const checkFileExtension = (videoFilename: string) => {
    const extensionName = path.extname(videoFilename).toLowerCase().slice(1);
    const extensionError = FILENAME_OPTIONS.SUPPORTED_EXTENSIONS.indexOf(extensionName);

    if (extensionError === -1) {
        const formatter = new Intl.ListFormat("en", {
            style: "long",
            type: "conjunction",
        });
        const extensionList = formatter.format(FILENAME_OPTIONS.SUPPORTED_EXTENSIONS);

        const unindent = removeIndent(`The video format ${extensionName} is not supported.
        Only the following extensions are valid:
            ${extensionList}`)
        throw new Error(
            errorMsgFormatter(unindent)
        )
    }
}

const getSuggestedFilename = (videoFilename: string) => `Try renaming your filename to [${greenText(videoFilename)}] instead.`

const checkVideoFilename = (videoFilename: string) => {
    const isInvalidFilename = specialCharsRegex.test(videoFilename)

    if (isInvalidFilename) {
        const newFilename = videoFilename.replace(specialCharsRegex, "");

        if (APP_OPTIONS.AUTO_RENAME) return newFilename;

        const unindent = removeIndent(`The video filename should not contain any special characters.
        ${getSuggestedFilename(newFilename)}`
        )

        throw new Error(errorMsgFormatter(unindent))
    }
};

export const getMainArgs = (timestampArr: string[]) => {
    const res: MainArgs = {
        timestamp: "",
        ...processTimestamps(timestampArr)
    };

    checkFileExtension(res.videoFilename);
    checkVideoFile(res.videoFilename);

    const newFilename = checkVideoFilename(res.videoFilename);
    if (newFilename !== undefined)
        res.videoFilename = newFilename;

    const timestampPairs = res.timestampPairs.map((pair) => pair.join(" "));
    res.timestamp = [newFilename ?? res.videoFilename, ...timestampPairs].join("\n");

    return res
}

export const secondsToHms = (durationInSeconds: number) => {
    const hour = Math.floor(durationInSeconds / 3600);
    const minute = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = (durationInSeconds % 3600) % 60;

    const hourFormat = hour < 10 ? "0" + hour.toString() : hour.toString();
    const minuteFormat = minute < 10 ? "0" + minute.toString() : minute.toString();
    const secondsFormat = seconds < 10 ? "0" + seconds.toFixed(3) : seconds.toFixed(3);

    return `${hourFormat}:${minuteFormat}:${secondsFormat}`;
};

export const getTimestampArray = (timestamp: string, separator: string | RegExp) => timestamp
    .split(separator)
    .map((ts) => ts.trim())
    .filter(Boolean)