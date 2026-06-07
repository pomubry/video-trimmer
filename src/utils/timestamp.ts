import path from "node:path";

import { checkVideoFile } from "../system/filesystem.js";
import { errorMsgFormatter, greenText, removeIndent } from "./formatter.js";
import { UnexpectedError } from "./errors/unexpectedError.js";
import { APP_OPTIONS, FFMPEG_OPTIONS, FILENAME_OPTIONS } from "../config.js";

import type { MainArgs } from "../types/index.js";

interface TimestampFormats {
  hms1: string;
  hms2: string;
  seconds1: number;
  seconds2: number;
}

type FilterParams = [
  timestampFormats: TimestampFormats,
  idx: number,
  timestampArr: string[],
];

type FilterReturn = string | undefined;
type FilterFunc = (...[arg1, arg2, arg3]: FilterParams) => FilterReturn;

// Timestamp in HMS format: '12:34:56.123456789 12:34:56.123456789'
const timestampPattern = "\\d{2}:\\d{2}:\\d{2}\\.\\d{3,9}"; // note double backslash
const timestampRegex = new RegExp(`^${timestampPattern} ${timestampPattern}$`);

const specialCharsRegex = /[`~!@#$%^&*()=[\]{}\\|;:'",<>?]/g;

function hmsToSeconds(sexagesimal: string) {
  const timeArr = sexagesimal.split(":");
  return timeArr.reduce(
    (acc, current, index) => acc + Number(current) * Math.pow(60, 2 - index),
    0,
  );
}

/*
Split the strings inside the array by whitespaces.
The result would be in the form: [timestamp1,timestamp2]
*/
function getTimestampPair(timestamp: string, offset: number) {
  let timestampPair = timestamp.split(/\s/);

  if (offset !== 0) {
    timestampPair = timestampPair.map((singleTs) => {
      const tsInSeconds = hmsToSeconds(singleTs);
      return secondsToHms(tsInSeconds + offset);
    });
  }

  return timestampPair;
}

function logAndThrowErrors(tsError: string[]) {
  if (tsError.length > 0) {
    tsError.forEach((err) => {
      console.error(err);
    });
    throw new Error(errorMsgFormatter("Timestamp errors were found."));
  }
}

// Check if the timestamps are in the right order
function wrongOrderFilter(
  ...[{ hms1, hms2, seconds1, seconds2 }, idx]: FilterParams
): FilterReturn {
  if (seconds2 <= seconds1) {
    const unindent = removeIndent(`
      Timestamp duration error at line ${(idx + 1).toString()}:
          --- Timestamp [${hms2}] should be greater than [${hms1}].`);

    return unindent;
  }
}

/*
Check if the 1st timestamp of the current iteration is equal to the 2nd timestamp of the previous iteration.
i.e.,
"00:01:00.000 00:05:00.000"
"00:05:00.000 00:10:00.000"
will give an error.
*/
function duplicateTimestampFilter(
  ...[{ hms1 }, idx, timestampArr]: FilterParams
): FilterReturn {
  const prevHms = timestampArr[idx - 1];
  if (prevHms === undefined)
    throw new UnexpectedError("Previous timestamp is undefined.");

  const prevHms2 = prevHms.split(/\s/)[1];
  if (prevHms2 === undefined && idx > 1)
    throw new UnexpectedError(
      `\nThe 2nd timestamp from line ${idx.toString()} might be undefined.`,
    );

  if (hms1 === prevHms2) {
    return removeIndent(`
      Duplicate timestamp found at line ${idx.toString()} and line ${(idx + 1).toString()}:
          --- Two instances of timestamp [${hms1}] were found.`);
  }
}

const filters: FilterFunc[] = [wrongOrderFilter, duplicateTimestampFilter];

function processTimestamps(timestampArr: string[]) {
  const timestampErrors: string[] = [];
  const videoSegmentDurations: number[] = [];
  const timestampPairs: string[][] = [];
  const videoFilename = timestampArr[0];

  if (videoFilename === undefined)
    throw new UnexpectedError("Video filename is undefined.");

  for (const [idx, timestamp] of timestampArr.entries()) {
    if (idx === 0) continue;
    if (timestamp === "" && idx === timestampArr.length - 1) continue;
    if (!timestampRegex.test(timestamp)) {
      timestampErrors.push(
        `\nInvalid timestamp format at line ${(idx + 1).toString()}: [${timestamp}].`,
      );
      continue;
    }

    const [hms1, hms2] = timestamp.split(/\s/g) as [string, string];
    const seconds1 = hmsToSeconds(hms1);
    const seconds2 = hmsToSeconds(hms2);
    const timestampFormats = { hms1, hms2, seconds1, seconds2 };

    const hasError = filters.some((filter) => {
      const errorMessage = filter(timestampFormats, idx, timestampArr);
      if (errorMessage !== undefined) {
        timestampErrors.push(errorMessage);
        return true;
      }
    });

    if (hasError) continue;

    videoSegmentDurations.push(seconds2 - seconds1);
    timestampPairs.push(getTimestampPair(timestamp, FFMPEG_OPTIONS.OFFSET));
  }

  logAndThrowErrors(timestampErrors);

  const totalTime = videoSegmentDurations.reduce((acc, cur) => acc + cur, 0);
  return { timestampPairs, totalTime, videoSegmentDurations, videoFilename };
}

function checkFileExtension(videoFilename: string) {
  const extensionName = path.extname(videoFilename).toLowerCase().slice(1);
  const extensionError =
    FILENAME_OPTIONS.SUPPORTED_EXTENSIONS.indexOf(extensionName);

  if (extensionError === -1) {
    const formatter = new Intl.ListFormat("en", {
      style: "long",
      type: "conjunction",
    });
    const extensionList = formatter.format(
      FILENAME_OPTIONS.SUPPORTED_EXTENSIONS,
    );

    const unindent =
      removeIndent(`The video format ${extensionName} is not supported.
        Only the following extensions are valid:
            ${extensionList}`);
    throw new Error(errorMsgFormatter(unindent));
  }
}

function getSuggestedFilename(videoFilename: string) {
  return `Try renaming your filename to [${greenText(videoFilename)}] instead.`;
}

function checkVideoFilename(videoFilename: string) {
  const isInvalidFilename = specialCharsRegex.test(videoFilename);

  if (isInvalidFilename) {
    const newFilename = videoFilename.replace(specialCharsRegex, "");

    if (APP_OPTIONS.AUTO_RENAME) return newFilename;

    const unindent =
      removeIndent(`The video filename should not contain any special characters.
        ${getSuggestedFilename(newFilename)}`);

    throw new Error(errorMsgFormatter(unindent));
  }
}

export function getMainArgs(timestampArr: string[]) {
  const res: MainArgs = {
    timestamp: "",
    ...processTimestamps(timestampArr),
  };

  checkFileExtension(res.videoFilename);
  checkVideoFile(res.videoFilename);

  const newFilename = checkVideoFilename(res.videoFilename);
  if (newFilename !== undefined) res.videoFilename = newFilename;

  const timestampPairs = res.timestampPairs.map((pair) => pair.join(" "));
  res.timestamp = [newFilename ?? res.videoFilename, ...timestampPairs].join(
    "\n",
  );

  return res;
}

/** 
Convert seconds to hour:minute:seconds format
Example: 60 --> 00:01:0.000 
**/
export function secondsToHms(durationInSeconds: number) {
  const hour = Math.floor(durationInSeconds / 3600);
  const minute = Math.floor((durationInSeconds % 3600) / 60);
  const seconds = (durationInSeconds % 3600) % 60;

  const hourFormat = hour < 10 ? "0" + hour.toString() : hour.toString();
  const minuteFormat =
    minute < 10 ? "0" + minute.toString() : minute.toString();
  const secondsFormat =
    seconds < 10 ? "0" + seconds.toFixed(3) : seconds.toFixed(3);

  return `${hourFormat}:${minuteFormat}:${secondsFormat}`;
}

export function getTimestampArray(
  timestamp: string,
  separator: string | RegExp,
) {
  return timestamp
    .split(separator)
    .map((ts) => ts.trim())
    .filter(Boolean);
}
