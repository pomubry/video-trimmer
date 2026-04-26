import path from "node:path";

import {getVideoDuration} from "../services/childProcess.js";
import {checkVideoFile} from "../repositories/filesystem.js";
import {errorMsgFormatter, getSuggestedFilename, greenText, specialCharsRegex} from "./formatter.js";
import {processTimestamps} from "./timestamp.js";
import {FILENAME_OPTIONS} from "../config.js";

export const checkFileExtension = (videoFile: string) => {
    const extensionName = path.extname(videoFile).toLowerCase().slice(1);
    const extensionError = FILENAME_OPTIONS.SUPPORTED_EXTENSIONS.indexOf(extensionName);

    if (extensionError === -1) {
        throw new Error(
            errorMsgFormatter(`The video format ${extensionName} is not supported.
Only the following extensions are valid:
    ${FILENAME_OPTIONS.SUPPORTED_EXTENSIONS}`)
        )
    }
}

export const checkVideoFilename = (videoFilename: string) => {
    const isInvalidFilename = specialCharsRegex.test(videoFilename)

    if (isInvalidFilename) {
        const newFilename = videoFilename.replace(specialCharsRegex, "_");
        throw new Error(
            errorMsgFormatter(`The video filename should not contain any special characters.
${getSuggestedFilename(newFilename)}`)
        )
    }
};

export const checkVideoDurationErrors = (videoSegments: string[], videoSegmentDurations: number[], baseName: string) =>
    videoSegments.reduce((acc, file, index) => {
        const durationInSeconds = getVideoDuration(baseName, file);

        if (videoSegmentDurations[index] === undefined) {
            throw new Error(
                errorMsgFormatter(`Duration of video segment for index ${index} might be undefined.`)
            )
        }

        const difference = Math.abs(videoSegmentDurations[index] - durationInSeconds).toFixed(4);
        const isGreaterThanOne = Number(difference) > 1;

        console.log(`\n[\x1b[94m${file}\x1b[0m] Duration: Computed (${(
                videoSegmentDurations[index]
            )}) vs Actual (${(
                durationInSeconds
            )}). Difference: ${difference} seconds.${
                isGreaterThanOne
                    ? "\x1b[31m Possible Error!\x1b[0m"
                    : "\x1b[32m Result Okay!\x1b[0m"
            }`
        );

        if (isGreaterThanOne) {
            return [...acc, file]
        }

        return acc
    }, [] as string[]);

export const checkTimestampInput = (timestampArr: string[]) => {
    const res = processTimestamps(timestampArr);

    checkFileExtension(res.videoFilename);
    checkVideoFilename(res.videoFilename);
    checkVideoFile(res.videoFilename);

    return res
}