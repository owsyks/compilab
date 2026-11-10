import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  openSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const local = join(root, ".local");
mkdirSync(local, { recursive: true });
const pidfile = join(local, "server.pid");
const cli = join(root, "node_modules", "next", "dist", "bin", "next");
function ownProcess(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    const command =
      process.platform === "win32"
        ? execFileSync(
            "powershell.exe",
            [
              "-NoProfile",
              "-NonInteractive",
              "-Command",
              `(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').CommandLine`,
            ],
            { encoding: "utf8", windowsHide: true },
          )
        : readFileSync(`/proc/${pid}/cmdline`, "utf8");
    return command
      .toLowerCase()
      .replaceAll("\\", "/")
      .includes(cli.toLowerCase().replaceAll("\\", "/"));
  } catch {
    return false;
  }
}
const oldPid = existsSync(pidfile) ? Number(readFileSync(pidfile, "utf8")) : 0;
if (process.argv[2] === "stop") {
  if (ownProcess(oldPid)) {
    process.kill(oldPid);
    console.log("Stopped the Compilab production server.");
  } else console.log("No matching Compilab production server is running.");
  if (existsSync(pidfile)) unlinkSync(pidfile);
} else {
  if (!existsSync(join(root, ".next", "BUILD_ID")))
    throw new Error("Run npm run build first.");
  if (ownProcess(oldPid)) {
    console.log("Compilab is already running at http://127.0.0.1:3000");
    process.exit(0);
  }
  const out = openSync(join(local, "server.log"), "a");
  const err = openSync(join(local, "server-error.log"), "a");
  const child = spawn(
    process.execPath,
    [cli, "start", "--hostname", "127.0.0.1", "--port", "3000"],
    {
      cwd: root,
      detached: true,
      windowsHide: true,
      stdio: ["ignore", out, err],
    },
  );
  closeSync(out);
  closeSync(err);
  if (!child.pid) throw new Error("Could not start Compilab.");
  child.unref();
  writeFileSync(pidfile, String(child.pid));
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch("http://127.0.0.1:3000", {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok && (await response.text()).includes("Compilab")) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready)
    throw new Error(
      "Server did not become ready. Check .local/server-error.log and PostgreSQL.",
    );
  console.log(
    "Compilab is running at http://127.0.0.1:3000. Stop with npm run stop:local.",
  );
}
