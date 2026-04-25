"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/init/main.ts
var import_fs = __toESM(require("fs"), 1);
var import_node_path5 = __toESM(require("node:path"), 1);

// src/services/childProcess.ts
var import_node_path = __toESM(require("node:path"), 1);
var import_node_child_process = require("node:child_process");
var createVideoSegment = (script, execSyncOptions) => (0, import_node_child_process.execSync)(script, execSyncOptions);
var mergeVideoSegments = (segmentListFilename, outputFilename, execSyncOptions) => {
  (0, import_node_child_process.execSync)(`ffmpeg -v warning -f concat -safe 0 -i ${segmentListFilename} -c copy "${outputFilename}"`, execSyncOptions);
};
var getVideoDuration = (baseOutputPath, file) => Number(
  (0, import_node_child_process.execSync)(
    `ffprobe -v warning -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${import_node_path.default.join(baseOutputPath, file)}"`
  ).toString()
);

// src/repositories/filesystem.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);

// src/utils/formatter.ts
var import_node_path2 = __toESM(require("node:path"), 1);
var import_node_os = __toESM(require("node:os"), 1);

// src/config.ts
var FFMPEG_OPTIONS = {
  OFFSET: 0,
  // offset in seconds.
  FPS: 0,
  // override in case of low fps from VFR inputs.
  HEVC: false,
  // encoding defaults to h264.
  EXEC_SYNC_OPTIONS: { stdio: "inherit" }
};
var FILENAME_OPTIONS = {
  EXTENSION_NAME: "mp4",
  TIMESTAMPS_FILENAME: "timestamps.txt",
  SEGMENT_LIST_FILENAME: "mylist.txt",
  SUPPORTED_EXTENSIONS: [
    "webm",
    "mkv",
    "flv",
    "avi",
    "ts",
    "mov",
    "mp4"
  ]
};
var APP_OPTIONS = {
  IGNORE_ERRORS: true,
  KEEP_VIDEO_SEGMENTS: true,
  BATCH_SEPARATOR: "@batch@"
};

// src/utils/timestamp.ts
var timestampPattern = "\\d{2}:\\d{2}:\\d{2}\\.\\d{3,9}";
var timestampRegex = new RegExp(`^${timestampPattern} ${timestampPattern}$`);
var getTimestampPair = (timestamp, offset) => {
  let timestampPair = timestamp.split(/\s/);
  if (offset !== 0) {
    timestampPair = timestampPair.map((singleTs) => {
      let tsInSeconds = sexagesimalToSeconds(singleTs);
      return sexagesimalFormat(tsInSeconds + FFMPEG_OPTIONS.OFFSET);
    });
  }
  return timestampPair;
};
var isDuplicateTimestamp = (prevTimestamp, timestamp1, idx) => {
  const prevTimestamp2 = prevTimestamp.split(/\s/)[1];
  if (prevTimestamp2 === void 0 && idx > 1) {
    return {
      isDuplicate: true,
      message: `
The 2nd timestamp from line ${idx} might be undefined.`
    };
  }
  if (timestamp1 === prevTimestamp2) {
    return {
      isDuplicate: true,
      message: `
Duplicate timestamp found at line ${idx} and line ${idx + 1}:
    --- Two instances of timestamp [${timestamp1}] were found.`
    };
  }
  return {
    isDuplicate: false,
    message: ``
  };
};
var processTimestamps = (timestampArr) => {
  let tsError = false;
  let totalTime = 0;
  let videoSegmentDurations = [];
  let videoFilename = "";
  const timestampPairs = timestampArr.reduce((acc, timestamp, idx) => {
    if (idx === 0) {
      videoFilename = timestamp;
      return [];
    }
    if (timestamp === "" && idx === timestampArr.length - 1) return acc;
    if (timestampRegex.test(timestamp)) {
      let timestamps = timestamp.split(/\s/g);
      let timestamp1 = sexagesimalToSeconds(timestamps[0]);
      let timestamp2 = sexagesimalToSeconds(timestamps[1]);
      if (timestamp2 <= timestamp1) {
        tsError = true;
        console.error(
          `
Timestamp duration error at line ${idx + 1}:
    --- Timestamp [${timestamps[1]}] should be greater than [${timestamps[0]}].`
        );
        return acc;
      }
      const prevTimestamp = timestampArr[idx - 1] || "";
      if (!timestampRegex.test(prevTimestamp) && idx > 1) {
        tsError = true;
        return acc;
      }
      const res = isDuplicateTimestamp(prevTimestamp, timestamps[0], idx);
      if (res.isDuplicate) {
        tsError = true;
        console.error(res.message);
        return acc;
      }
      totalTime += timestamp2 - timestamp1;
      videoSegmentDurations.push(timestamp2 - timestamp1);
      return [...acc, getTimestampPair(timestamp, FFMPEG_OPTIONS.OFFSET)];
    } else {
      tsError = true;
      console.error(`
Invalid timestamp format at line ${idx + 1}: [${timestamp}].`);
      return acc;
    }
  }, []);
  if (tsError) throw new Error(
    errorMsgFormatter("Timestamps errors were found.")
  );
  return { timestampPairs, totalTime, videoSegmentDurations, videoFilename };
};
var getTimestampArray = (timestamp) => timestamp.split("\n").filter((ts) => ts.trim() !== "").map((ts) => ts.trim());

