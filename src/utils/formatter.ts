import path from "node:path";

import {FILENAME_OPTIONS} from "./config.js";

import type {FFmpegArguments, FFmpegConfig} from "../types/index.js";

// Timestamp in sexagesimal format: '12:34:56.123456789 12:34:56.123456789'
const timestampPattern = "\\d{2}:\\d{2}:\\d{2}\\.\\d{3,9}"; // note double backslash
export const timestampRegex = new RegExp(`^${timestampPattern} ${timestampPattern}$`);

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

export const generateFFmpegScripts = (
    {input, tsArray, dir,}: FFmpegArguments,
    {FPS, HEVC}: FFmpegConfig
) => {
    let counter = 0;
    let ffmpegScripts: string[] = [];
    const basename = path.parse(input).name

    tsArray.forEach((ts) => {
        counter++;
        let number = videoCounter(counter)

        // Check first if the fileName already exists. If it does, skip.
        const outputFilename = `${basename}_${number}.${FILENAME_OPTIONS.EXTENSION_NAME}`;
        if (dir.includes(outputFilename)) return;

        const cmd = [
            "ffmpeg -v warning -stats",
            `-ss ${ts[0]}`,
            `-to ${ts[1]}`,
            `-i "${input}"`,
            `${HEVC ? "-crf 23 -c:v hevc" : "-crf 18 -c:v h264"}`,
            `${FPS === 0 ? "" : `-r ${FPS}`}`,
            `"${path.join(basename, outputFilename)}"`
        ];

        ffmpegScripts.push(cmd.filter(Boolean).join(" "));
    });

    return ffmpegScripts
}

export const getVideoSegmentRegExp = (nameOnly: string, extensionName: string) => {
    const pattern = `${nameOnly}_\\d{3,4}\\.${extensionName}`;
    return new RegExp(pattern);
}

export const outputFilenameFormatter = (basename: string) => `${basename} (Result).${FILENAME_OPTIONS.EXTENSION_NAME}`;

export const errorMsgFormatter = (message: string) => `\n${message}\n`

