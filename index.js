"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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

// src/index.ts
var import_fs = __toESM(require("fs"), 1);
var import_readline = __toESM(require("readline"), 1);
var import_child_process = require("child_process");

// src/utils/config.ts
var config_exports = {};
__export(config_exports, {
  batchInput: () => batchInput,
  batchSeparator: () => batchSeparator,
  execSyncOptions: () => execSyncOptions,
  extensionName: () => extensionName,
  fps: () => fps,
  hevc: () => hevc,
  isBatch: () => isBatch,
  offset: () => offset,
  segmentListFilename: () => segmentListFilename,
  supportedExtensions: () => supportedExtensions,
  timestampsFilename: () => timestampsFilename
});
var offset = 0;
var fps = 0;
var hevc = false;
var extensionName = "mp4";
var execSyncOptions = { stdio: "inherit" };
var supportedExtensions = [
  "webm",
  "mkv",
  "flv",
  "avi",
  "ts",
  "mov",
  "wmv",
  "amv",
  "mp4",
  "m4p",
  "m4v",
  "mpg",
  "mpeg"
];
var isBatch = false;
var batchSeparator = "@batch@";
var batchInput = "batch.txt";
var timestampsFilename = "timestamps.txt";
var segmentListFilename = "mylist.txt";

// src/utils/validator.ts
var import_node_path2 = __toESM(require("node:path"), 1);

// src/utils/formatter.ts
var import_node_path = __toESM(require("node:path"), 1);
var timestampPattern = "\\d{2}:\\d{2}:\\d{2}\\.\\d{3,9}";
var timestampRegex = new RegExp(`^${timestampPattern} ${timestampPattern}$`);
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
var generateFFmpegScripts = ({ input, tsArray, dir }, { fps: fps2, hevc: hevc2, extensionName: extensionName2 }) => {
  let counter = 0;
  let ffmpegScripts = [];
  const basename = import_node_path.default.parse(input).name;
  tsArray.forEach((ts) => {
    counter++;
    let number = videoCounter(counter);
    const outputFilename = `${basename}_${number}.${extensionName2}`;
    if (dir.includes(outputFilename)) return;
    const cmd = [
      "ffmpeg -v warning -stats",
      `-ss ${ts[0]}`,
      `-to ${ts[1]}`,
      `-i "${input}"`,
      `${hevc2 ? "-crf 23 -c:v hevc" : "-crf 18 -c:v h264"}`,
      `${fps2 === 0 ? "" : `-r ${fps2}`}`,
      `"${import_node_path.default.join(basename, outputFilename)}"`
    ];
    ffmpegScripts.push(cmd.filter(Boolean).join(" "));
  });
  return ffmpegScripts;
};
var getVideoSegmentRegExp = (nameOnly, extensionName2) => {
  const pattern = `${nameOnly}_\\d{3,4}\\.${extensionName2}`;
  return new RegExp(pattern);
};
var outputFilenameFormatter = (basename) => `${basename} (Result).${extensionName}`;
var errorMsgFormatter = (message) => `
${message}
`;

// src/utils/validator.ts
var checkFileExtension = (videoFile) => {
  const extensionName2 = import_node_path2.default.extname(videoFile).toLowerCase().slice(1);
  const extensionError = supportedExtensions.indexOf(extensionName2);
  if (extensionError === -1) {
    throw new Error(
      errorMsgFormatter(`The video format ${extensionName2} is not supported.
Only the following extensions are valid:
    ${supportedExtensions}`)
    );
  }
};

