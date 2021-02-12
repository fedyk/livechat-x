#!/usr/bin/env node

const { getCwd, spawnAsync } = require("./helpers")

exports.ghPagesPublishAsync = async function () {
  const currBranch = await spawnAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: getCwd() })

  try {
    await spawnAsync("git", ["checkout", "gh-pages"], { cwd: getCwd() })
    await spawnAsync("git", ["add", "./"], { cwd: getCwd() })

    const r = await spawnAsync("git", ["status", "--porcelain"], { cwd: getCwd() })

    console.log("r", r)

    await spawnAsync("git", ["commit", "-m", "auto commit " + new Date().toISOString()], { cwd: getCwd() })
    await spawnAsync("git", ["push", "origin", "gh-pages"], { cwd: getCwd() })
  }
  finally {
    await spawnAsync("git", ["checkout", currBranch])
  }
}

if (require.main === module) {
  exports.ghPagesPublishAsync()
    .catch(err => console.error(err))
}
