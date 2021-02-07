#!/usr/bin/env node

const { spawn } = require("child_process")
const { getCwd } = require("./helpers")

function watchTsc() {
  const process = spawn("npx", ["tsc", "--watch", "--preserveWatchOutput"], {
    cwd: getCwd()
  })

  process.stdout.on("data", data => console.log(data + ""))
  process.stderr.on("data", data => console.error(data + ""))
  process.on("close", (code) => console.log(`"tsc --watch" exited with code ${code}`));
}

module.exports.watchTsc = watchTsc

if (require.main === module) {
  watchTsc()
}
