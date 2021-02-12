#!/usr/bin/env node

const { spawn } = require("child_process")
const { getCwd } = require("./helpers")
const port = "8080"

function serveStatic() {
  const python = spawn("python", ["-m", "SimpleHTTPServer", port], {
    cwd: getCwd()
  })

  python.stdout.pipe(process.stdout)
  python.stderr.pipe(process.stderr)

  python.on("close", function (code) {
    python.stdout.unpipe(process.stdout)
    python.stderr.unpipe(process.stderr)

    console.log(`"process exited with code ${code}`)
  })

  console.log(`static server has started on port ${port}`)
}

module.exports.serveStatic = serveStatic

if (require.main === module) {
  serveStatic()
}
