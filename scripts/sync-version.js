#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const helpers = require("./helpers")
const package = require("./../package.json")
const version = package.version

exports.syncVersion = async function () {
  const cwd = helpers.getCwd()
  const indexHtmlPath = path.join(__dirname, "./../index.html")

  let indexHtml = fs.readFileSync(indexHtmlPath, "utf8")

  // update index.html
  indexHtml = indexHtml.replace(/v([\d\.]+)/g, (match, g1) => match.replace(g1, version))

  // save index.html
  fs.writeFileSync(indexHtmlPath, indexHtml)

  // git add index.html
  await helpers.spawnAsync("git", ["add", indexHtmlPath], { cwd })

  console.log(`The changes has been saved to: 
   ✔ ${indexHtmlPath}
  `)
}

if (require.main === module) {
  exports.syncVersion()
    .catch(err => console.error(err))
}
