import path from "node:path";

import {errorMsgFormatter} from "./formatter.js";
import {FILENAME_OPTIONS} from "../config.js";

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

export const checkVideoFilename = (videoFilename: string) => {
    const res = !/[(|)]/.test(videoFilename)

    if (!res) {
        throw new Error(
            errorMsgFormatter("The video filename should not contain any parentheses.")
        )
    }
};