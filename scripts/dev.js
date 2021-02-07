#!/usr/bin/env node

const { watchTsc } = require("./watch-tsc")
const { serveStatic } = require("./serve-static")

function dev() {
  watchTsc()
  serveStatic()
}

module.exports.dev = dev

if (require.main === module) {
  dev()
}