// src/utils/formatter.ts
var sexagesimalFormat = (durationInSeconds) => {
  let hour = Math.floor(durationInSeconds / 3600);
  let minute = Math.floor(durationInSeconds % 3600 / 60);
  let seconds = durationInSeconds % 3600 % 60;
  return `${hour < 10 ? "0" + hour : hour}:${minute < 10 ? "0" + minute : minute}:${seconds < 10 ? "0" + seconds.toFixed(4) : seconds.toFixed(3)}`;
};
var sexagesimalToSeconds = (sexagesimal) => {
  if (!new RegExp(`^${timestampPattern}$`).test(sexagesimal)) {
    throw new Error(errorMsgFormatter("Invalid sexagesimal"));
  }
  let timeArr = sexagesimal.split(":");
  return timeArr.reduce(
    (acc, current, index) => acc + Number(current) * Math.pow(60, 2 - index),
    0
  );
};
var videoCounter = (counter) => {
  let number = "";
  if (counter < 10) {
    number = "00" + counter;
  } else if (counter < 100) {
    number = "0" + counter;
  } else {
    number += `${counter}`;
  }
  return number;
};
var createFFmpegScripts = ({ input, timestampPairs, videoSegments }, { FPS, HEVC }) => {
  const basename = import_node_path2.default.parse(input).name;
  return timestampPairs.reduce((acc, ts, idx) => {
    let counter = idx + 1;
    const number = videoCounter(counter);
    const outputFilename = `${basename}_${number}.${FILENAME_OPTIONS.EXTENSION_NAME}`;
    if (videoSegments.includes(outputFilename)) return acc;
    const encoder = import_node_os.default.platform() === "darwin" ? "hevc_videotoolbox" : "hevc";
    const cmd = [
      "ffmpeg -v warning -stats",
      `-ss ${ts[0]}`,
      `-to ${ts[1]}`,
      `-i "${input}"`,
      `${HEVC ? `-crf 23 -c:v ${encoder} -tag:v hvc1` : "-crf 18 -c:v h264"}`,
      `${FPS === 0 ? "" : `-r ${FPS}`}`,
      `"${import_node_path2.default.join(basename, outputFilename)}"`
    ];
    return [...acc, cmd.filter(Boolean).join(" ")];
  }, []);
};
var getVideoSegmentRegExp = (nameOnly, extensionName) => {
  const pattern = `${nameOnly}_\\d{3,4}\\.${extensionName}`;
  return new RegExp(pattern);
};
var outputFilenameFormatter = (basename) => `${basename} (Result).${FILENAME_OPTIONS.EXTENSION_NAME}`;
var errorMsgFormatter = (message) => `
${message}
`;
var listPossibleErrors = (possibleErrors) => `
Please check the following files for possible errors:

${possibleErrors.map((err) => "	" + err).join("\n")}

Note that small disparities are normal and you may continue if you have not found an error in any video segments.`;

