import { spawn } from "node:child_process";
async function run(file) {
  const child = spawn(process.execPath, [file], {
    stdio: "inherit",
    env: process.env,
  });
  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${file} exited ${code}`)),
    );
  });
}
for (const file of ["guided-browser", "story-browser", "practical-browser"]) {
  await run(`tests/${file}.mjs`);
}
