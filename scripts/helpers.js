#!/usr/bin/env node

const path = require("path")

exports.getCwd = function getCwd() {
  return path.resolve(__dirname, "./../")
}
