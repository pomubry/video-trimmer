import {afterEach, beforeEach, vi} from "vitest";
import {vol} from "memfs";

vi.mock('node:fs')
vi.mock('node:fs/promises')
vi.mock(import("./services/childProcess.js"))

beforeEach(() => {
    vol.reset()
    vol.mkdirSync(process.cwd(), {recursive: true})
})

afterEach(() => {
    vi.restoreAllMocks();
})