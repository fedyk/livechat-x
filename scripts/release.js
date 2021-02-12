#!/usr/bin/env node

const { buildTsc } = require("./build-tsc")
const { ghPagesPublishAsync } = require("./gh-pages-publish")

exports.release = async function () {
  await buildTsc()
  await ghPagesPublishAsync()
}

if (require.main === module) {
  exports.release()
    .catch(err => console.error(err))
}
