#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { getCwd, spawnAsync } = require("./helpers")

exports.ghPagesPublishAsync = async function () {
  const cwd = getCwd()
  const tmpCwd = path.resolve(__dirname, "./../.publish")
  const origin = await spawnAsync("git", ["config", "--get", "remote.origin.url"], { cwd })

  if (!fs.existsSync(tmpCwd))  {
    await spawnAsync("git", ["clone", "--branch", "gh-pages", origin, tmpCwd])
  }
  else {
    await spawnAsync("git", ["pull", "origin", "gh-pages"], { cwd: tmpCwd })
  }

  // clean tmp
  await spawnAsync("rm", ["-r", "*"], { cwd: tmpCwd, shell: true })

  // copy index.html
  await spawnAsync("cp", ["index.html", tmpCwd], { cwd: cwd })
  
  // copy js
  await spawnAsync("cp", ["-rf", "./js", tmpCwd], { cwd: cwd })

  // copy css
  await spawnAsync("cp", ["-rf", "./css", tmpCwd])

  // copy favicon.svg
  await spawnAsync("cp", ["favicon.svg", tmpCwd])

  // git add .
  await spawnAsync("git", ["add", "."], { cwd: tmpCwd })

  // git status --porcelain
  const gitStatus = await spawnAsync("git", ["status", "--porcelain"], { cwd: tmpCwd })

  // git commit
  if (gitStatus) {
    await spawnAsync("git", ["commit", "-m", "auto commit"], { cwd: tmpCwd })
  }

  // git push origin gh-pages
  await spawnAsync("git", ["push", "origin", "gh-pages"], { cwd: tmpCwd })
}

if (require.main === module) {
  exports.ghPagesPublishAsync()
    .catch(err => console.error(err))
}
