#!/usr/bin/env node

const { getCwd, spawnAsync } = require("./helpers")

exports.ghPagesPublishAsync = async function () {
  const cwd = getCwd()
}

if (require.main === module) {
  exports.ghPagesPublishAsync()
    .catch(err => console.error(err))
}


/*/**
 * Use version from package.json and use it in app.json and other places
 * 
 * Usage:
 * $ node sync-version.js
 */
const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const cwd = path.join(__dirname, "./../")
const appPath = path.join(__dirname, "./../app.json")
const easPath = path.join(__dirname, "./../eas.json")
const buildGradlePath = path.join(__dirname, "./../android/app/build.gradle")
const androidManifestPath = path.join(__dirname, "../android/app/src/main/AndroidManifest.xml")
const infoPlistPath = path.join(__dirname, "../ios/LiveChatLite/Info.plist")
const expoPlistPath = path.join(__dirname, "../ios/LiveChatLite/Supporting/Expo.plist")
const package = require(path.join(__dirname, "../package.json"))
const app = require(appPath)
const eas = require(easPath)
const version = parseVersion(package.version)
const androidVersionCode = getVersionCode(version)
const releaseChannel = getReleaseChannel(version)
let buildGradle = fs.readFileSync(buildGradlePath, "utf8")
let androidManifest = fs.readFileSync(androidManifestPath, "utf8")
let infoPlist = fs.readFileSync(infoPlistPath, "utf8")
let expoPlist = fs.readFileSync(expoPlistPath, "utf8")

// update app.json
app.expo.version = version
app.expo.ios.buildNumber = version
app.expo.android.versionCode = androidVersionCode

// save app.json
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + "\n")

// add app.json to git
spawnSync("git", ["add", appPath], { cwd })

// update eas.json
eas.builds.android.release.releaseChannel = releaseChannel
eas.builds.ios.release.releaseChannel = releaseChannel

// save app.json
fs.writeFileSync(easPath, JSON.stringify(eas, null, 2) + "\n")

// add app.json to git
spawnSync("git", ["add", easPath], { cwd })

// update build.gradle
buildGradle = buildGradle.replace(/versionCode\s\d*/, `versionCode ${androidVersionCode}`)
buildGradle = buildGradle.replace(/versionName\s\"[\d.]*\"/, `versionName "${version}"`)

// save build.gradle
fs.writeFileSync(buildGradlePath, buildGradle)

// git add build.gradle
spawnSync("git", ["add", buildGradlePath], { cwd })

// update AndroidManifest.xml
androidManifest = androidManifest.replace(/android\:value=\"v\d+.\d+"/, `android:value="${releaseChannel}"`)

// save AndroidManifest.xml
fs.writeFileSync(androidManifestPath, androidManifest)

// git add AndroidManifest.xml
spawnSync("git", ["add", androidManifestPath], { cwd })

// update infoPlist
infoPlist = infoPlist.replace(/CFBundleShortVersionString<\/key>\s+<string>([\d\.]+)<\/string>/, (match, g1) => match.replace(g1, version))
infoPlist = infoPlist.replace(/CFBundleVersion<\/key>\s+<string>([\d\.]+)<\/string>/, (match, g1) => match.replace(g1, version))

// save Info.plist
fs.writeFileSync(infoPlistPath, infoPlist)

// git add Info.plist
spawnSync("git", ["add", infoPlistPath], { cwd })

// update Expo.plist
expoPlist = expoPlist.replace(/EXUpdatesReleaseChannel<\/key>\s+<string>(v\d+\.\d+)<\/string>/, (match, g1) => match.replace(g1, releaseChannel))

// save Expo.plist
fs.writeFileSync(expoPlistPath, expoPlist)

// git add Expo.plist
spawnSync("git", ["add", expoPlistPath], { cwd })

console.log(`The changes has been saved to: 
 ✔ ${appPath}
 ✔ ${easPath}
 ✔ ${buildGradlePath}
 ✔ ${androidManifestPath}
 ✔ ${infoPlistPath}
 ✔ ${expoPlistPath}
`)

function parseVersion(version) {
  if (typeof version !== "string") {
    throw new RangeError("`version` should be a string")
  }

  const parts = version.split(".")

  if (parts.length !== 3) {
    throw new RangeError("`version` should consost from 3 parts, e.g. x.y.z")
  }

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (Number.isNaN(parseFloat(part))) {
      throw new RangeError("invalid `version` format")
    }
  }

  return version
}

/**
 * String("1.2.3") -> Number(10203)
 */
function getVersionCode(version) {
  const parts = version.split(".")

  return Number(
    parts.map(val => val.padStart(2, "0")).join("")
  )
}


/**
 * "1.2.3" => "v1.2"
 */
function getReleaseChannel(version) {
  const parts = version.split(".")

  return `v${parts[0]}.${parts[1]}`
}
