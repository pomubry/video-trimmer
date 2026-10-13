import { beforeEach, vi } from "vitest";
import { vol } from "memfs";

vi.mock("node:fs");
vi.mock("node:fs/promises");
vi.mock(import("./system/childProcess.js"));

beforeEach(() => {
  vi.restoreAllMocks();
  vol.reset();
  vol.mkdirSync(process.cwd(), { recursive: true });
});
