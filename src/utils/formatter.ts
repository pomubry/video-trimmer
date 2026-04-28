import path from "node:path";
import os from "node:os"

import {timestampPattern} from "./timestamp.js";
import {FILENAME_OPTIONS} from "../config.js";

import type {FFmpegArguments, FFmpegConfig} from "../types/index.js";

export const redText = (text: string) => `\x1b[31m${text}\x1b[0m`
export const greenText = (text: string) => `\x1b[32m${text}\x1b[0m`
export const blueText = (text: string) => `\x1b[94m${text}\x1b[0m`
export const purpleText = (text: string) => `\x1b[35m${text}\x1b[0m`

export const sexagesimalFormat = (durationInSeconds: number) => {
    let hour = Math.floor(durationInSeconds / 3600);
    let minute = Math.floor((durationInSeconds % 3600) / 60);
    let seconds = (durationInSeconds % 3600) % 60;
    return `${hour < 10 ? "0" + hour : hour}:${
        minute < 10 ? "0" + minute : minute
    }:${seconds < 10 ? "0" + seconds.toFixed(4) : seconds.toFixed(3)}`;
};

export const sexagesimalToSeconds = (sexagesimal: string) => {
    if (!(new RegExp(`^${timestampPattern}$`)).test(sexagesimal)) {
        throw new Error(errorMsgFormatter("Invalid sexagesimal"));
    }

    let timeArr = sexagesimal.split(":");
    return timeArr.reduce(
        (acc, current, index) => acc + Number(current) * Math.pow(60, 2 - index),
        0
    );
};

export const videoCounter = (counter: number) => {
    let number = "";

    if (counter < 10) {
        number = "00" + counter;
    } else if (counter < 100) {
        number = "0" + counter;
    } else {
        number += `${counter}`;
    }

    return number
}

export const createFFmpegScripts = (
    {input, timestampPairs, videoSegments,}: FFmpegArguments,
    {FPS, HEVC}: FFmpegConfig
) => {
    const basename = path.parse(input).name

    return timestampPairs.reduce((acc, ts, idx) => {
        let counter = idx + 1;
        const number = videoCounter(counter)

        // Check first if the fileName already exists. If it does, skip.
        const outputFilename = `${basename}_${number}.${FILENAME_OPTIONS.EXTENSION_NAME}`;
        if (videoSegments.includes(outputFilename)) return acc;

        const encoder = os.platform() === "darwin" ? "hevc_videotoolbox" : "hevc"

        const cmd = [
            "ffmpeg -v warning -stats",
            `-ss ${ts[0]}`,
            `-to ${ts[1]}`,
            `-i "${input}"`,
            `${HEVC ? `-crf 23 -c:v ${encoder} -tag:v hvc1` : "-crf 18 -c:v h264"}`,
            `${FPS === 0 ? "" : `-r ${FPS}`}`,
            `"${path.join(basename, outputFilename)}"`
        ];

        return [...acc, cmd.filter(Boolean).join(" ")]
    }, [] as string[])
}

export const getVideoSegmentRegExp = (nameOnly: string, extensionName: string) => {
    const pattern = `${nameOnly}_\\d{3,4}\\.${extensionName}`;
    return new RegExp(pattern);
}

export const outputFilenameFormatter = (basename: string) => `${basename} (Result).${FILENAME_OPTIONS.EXTENSION_NAME}`;

export const errorMsgFormatter = (message: string) => `\n${message}\n`

export const listPossibleErrors = (possibleErrors: string[]) =>
    `
Please check the following files for possible errors:

${possibleErrors.map(err => "\t" + err).join("\n")}

Note that small disparities are normal and you may continue if you have not found an error in any video segments.`

export const specialCharsRegex = /[`~!@#$%^&*()=\[\]{}\\|/;:'",<>?]/g;

export const getSuggestedFilename = (filename: string) => `Try renaming your filename to [${greenText(filename)}] instead.`