// src/repositories/filesystem.ts
var readTimestamps = () => {
  let ts = "";
  try {
    ts = import_node_fs.default.readFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, "utf-8");
  } catch (error) {
    throw new Error(
      errorMsgFormatter(`The file [${FILENAME_OPTIONS.TIMESTAMPS_FILENAME}] was not found!`)
    );
  }
  return ts;
};
var checkVideoFile = (videoFile) => {
  if (!import_node_fs.default.readdirSync(".").includes(videoFile)) {
    throw new Error(
      errorMsgFormatter(`${videoFile} was not found. Make sure to put the correct video filename at the top (Line 1) of ${FILENAME_OPTIONS.TIMESTAMPS_FILENAME}.`)
    );
  }
};
var removeVideoSegments = ({ basename }) => {
  if (!APP_OPTIONS.KEEP_VIDEO_SEGMENTS) {
    import_node_fs.default.rmSync(basename, { recursive: true, force: true });
  }
};
var createTimestampCopy = (timestampsFilename, outputFilename) => {
  import_node_fs.default.copyFileSync(`${timestampsFilename}`, `${outputFilename}.txt`);
};
var createSegmentList = (videoSegments, basename) => {
  let myList = "";
  videoSegments.forEach(
    (file, index) => myList += `${index !== 0 ? "\n" : ""}file '${import_node_path3.default.join(basename, file)}'`
  );
  import_node_fs.default.writeFileSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, myList);
};
var mergeVideos = (mergeOptions) => {
  const {
    videoSegments,
    basename
  } = mergeOptions;
  createSegmentList(videoSegments, basename);
  const outputFile = outputFilenameFormatter(basename);
  if (import_node_fs.default.readdirSync(".").includes(outputFile)) {
    console.log(`
The file [\x1B[94m${outputFile}\x1B[0m] already exists. Removing file before making a new one. . .`);
    import_node_fs.default.rmSync(outputFile);
  }
  console.log("\nMerging video segments. . .");
  mergeVideoSegments(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, outputFile, FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS);
  console.log(
    `
\x1B[32m${outputFile}\x1B[0m has been created.`
  );
  import_node_fs.default.rmSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME);
  const { videoDuration, elapsedTime, ...rest } = mergeOptions;
  removeVideoSegments(rest);
  createTimestampCopy(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, basename);
  let sexagesimal = sexagesimalFormat(videoDuration);
  console.log(
    `
Video trimmer has finished. Video output should be about ${sexagesimal} long. 
Total processing time: ${sexagesimalFormat(elapsedTime / 1e3)}
`
  );
  console.log("=".repeat(process.stdout.columns));
};

// src/utils/validator.ts
var import_node_path4 = __toESM(require("node:path"), 1);
var checkFileExtension = (videoFile) => {
  const extensionName = import_node_path4.default.extname(videoFile).toLowerCase().slice(1);
  const extensionError = FILENAME_OPTIONS.SUPPORTED_EXTENSIONS.indexOf(extensionName);
  if (extensionError === -1) {
    throw new Error(
      errorMsgFormatter(`The video format ${extensionName} is not supported.
Only the following extensions are valid:
    ${FILENAME_OPTIONS.SUPPORTED_EXTENSIONS}`)
    );
  }
};
var checkVideoFilename = (videoFilename) => {
  const res = !/[(|)]/.test(videoFilename);
  if (!res) {
    throw new Error(
      errorMsgFormatter("The video filename should not contain any parentheses.")
    );
  }
};
var checkVideoDurationErrors = (videoSegments, videoSegmentDurations, baseName) => videoSegments.reduce((acc, file, index) => {
  const durationInSeconds = getVideoDuration(baseName, file);
  if (videoSegmentDurations[index] === void 0) {
    throw new Error(
      errorMsgFormatter(`Duration of video segment for index ${index} might be undefined.`)
    );
  }
  const difference = Math.abs(videoSegmentDurations[index] - durationInSeconds).toFixed(4);
  const isGreaterThanOne = Number(difference) > 1;
  console.log(
    `
[\x1B[94m${file}\x1B[0m] Duration: Computed (${videoSegmentDurations[index]}) vs Actual (${durationInSeconds}). Difference: ${difference} seconds.${isGreaterThanOne ? "\x1B[31m Possible Error!\x1B[0m" : "\x1B[32m Result Okay!\x1B[0m"}`
  );
  if (isGreaterThanOne) {
    return [...acc, file];
  }
  return acc;
}, []);
var checkTimestampInput = (timestampArr) => {
  const res = processTimestamps(timestampArr);
  checkFileExtension(res.videoFilename);
  checkVideoFilename(res.videoFilename);
  checkVideoFile(res.videoFilename);
  return res;
};