// src/utils/timestamp.ts
var isDuplicateTimestamp = (prevTimestamp, timestamp1, idx) => {
  const prevTimestamp2 = prevTimestamp.split(/\s/)[1];
  if (prevTimestamp2 === void 0) {
    console.error(`
The 2nd timestamp from line ${idx} might be undefined.`);
    return true;
  }
  if (timestamp1 === prevTimestamp2) {
    console.error(
      `
Duplicate timestamp found at line ${idx} and line ${idx + 1}:
    --- Two instances of timestamp [${timestamp1}] were found.`
    );
    return true;
  }
  return false;
};
var processTimestamps = (timestampArr) => {
  let tsError = false;
  let totalTime = 0;
  let videoSegmentDurations = [];
  let arr = timestampArr.reduce((acc, timestamp, idx) => {
    if (idx === 0) return [...acc, timestamp];
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
      if (res) {
        tsError = true;
        return acc;
      }
      totalTime += timestamp2 - timestamp1;
      videoSegmentDurations.push(timestamp2 - timestamp1);
      return [...acc, timestamp];
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
  return { arr, totalTime, videoSegmentDurations };
};

// src/repositories/filesystem.ts
var import_node_fs = __toESM(require("node:fs"), 1);

// src/services/childProcess.ts
var import_node_path3 = __toESM(require("node:path"), 1);
var import_node_child_process = require("node:child_process");
var mergeVideoSegments = (segmentListFilename2, outputFilename, execSyncOptions2) => {
  (0, import_node_child_process.execSync)(`ffmpeg -v warning -f concat -safe 0 -i ${segmentListFilename2} -c copy "${outputFilename}"`, execSyncOptions2);
};
var getVideoDuration = (baseOutputPath, file) => Number(
  (0, import_node_child_process.execSync)(
    `ffprobe -v warning -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${import_node_path3.default.join(baseOutputPath, file)}"`
  ).toString()
);

// src/repositories/filesystem.ts
var readTimestamps = () => {
  let ts = "";
  try {
    ts = import_node_fs.default.readFileSync(timestampsFilename, "utf-8");
  } catch (error) {
    throw new Error(
      errorMsgFormatter(`The file [${timestampsFilename}] was not found!`)
    );
  }
  return ts;
};
var checkVideoFile = (videoFile) => {
  if (!import_node_fs.default.readdirSync(".").includes(videoFile)) {
    throw new Error(
      errorMsgFormatter(`${videoFile} was not found. Make sure to put the correct video filename at the top (Line 1) of ${timestampsFilename}.`)
    );
  }
};
var removeVideoSegments = ({ isVideoSegmentKept, nameOnly, videoSegments }) => {
  if (isVideoSegmentKept === "no") {
    console.log("\nRemoving video segments:");
    import_node_fs.default.rmSync(nameOnly, { recursive: true, force: true });
    console.log(`
Total video segments removed: ${videoSegments.length}`);
  } else {
    console.log("\nVideo segments will be kept.");
  }
};
var createTimestampCopy = (timestampsFilename2, outputFilename) => {
  import_node_fs.default.copyFileSync(`${timestampsFilename2}`, `${outputFilename}.txt`);
};
var createSegmentList = (videoSegments, baseOutputPath) => {
  let myList = "";
  videoSegments.forEach(
    (file, index) => myList += `${index !== 0 ? "\n" : ""}file '${baseOutputPath}/${file}'`
  );
  import_node_fs.default.writeFileSync(segmentListFilename, myList);
  console.log(`
${segmentListFilename} has been created temporarily. . .`);
};
var mergeVideos = (mergeOptions) => {
  const {
    videoSegments,
    nameOnly,
    baseOutputPath
  } = mergeOptions;
  createSegmentList(videoSegments, baseOutputPath);
  const outputFile = outputFilenameFormatter(nameOnly);
  if (import_node_fs.default.readdirSync(".").includes(outputFile)) {
    console.log(`
The file [\x1B[94m${outputFile}\x1B[0m] already exists. Removing file before making a new one. . .`);
    import_node_fs.default.rmSync(outputFile);
  }
  console.log("\nMerging video segments. . .");
  mergeVideoSegments(segmentListFilename, outputFile, execSyncOptions);
  console.log(
    `
\x1B[32m${outputFile}\x1B[0m has been created.
    
Removing ${segmentListFilename}. . .`
  );
  import_node_fs.default.rmSync(segmentListFilename);
  const { totalTime, timeDiff, ...rest } = mergeOptions;
  removeVideoSegments(rest);
  createTimestampCopy(timestampsFilename, nameOnly);
  console.log(`
Creating copy of ${timestampsFilename}. . .`);
  let sexagesimal = sexagesimalFormat(totalTime);
  console.log(
    `
Video trimmer has finished. Video output should be about ${sexagesimal} long. 
Total processing time: ${sexagesimalFormat(timeDiff / 1e3)}`
  );
};

// src/index.ts
var rl = import_readline.default.createInterface({
  input: process.stdin,
  output: process.stdout
});
if (offset !== 0) {
  console.log("\x1B[35m%s\x1B[0m", `Offset Value: ${offset} seconds`);
}
var main = (answer) => {
  let ts = readTimestamps();
  const timestampArr = ts.split("\n").map((ts2) => ts2.trim());
  console.log("\nProcessing timestamps. . .");
  const result = processTimestamps(timestampArr);
  const { totalTime, videoSegmentDurations } = result;
  let { arr } = result;
  const videoFile = arr.shift();
  if (videoFile === void 0) throw new Error(
    errorMsgFormatter("Video filename was not found. The processed array is empty.")
  );
  console.log("\nChecking video file. . .");
  checkVideoFile(videoFile);
  checkFileExtension(videoFile);
  let tsSplit = arr.map((ts2) => {
    let tsArr = ts2.split(/\s/);
    if (offset !== 0) {
      tsArr = tsArr.map((singleTs) => {
        let tsInSeconds = sexagesimalToSeconds(singleTs);
        return sexagesimalFormat(tsInSeconds + offset);
      });
    }
    return tsArr;
  });
  const nameOnly = videoFile.slice(0, videoFile.lastIndexOf("."));
  if (!import_fs.default.readdirSync(".").includes(nameOnly)) {
    import_fs.default.mkdirSync(nameOnly);
  }
  let baseOutputPath = "./" + nameOnly;
  let videoSegments = import_fs.default.readdirSync(baseOutputPath);
  const ffmpegArgs = {
    input: videoFile,
    tsArray: tsSplit,
    dir: videoSegments
  };
  let ffmpegScripts = generateFFmpegScripts(ffmpegArgs, config_exports);
  console.log("\nExecuting FFmpeg. This may take a while. . .");
  let time1 = Date.now();
  ffmpegScripts.forEach((script) => {
    console.log("\n" + script);
    (0, import_child_process.execSync)(script, execSyncOptions);
  });
  let time2 = Date.now();
  const videoSegmentRegExp = getVideoSegmentRegExp(nameOnly, extensionName);
  videoSegments = import_fs.default.readdirSync(baseOutputPath).filter((file) => videoSegmentRegExp.test(file));
  console.log("\nChecking each video segment's length. . .");
  let possibleErrors = videoSegments.reduce((acc, file, index) => {
    const durationInSeconds = getVideoDuration(baseOutputPath, file);
    if (videoSegmentDurations[index] === void 0) {
      throw new Error(
        errorMsgFormatter(`Duration of video segment for index ${index} might be undefined.`)
      );
    }
    let difference = Math.abs(videoSegmentDurations[index] - durationInSeconds).toFixed(4);
    let isGreaterThanOne = Number(difference) > 1;
    console.log(
      `
[\x1B[94m${file}\x1B[0m] Duration: Computed (${videoSegmentDurations[index]}) vs Actual (${durationInSeconds}). Difference: ${difference} seconds.${isGreaterThanOne ? "\x1B[31m Possible Error!\x1B[0m" : "\x1B[32m Result Okay!\x1B[0m"}`
    );
    if (isGreaterThanOne) {
      return [...acc, file];
    }
    return acc;
  }, []);
  const mergeVideosArgs = {
    videoSegments,
    nameOnly,
    baseOutputPath,
    isVideoSegmentKept: answer,
    totalTime,
    timeDiff: time2 - time1
  };
  if (!isBatch && possibleErrors.length > 0) {
    console.error(
      `
Please check the following files for possible errors:

${possibleErrors.map((err) => "	" + err).join("\n")}

Note that small disparities are normal and you may continue if you have not found an error in any video segments.`
    );
    rl.question(
      "\nAbort merging videos? (Default: no) | [yes|no]: ",
      function(abort) {
        if (abort.toLocaleLowerCase() === "yes") {
          console.log("\nAbort merging of video segments. . .");
          return rl.close();
        } else {
          mergeVideos(mergeVideosArgs);
          return rl.close();
        }
      }
    );
  } else {
    console.log("\nNo problems were found with the video segments.");
    mergeVideos(mergeVideosArgs);
    return rl.close();
  }
};
rl.question(
  "\nKeep all video segments? (Default: yes) | [yes|no]: ",
  async (isVideoSegmentKept) => {
    try {
      if (isBatch) {
        let ts = "";
        ts += import_fs.default.readFileSync(batchInput);
        const tsList = ts.split(batchSeparator).map((string) => string.trim());
        for (const timestamp of tsList) {
          import_fs.default.writeFileSync(timestampsFilename, timestamp);
          main(isVideoSegmentKept.toLocaleLowerCase());
        }
      } else {
        main(isVideoSegmentKept.toLocaleLowerCase());
      }
    } catch (e) {
      console.log(
        `
= = = = = = = = = = H I N T S : = = = = = = = = = =

* Line 1 should be the video filename including its extension. 
    Example: input.mp4.

* Timestamp format for each line (except Line 1) should be [timestamp1 timestamp2] without the brackets AND with a single space inbetween.
    Example: 10:00:00.123456789 11:00:00.123456789

* Timestamp format should be in sexagesimal system and the seconds' format should be 3-9 decimal places long. 
    Example: 12:34:56.123456789

* Don't leave any empty lines.
`
      );
      console.error(e);
    }
    rl.close();
  }
);
