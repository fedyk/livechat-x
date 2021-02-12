#!/usr/bin/env node

const helpers = require("./helpers")

exports.buildTsc = async function () {
  await helpers.spawnAsync("rm", ["-rf", "js"], {
    cwd: helpers.getCwd()
  })

  await helpers.spawnAsync("./node_modules/.bin/tsc", [], {
    cwd: helpers.getCwd()
  })
}

if (require.main === module) {
  exports.buildTsc()
}
