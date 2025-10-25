import {extensionName, fps, hevc} from "../lib/config.js";

import type {FFmpegArguments} from "../types/index.js";

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

export const generateFFmpegScripts = (
    {input, output, tsArray, path, dir,}: FFmpegArguments
) => {
    let counter = 0;
    let ffmpegScripts: string[] = [];

    tsArray.forEach((ts) => {
        counter++;
        let number = "";

        if (counter < 10) {
            number = "00" + counter;
        } else if (counter < 100) {
            number = "0" + counter;
        } else {
            number += `${counter}`;
        }

        // Check first if the fileName already exists. If it does, skip.
        const outputFilename = `${output}_${number}.${extensionName}`;
        if (dir.includes(outputFilename)) return;

        const cmd = [
            "ffmpeg -v warning -stats",
            `-ss ${ts[0]}`,
            `-to ${ts[1]}`,
            `-i "${input}"`,
            `${hevc ? "-crf 23 -c:v hevc" : "-crf 18 -c:v h264"}`,
            `${fps === 0 ? "" : `-r ${fps}`}`,
            `"${path}/${outputFilename}"`
        ];

        ffmpegScripts.push(cmd.filter(Boolean).join(" "));
    });

    return ffmpegScripts
}

export const getVideoSegmentRegExp = (nameOnly: string) => {
    const pattern = `${nameOnly}_\\d{3,4}\\.${extensionName}`;
    return new RegExp(pattern);
}

export const errorMsgFormatter = (message: string) => `\n${message}\n`

