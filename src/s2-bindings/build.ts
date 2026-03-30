import { $ } from "bun";
import { join } from "path";
import { mkdtemp, readFile, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";

const DEBUG = false;

const tempdir = await mkdtemp(join(tmpdir(), "build-"));
const TINYGO_VERSION = "0.34.0";

try {
  await $`go mod tidy`;

  const tinygoVersion = await $`tinygo version`.text();
  const version = tinygoVersion.trim().split(/\s+/)[2];
  if (version !== TINYGO_VERSION) {
    throw new Error(
      `Expected tinygo version ${TINYGO_VERSION}, got ${version}`,
    );
  }

  const wasmPath = join(tempdir, "s2-bindings.wasm");

  const args = ["tinygo", "build", "-o", wasmPath];
  if (!DEBUG) {
    args.push("-no-debug", "-panic", "trap", "-opt", "2");
  }

  await $`${args}`.env({
    ...process.env,
    GOOS: "wasip1",
    GOARCH: "wasm",
  });

  const wasm = await readFile(wasmPath);
  const encoded = Buffer.from(wasm).toString("base64");
  await writeFile(
    "../component/lib/s2wasm.js",
    `export const wasmSource = "${encoded}";\n`,
  );
} finally {
  await rm(tempdir, { recursive: true });
}
