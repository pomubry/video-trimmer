import path from "node:path";

import {FILENAME_OPTIONS} from "./config.js";
import {errorMsgFormatter} from "./formatter.js";

export const checkFileExtension = (videoFile: string) => {
    const extensionName = path.extname(videoFile).toLowerCase().slice(1);
    const extensionError = FILENAME_OPTIONS.SUPPORTED_EXTENSIONS.indexOf(extensionName);

    if (extensionError === -1) {
        throw new Error(
            errorMsgFormatter(`The video format ${extensionName} is not supported.
Only the following extensions are valid:
    ${FILENAME_OPTIONS.SUPPORTED_EXTENSIONS}`)
        )
    }
}