// src/init/main.ts
var main = (args) => {
  const {
    timestampPairs,
    totalTime,
    videoSegmentDurations,
    videoFilename
  } = args;
  const baseName = import_node_path5.default.parse(videoFilename).name;
  import_fs.default.mkdirSync(baseName, { recursive: true });
  let videoSegments = import_fs.default.readdirSync(baseName);
  const ffmpegArgs = {
    input: videoFilename,
    timestampPairs,
    videoSegments
  };
  const ffmpegScripts = createFFmpegScripts(ffmpegArgs, FFMPEG_OPTIONS);
  console.log("\nExecuting FFmpeg. This may take a while. . .");
  const time1 = Date.now();
  ffmpegScripts.forEach((script) => {
    console.log("\n" + script);
    createVideoSegment(script, FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS);
  });
  const elapsedTime = Date.now() - time1;
  const videoSegmentRegExp = getVideoSegmentRegExp(baseName, FILENAME_OPTIONS.EXTENSION_NAME);
  videoSegments = import_fs.default.readdirSync(baseName).filter((file) => videoSegmentRegExp.test(file));
  const possibleErrors = checkVideoDurationErrors(videoSegments, videoSegmentDurations, baseName);
  if (possibleErrors.length > 0) {
    console.error(listPossibleErrors(possibleErrors));
    if (!APP_OPTIONS.IGNORE_ERRORS) {
      console.log("\nAbort merging of video segments. . .");
      return;
    }
  }
  const mergeVideosArgs = {
    videoSegments,
    basename: baseName,
    videoDuration: totalTime,
    elapsedTime
  };
  mergeVideos(mergeVideosArgs);
};

// src/init/init.ts
var init = () => {
  const ts = readTimestamps();
  if (ts.includes(APP_OPTIONS.BATCH_SEPARATOR)) {
    const timestampBatch = ts.split(APP_OPTIONS.BATCH_SEPARATOR).filter((ts2) => ts2.trim() !== "").map(getTimestampArray);
    const mainArgs = timestampBatch.map(checkTimestampInput);
    mainArgs.forEach((arg) => main(arg));
  } else {
    const timestampArr = getTimestampArray(ts);
    const args = checkTimestampInput(timestampArr);
    main(args);
  }
};

// src/index.ts
if (FFMPEG_OPTIONS.OFFSET !== 0) {
  console.log("\x1B[35m%s\x1B[0m", `Offset Value: ${FFMPEG_OPTIONS.OFFSET} seconds`);
}
try {
  init();
} catch (e) {
  console.log(
    `
= = = = = = = = = = H I N T S : = = = = = = = = = =

* Line 1 should be the video filename including its extension. 
    Example: input.mp4.

* Timestamp format for each line (except Line 1) should be [timestamp1 timestamp2] without the brackets AND with a single space in between.
    Example: 10:00:00.123456789 11:00:00.123456789

* Timestamp format should be in sexagesimal system and the seconds' format should be 3-9 decimal places long. 
    Example: 12:34:56.123456789

* Don't leave any empty lines.
`
  );
  console.error(e);
}
