import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = process.cwd();
const bin =
  process.env.POSTGRES_BIN ??
  (process.platform === "win32"
    ? "C:/Program Files/PostgreSQL/16/bin"
    : "/usr/lib/postgresql/16/bin");
const exe = (name) =>
  join(bin, name + (process.platform === "win32" ? ".exe" : ""));
const local = resolve(root, ".local");
const data = join(local, "postgres");
mkdirSync(local, { recursive: true });
if (!existsSync(join(data, "PG_VERSION"))) {
  const password = randomBytes(24).toString("hex");
  const pwfile = join(local, "init-password");
  writeFileSync(pwfile, password);
  try {
    execFileSync(
      exe("initdb"),
      [
        "-D",
        data,
        "-U",
        "compilab",
        "--pwfile=" + pwfile,
        "--auth-host=scram-sha-256",
        "--auth-local=scram-sha-256",
        "--encoding=UTF8",
        "--locale=C",
      ],
      { stdio: "inherit", windowsHide: true },
    );
  } finally {
    rmSync(pwfile, { force: true });
  }
  const envfile = join(root, ".env.local");
  const existing = existsSync(envfile) ? readFileSync(envfile, "utf8") : "";
  if (/^DATABASE_URL=/m.test(existing))
    throw new Error(
      "Existing DATABASE_URL: configure the new local cluster manually.",
    );
  writeFileSync(
    envfile,
    existing +
      `\nDATABASE_URL=postgresql://compilab:${password}@127.0.0.1:55432/compilab\nAUTH_SECRET=${randomBytes(32).toString("hex")}\nBETTER_AUTH_URL=http://127.0.0.1:3000\nDEMO_ENABLED=true\n`,
  );
}
let running = true;
try {
  execFileSync(exe("pg_ctl"), ["status", "-D", data], {
    stdio: "ignore",
    windowsHide: true,
  });
} catch {
  running = false;
}
if (!running)
  execFileSync(
    exe("pg_ctl"),
    [
      "start",
      "-D",
      data,
      "-l",
      join(local, "postgres.log"),
      "-o",
      "-p 55432 -h 127.0.0.1",
    ],
    { stdio: "inherit", windowsHide: true },
  );
const envtext = readFileSync(join(root, ".env.local"), "utf8");
const url = new URL(envtext.match(/^DATABASE_URL=(.+)$/m)[1].trim());
const env = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) };
const args = ["-h", "127.0.0.1", "-p", "55432", "-U", "compilab"];
const dbs = execFileSync(
  exe("psql"),
  [
    ...args,
    "-d",
    "postgres",
    "-tAc",
    "SELECT datname FROM pg_database WHERE datname='compilab'",
  ],
  { env, encoding: "utf8", windowsHide: true },
);
if (!dbs.trim())
  execFileSync(exe("createdb"), [...args, "compilab"], {
    env,
    stdio: "inherit",
    windowsHide: true,
  });
console.log(
  "Isolated PostgreSQL ready on 127.0.0.1:55432. Configuration saved to ignored .env.local.",
);
