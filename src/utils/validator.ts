import path from "node:path";

import {getVideoDuration} from "../services/childProcess.js";
import {checkVideoFile, getFileSize, renameFile} from "../repositories/filesystem.js";
import {greenText, redText, blueText, errorMsgFormatter, getSuggestedFilename, specialCharsRegex} from "./formatter.js";
import {processTimestamps} from "./timestamp.js";
import {APP_OPTIONS, FILENAME_OPTIONS} from "../config.js";

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

        if (APP_OPTIONS.AUTO_RENAME) {
            renameFile(videoFilename, newFilename);
            return;
        }

        throw new Error(
            errorMsgFormatter(`The video filename should not contain any special characters.
${getSuggestedFilename(newFilename)}`)
        )
    }
};

export const checkVideoDurationErrors = (videoSegments: string[], videoSegmentDurations: number[], baseName: string, addError: (msg: string) => void) =>
    videoSegments.reduce((acc, file, index) => {
        const durationInSeconds = getVideoDuration(baseName, file);

        if (videoSegmentDurations[index] === undefined) {
            throw new Error(
                errorMsgFormatter(`Duration of video segment for index ${index} might be undefined.`)
            )
        }

        const difference = Math.abs(videoSegmentDurations[index] - durationInSeconds).toFixed(4);
        const isGreaterThanOne = Number(difference) > 1;

        const message = `
[${blueText(file)}] Duration: 
    - Computed: ${(videoSegmentDurations[index])} seconds
    - Actual: ${(durationInSeconds)} seconds
    - Difference: ${difference} seconds.${
            isGreaterThanOne
                ? redText(" Possible Error!")
                : greenText(" Result Okay!")
        }`

        console.log(message);

        if (isGreaterThanOne) {
            addError(message)
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

export const checkFileSizeDiff = (oldFile: string, newFile: string, addError: (message: string) => void) => {
    const oldSize = getFileSize(oldFile);
    const newSize = getFileSize(newFile);
    const diffInMB = ((oldSize - newSize) / (1024 * 1024));

    if (diffInMB >= 0) {
        return `Saved ${greenText(diffInMB.toFixed(3))} MB`
    } else {
        const message = `
File [${blueText(newFile)}]:
    New file size is bigger than the original file by ${redText(Math.abs(diffInMB).toFixed(3))} MB.`
        addError(message)
        return message
    }
}