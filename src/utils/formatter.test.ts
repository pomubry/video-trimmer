import {describe, expect, test} from "vitest";
import {sexagesimalToSeconds, timestampRegex} from "./formatter.js";

describe("Timestamp Format", () => {
    test("Properly identify formatted timestamp", () => {
        const ts = timestampRegex.test("12:34:56.123456789 12:34:56.123456789")
        expect(ts).toBeTruthy();
    })

    test("Accept timestamp with 3 decimal place", () => {
        const ts = timestampRegex.test("12:34:56.123 12:34:56.123456789")
        expect(ts).toBeTruthy();
    })

    test("Decline timestamp with 2 or less decimal place", () => {
        const ts = timestampRegex.test("12:34:56.123456789 12:34:56.12")
        expect(ts).toBeFalsy();
    })

    test("Decline timestamp with 10 or more decimal place", () => {
        const ts = timestampRegex.test("12:34:56.1234567891 12:34:56.123456789")
        expect(ts).toBeFalsy();
    })

    test("Decline timestamp with invalid characters from each end", () => {
        const ts = timestampRegex.test("a12:34:56.1234567891 12:34:56.123456789 b")
        expect(ts).toBeFalsy();
    })

    test("Decline timestamp with newline", () => {
        const ts = timestampRegex.test("\n12:34:56.123456789 12:34:56.123456789\n")
        expect(ts).toBeFalsy();
    })

    test("Decline timestamp with tab separator", () => {
        const ts = timestampRegex.test("12:34:56.123456789\t12:34:56.123456789")
        expect(ts).toBeFalsy();
    })

    test("Decline timestamp with double space", () => {
        const ts = timestampRegex.test("12:34:56.123456789  12:34:56.123456789")
        expect(ts).toBeFalsy();
    })

    test("Decline timestamp with special char for whitespace", () => {
        const ts = timestampRegex.test("12:34:56.123456789\s12:34:56.123456789")
        expect(ts).toBeFalsy();
    })
})

describe("Sexagesimal Format", () => {
    test("Invalid sexagesimal input should throw an error", () => {
        expect(() => sexagesimalToSeconds("invalid")).toThrowError();
    })

    test("Valid input should return a number", () => {
        const num = sexagesimalToSeconds("12:34:56.123456789")
        expect(num).toBeTypeOf("number")
    })
})

