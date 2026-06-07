import { getVideoDuration } from "../system/childProcess.js";
import { getFileSize } from "../system/filesystem.js";
import {
  blueText,
  greenText,
  redText,
  errorMsgFormatter,
  removeIndent,
} from "./formatter.js";

import type { AddError } from "../types/index.js";

export function checkVideoDurationErrors(
  videoSegments: string[],
  videoSegmentDurations: number[],
  baseName: string,
  addError: AddError,
) {
  return videoSegments.reduce<string[]>((acc, file, index) => {
    const durationInSeconds = getVideoDuration(baseName, file);

    if (videoSegmentDurations[index] === undefined) {
      throw new Error(
        errorMsgFormatter(
          `Duration of video segment for index ${index.toString()} might be undefined.`,
        ),
      );
    }

    const difference = Math.abs(
      videoSegmentDurations[index] - durationInSeconds,
    );
    const isGreaterThanOne = difference > 1;

    const message = removeIndent(`
        [${blueText(file)}] Duration: 
            - Computed: ${videoSegmentDurations[index].toFixed(3)} seconds
            - Actual: ${durationInSeconds.toFixed(3)} seconds
            - Difference: ${difference.toFixed(3)} seconds.${
              isGreaterThanOne
                ? redText(" Possible Error!")
                : greenText(" Result Okay!")
            }`);

    console.log(message);

    if (isGreaterThanOne) {
      addError(message);
      return [...acc, file];
    }
    return acc;
  }, []);
}

export function checkFileSizeDiff(
  oldFile: string,
  newFile: string,
  addError: AddError,
) {
  const oldSize = getFileSize(oldFile);
  const newSize = getFileSize(newFile);
  const diffInMB = (oldSize - newSize) / (1024 * 1024);

  if (diffInMB >= 0) {
    return `Saved ${greenText(diffInMB.toFixed(3))} MB`;
  } else {
    const message = removeIndent(`
        File [${blueText(newFile)}]:
            New file size is bigger than the original file by ${redText(Math.abs(diffInMB).toFixed(3))} MB.`);

    addError(message);
    return message;
  }
}
