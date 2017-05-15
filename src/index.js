// @flow

import { green, yellow } from 'chalk'
import postcss from 'postcss'
import cssnano from 'cssnano'
import fs from 'fs'
import path from 'path'
import { getCriticalRules } from './getCriticalRules'

/**
 * Do a dry run, console.log the output.
 *
 * @param {string} css CSS to output.
 */
function doDryRun (css: string) {
  console.log(
    // eslint-disable-line no-console
    green(`Critical CSS result is: ${yellow(css)}`)
  )
}

/**
 * Do a dry run, or write a file.
 *
 * @param {bool} dryRun Do a dry run?
 * @param {string} filePath Path to write file to.
 * @param {Object} result PostCSS root object.
 * @return {Function} Calls writeCriticalFile or doDryRun
 */
function dryRunOrWriteFile (
  dryRun: boolean,
  filePath: string,
  result: Object
): void {
  const { css } = result
  return dryRun ? doDryRun(css) : writeCriticalFile(filePath, css)
}

/**
 * Write a file containing critical CSS.
 *
 * @param {string} filePath Path to write file to.
 * @param {string} css CSS to write to file.
 */
function writeCriticalFile (filePath: string, css: string) {
  fs.writeFile(filePath, css, (err: Object) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
  })
}

/**
 * Primary plugin function.
 *
 * @param {object} array of options.
 * @return {function} function for PostCSS plugin.
 */
function buildCritical (options: Object): Function {
  const args = {
    outputPath: process.cwd(),
    outputDest: 'critical.css',
    preserve: true,
    minify: true,
    dryRun: false,
    ...options
  }
  return (css: Object): Object => {
    const { dryRun, preserve, minify, outputPath, outputDest } = args
    const criticalOutput = getCriticalRules(css, preserve, outputDest)
    return Object.keys(
      criticalOutput
    ).reduce((init: Object, cur: string): Function => {
      const criticalCSS = postcss.root()
      const filePath = path.join(outputPath, cur)
      criticalOutput[cur].each((rule: Object): Function =>
        criticalCSS.append(rule.clone())
      )
      return postcss(minify ? [cssnano] : [])
        .process(criticalCSS)
        .then(dryRunOrWriteFile.bind(null, dryRun, filePath))
    }, {})
  }
}

module.exports = postcss.plugin('postcss-critical', buildCritical)
