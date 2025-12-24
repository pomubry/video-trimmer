import fs from "node:fs";

import {FFMPEG_OPTIONS, FILENAME_OPTIONS} from "../utils/config.js";
import {mergeVideoSegments} from "../services/childProcess.js";
import {errorMsgFormatter, outputFilenameFormatter, sexagesimalFormat} from "../utils/formatter.js";

import type {MergeOptions, RemoveVideoSegmentArguments} from "../types/index.js";

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

// Check if the video specified is present in the current directory.
export const checkVideoFile = (videoFile: string) => {
    if (!fs.readdirSync(".").includes(videoFile)) {
        throw new Error(
            errorMsgFormatter(`${videoFile} was not found. Make sure to put the correct video filename at the top (Line 1) of ${FILENAME_OPTIONS.TIMESTAMPS_FILENAME}.`)
        );
    }
}

const removeVideoSegments = (
    {isVideoSegmentKept, nameOnly, videoSegments}: RemoveVideoSegmentArguments
) => {
    if (isVideoSegmentKept === "no") {
        console.log("\nRemoving video segments:");
        fs.rmSync(nameOnly, {recursive: true, force: true});
        console.log(`\nTotal video segments removed: ${videoSegments.length}`);
    } else {
        console.log("\nVideo segments will be kept.");
    }
}

const createTimestampCopy = (timestampsFilename: string, outputFilename: string) => {
    fs.copyFileSync(`${timestampsFilename}`, `${outputFilename}.txt`);
};

const createSegmentList = (videoSegments: string[], baseOutputPath: string) => {
    let myList = "";
    videoSegments.forEach(
        (file, index) =>
            (myList += `${index !== 0 ? "\n" : ""}file '${baseOutputPath}/${file}'`)
    );
    fs.writeFileSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, myList);

    console.log(`\n${FILENAME_OPTIONS.SEGMENT_LIST_FILENAME} has been created temporarily. . .`);
}

export const mergeVideos = (mergeOptions: MergeOptions) => {
    const {
        videoSegments,
        nameOnly,
        baseOutputPath
    } = mergeOptions;

    createSegmentList(videoSegments, baseOutputPath);

    const outputFile = outputFilenameFormatter(nameOnly);

    // Concatenate all the videos listed in the mylist.txt.
    if (fs.readdirSync(".").includes(outputFile)) {
        console.log(`\nThe file [\x1b[94m${outputFile}\x1b[0m] already exists. Removing file before making a new one. . .`);

        fs.rmSync(outputFile);
    }

    console.log("\nMerging video segments. . .");

    mergeVideoSegments(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, outputFile, FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS)

    console.log(`
\x1b[32m${outputFile}\x1b[0m has been created.
    
Removing ${FILENAME_OPTIONS.SEGMENT_LIST_FILENAME}. . .`
    );

    fs.rmSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME);

    const {totalTime, timeDiff, ...rest} = mergeOptions

    removeVideoSegments(rest)
    createTimestampCopy(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, nameOnly);

    console.log(`\nCreating copy of ${FILENAME_OPTIONS.TIMESTAMPS_FILENAME}. . .`)

    let sexagesimal = sexagesimalFormat(totalTime);

    console.log(`
Video trimmer has finished. Video output should be about ${sexagesimal} long. 
Total processing time: ${sexagesimalFormat(timeDiff / 1000)}`
    );
};
