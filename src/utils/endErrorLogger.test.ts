import {beforeEach, describe, expect, test, vi} from "vitest";
import {EndErrorLogger} from "./endErrorLogger.js";

describe("endErrorLogger", () => {
    let endErrorLogger: EndErrorLogger;
    const spyError = vi.spyOn(console, "error").mockImplementation(vi.fn());

    beforeEach(() => {
        endErrorLogger = new EndErrorLogger();
    })

    test("should log errors", () => {
        const messages = ["error1", "error2", "error3"];

        messages.forEach(message => endErrorLogger.addError(message));
        endErrorLogger.logErrors();

        expect(spyError).toBeCalledTimes(3)
        messages.forEach((message, idx) => {
            expect(spyError).toHaveBeenNthCalledWith(idx + 1, message)
        })
    })
})