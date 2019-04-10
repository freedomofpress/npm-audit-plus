#!/usr/bin/env node

'use strict'

const path = require('path')
const program = require('commander')
const xmlbuilder = require('xmlbuilder')
const wordwrap = require('word-wrap')

// Import a "promisified" version of `exec` so we can use it procedurally
// with `await`
const { promisify } = require('util')
const exec = promisify(require('child_process').exec)

// Import templates
const templates = require('./templates.js')

program
  .description('Run npm audit with customized output')
  .option('-p, --project <path>', 'Path to a project containing package.json and package-lock.json files. Defaults to current working directory')
  .option('-i, --ignore <ids>', 'Vulnerability IDs to ignore')
  .option('-x, --xml', 'Output as JUnit-formatted XML')
  .action(async function(options) {
    let exceptionIds = []
    const projectDir = options.project ? path.resolve(options.project) : process.cwd()

    // If advisories to ignore are specified in command invocation, parse them
    // into an array
    if (options && options.ignore) {
      // If ignore ids are specified, split them into an array of ints
      exceptionIds = options.ignore.split(',').map(id => parseInt(id))
    }

    // Run `npm audit` and capture output. We use a try/catch to capture
    // output regardless of whether the audit returns zero or not
    let stdout, stderr
    try {
      // Exterior parens necessary for variable unpacking without declaration
      // (i.e., without var/let/const)
      ({ stdout, stderr } = await exec(
        'npm audit --json',
        { cwd: projectDir, maxBuffer: 1000000 }
      ))
    } catch(error) {
      // See above
      ({ stdout, stderr } = error)
    }

    const results = JSON.parse(stdout)
    const advisories = results.advisories
    // List of IDs filtered to the ones that are marked for display
    const passThruAdvisoriesIds = Object.keys(results.advisories).filter(x => !exceptionIds.includes(parseInt(x)))
    // List of IDs filtered to ones that are being ignored
    const ignoredAdvisoriesIds = Object.keys(results.advisories).filter(x => exceptionIds.includes(parseInt(x)))

    // Filter actions to ones that resolve advisories that passed the filter
    // Basically we're checking each action's list of advisories it resolves
    // for overlap with our `passThruAdvisoriesIds`. If theres any overlap, we
    // keep the action. Otherwise we ignore it.
    const passThruActions = results.actions.filter(
      action => action.resolves.some(
        resolveObj => passThruAdvisoriesIds.includes(resolveObj.id.toString())
      )
    )

    if (options && options.xml) {
      // If the command was invoked with the XML argument, output as XML
      const junitJSON = {
        testsuites: {
          testsuite: [
            {
              '@name': 'NPM Audit Summary',
              testcase: {
                '@name': 'Summary',
                '#text': templates.auditSummary(passThruActions, passThruAdvisoriesIds, ignoredAdvisoriesIds)
              }
            },
            {
              '@name': 'NPM Audit Advisories',
              testcase: passThruAdvisoriesIds.map(id => ({
                '@name': templates.advisoryTitle(advisories[id]),
                failure: {
                  '@message': advisories[id].title,
                  '@type': advisories[id].severity.toUpperCase(),
                  '#text': templates.advisorySummary(advisories[id])
                }
              }))
            }
          ]
        }
      }
      const junitXML = xmlbuilder.create(junitJSON, { encoding: 'utf-8' })
      console.log(junitXML.end({ pretty: true }))
    } else {
      // If the command was invoked without the XML argument, output in
      // human-readable format with pretty dividers
      const width = process.stdout.columns
      const hr = '-'.repeat(width)
      const hr2 = '='.repeat(width)
      const title = 'NPM Audit Security Report'
      const leftPad = ' '.repeat(Math.floor((width - title.length) / 2))
      let consoleOutput = '\n' + leftPad + title + '\n\n'
      consoleOutput += hr2 + '\n\n'
      consoleOutput += templates.auditSummary(passThruActions, passThruAdvisoriesIds, ignoredAdvisoriesIds) + '\n\n'
      consoleOutput += hr + '\n\n'
      consoleOutput += passThruAdvisoriesIds.map(id => [
        templates.advisoryTitle(advisories[id]),
        wordwrap(
          templates.advisorySummary(advisories[id]),
          { indent: '', width: width - 2 }
        ),
        hr
      ].join('\n\n')).join('\n\n')
      console.log(consoleOutput)
    }

    // If any advisories were caught, exit non-zero
    if (passThruAdvisoriesIds.length > 0) process.exit(1)
  })

program.parse(process.argv)
