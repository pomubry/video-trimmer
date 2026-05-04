import fs from "node:fs";
import path from "node:path";

import {blueText, errorMsgFormatter} from "../utils/formatter.js";
import {APP_OPTIONS, FILENAME_OPTIONS} from "../config.js";

export const readTimestamps = () => {
    let ts = "";

    try {
        ts = fs.readFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, "utf-8");
    } catch (error) {
        throw new Error(
            errorMsgFormatter(`The file [${FILENAME_OPTIONS.TIMESTAMPS_FILENAME}] was not found!`)
        );
    }

    return ts;
}

export const checkVideoFile = (videoFile: string) => {
    if (!fs.readdirSync(".").includes(videoFile)) {
        throw new Error(
            errorMsgFormatter(`${videoFile} was not found. Make sure to put the correct video filename at the top (Line 1) of ${FILENAME_OPTIONS.TIMESTAMPS_FILENAME}.`)
        );
    }
}

export const createSegmentList = (videoSegments: string[], basename: string) => {
    let myList = "";
    videoSegments.forEach(
        (file, index) =>
            (myList += `${index !== 0 ? "\n" : ""}file '${path.join(basename, file)}'`)
    );
    fs.writeFileSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, myList);
}

export const removeSegmentList = () => {
    fs.rmSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME);
}

export const removeOutputIfExists = (outputFile: string) => {
    if (fs.readdirSync(".").includes(outputFile)) {
        console.log(`\nThe file [${blueText(outputFile)}] already exists. Removing file before making a new one. . .`);
        fs.rmSync(outputFile);
    }
}

export const removeVideoSegments = (baseName: string) => {
    if (!APP_OPTIONS.KEEP_VIDEO_SEGMENTS) {
        fs.rmSync(baseName, {recursive: true, force: true});
    }
}

export const createTimestampCopy = (outputFilename: string, content: string) => {
    fs.writeFileSync(`${outputFilename}.txt`, `${content}`, {encoding: "utf-8"});
};

export const renameFile = (timestampArr: string[], newFilename: string) => {
    if (timestampArr[0] === undefined) throw new Error("Renaming file failed because of empty timestamp.");
    if (timestampArr[0] === newFilename) return;

    fs.renameSync(timestampArr[0], newFilename)
}

export const getFileSize = (filename: string) => fs.statSync(filename).size