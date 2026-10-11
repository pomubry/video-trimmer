import { main } from "./main.js";
import { readTimestamps, renameFile } from "../system/filesystem.js";
import { suspendSystem } from "../system/childProcess.js";
import { getMainArgs } from "../utils/timestamp.js";
import { APP_OPTIONS } from "../config.js";
import { EndErrorLogger } from "../utils/errors/endErrorLogger.js";

export async function init(endErrorLogger: EndErrorLogger) {
  const readStream = readTimestamps();
  const mainArgs = await getMainArgs(readStream);

  mainArgs.forEach((mainArg) => {
    if (mainArg.oldFilename !== mainArg.videoFilename) {
      renameFile(mainArg.oldFilename, mainArg.videoFilename);
    }
  });

  mainArgs.forEach((mainArg) => {
    main(mainArg, endErrorLogger.addError);
  });

  endErrorLogger.logErrors();

  if (APP_OPTIONS.AUTO_SUSPEND) suspendSystem();
}
