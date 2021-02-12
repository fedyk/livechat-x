#!/usr/bin/env node

const { spawn } = require("child_process")
const { getCwd } = require("./helpers")

function watchTsc() {
  const tsc = spawn("npx", ["tsc", "--watch", "--preserveWatchOutput"], {
    cwd: getCwd()
  })

  tsc.stdout.pipe(process.stdout)
  tsc.stderr.pipe(process.stderr)

  tsc.on("close", function (code) {
    tsc.stdout.unpipe(process.stdout)
    tsc.stderr.unpipe(process.stderr)
    console.log(`"tsc --watch" exited with code ${code}`)
  })
}

module.exports.watchTsc = watchTsc

if (require.main === module) {
  watchTsc()
}
