import path from "path";
import os from "os";

/**
 * Default Unix Domain Socket path on macOS/Linux
 * On Windows, named pipes are used (\\\\.\\pipe\\ag_sock)
 */
export const DEFAULT_SOCKET_PATH =
  process.platform === "win32"
    ? "\\\\.\\pipe\\ag_sock"
    : path.join(os.tmpdir(), "ag.sock");
