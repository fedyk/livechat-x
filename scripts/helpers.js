#!/usr/bin/env node

const path = require("path")
const { spawn } = require("child_process")

exports.getCwd = function getCwd() {
  return path.resolve(__dirname, "./../")
}

exports.spawnAsync = function spawnAsync(command, args, options) {
  const childProcess = spawn(command, args, options)
  let stdoutData = ""
  let stderrData = ""

  childProcess.stdout.on("data", handleStdoutData)
  childProcess.stderr.on("data", handleStderrData)

  function handleStdoutData(data) {
    data = String(data)

    console.log(data)
    stdoutData += data
  }

  function handleStderrData(data) {
    data = String(data)

    console.error(data)
    stderrData += data
  }

  return new Promise(function (resolve, reject) {
    childProcess.on("close", function (code) {
      childProcess.stdout.off("data", handleStdoutData)
      childProcess.stderr.off("data", handleStderrData)

      if (code === 0) {
        resolve(stdoutData.trim())
      }
      else {
        reject(new Error(stderrData || `command "${command} ${args.join(" ")}" exited with code ${code}`))
      }
    })
  })
}
