#!/usr/bin/env node

const { spawn } = require("child_process")
const { getCwd } = require("./helpers")
const port = "8080"

function serveStatic() {
  const process = spawn("python", ["-m", "SimpleHTTPServer", port], {
    cwd: getCwd()
  })

  process.stdout.on("data", data => console.log(data + ""))
  process.stderr.on("data", data => console.error(data + ""))
  process.on("close", (code) => console.log(`"process exited with code ${code}`));

  console.log(`static server has started on port ${port}`)
}

module.exports.serveStatic = serveStatic

if (require.main === module) {
  serveStatic()
}
