#!/usr/bin/env node

const path = require("path")
const { getCwd, spawnAsync } = require("./helpers")

exports.ghPagesPublishAsync = async function () {
  const cwd = getCwd()
  const tmpCwd = path.resolve(__dirname, "./../.publish")
  const url = await spawnAsync("git", ["config", "--get", "remote.origin.url"], { cwd })
  const currBranch = await spawnAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd })

  // short plan for script
  // check if repo is clean
  // clone in .gh-publish repo with gh-pages branch selected
  // pull recent version of gh-pages branch
  // move files/folterd and commit them
  // push to remove

  // currBranch =currBranch.trim()

  // try {
  //   console.log('spawnAsync("git", ["checkout", "gh-pages"], { cwd })')
  //   await spawnAsync("git", ["checkout", "gh-pages"], { cwd })
  //   console.log('spawnAsync("git", ["add", "./"], { cwd })')
  //   await spawnAsync("git", ["add", "./"], { cwd })

  //   // await spawnAsync("touch", ["test.txt"], { cwd })

  //   console.log('spawnAsync("git", ["status", "--porcelain"], { cwd })')
  //   const status = await spawnAsync("git", ["status", "--porcelain"], { cwd })

  //   if (!status) {
  //     return
  //   }

  //   console.log('spawnAsync("git", ["commit", "-m", "auto commit " + new Date().toISOString()], { cwd })')
  //   await spawnAsync("git", ["commit", "-m", "auto commit " + new Date().toISOString()], { cwd })
  //   console.log('spawnAsync("git", ["push", "origin", "gh-pages"], { cwd })')
  //   await spawnAsync("git", ["push", "origin", "gh-pages"], { cwd })
  // }
  // finally {
  //   await spawnAsync("git", ["checkout", currBranch])
  // }
}

if (require.main === module) {
  exports.ghPagesPublishAsync()
    .catch(err => console.error(err))
}
