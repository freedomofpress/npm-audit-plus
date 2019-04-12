const renderAction = action => {
  // Use a set to dedupe resolved advisory IDs
  const resolvedAdvisories = Array.from(new Set(action.resolves.map(x => x.id)))
  if (action.isMajor) {
    return `MAJOR: Run \`npm ${action.action} ${action.module}@${action.target}\` to resolve these advisories: ${resolvedAdvisories.join(', ')}`
  } else if (action.action === 'install' || action.action === 'update') {
    return `Run \`npm ${action.action} ${action.module}@${action.target}\` to resolve these advisories: ${resolvedAdvisories.join(', ')}`
  } else if (action.action === 'review') {
    return `Manually review \`${action.module}\` to resolve these advisories: ${resolvedAdvisories.join(', ')}`
  }
}

// START TEMPLATE: Generate a human-readable title from an advisory object
const advisoryTitle = advisoryObj => `${advisoryObj.severity.toUpperCase()}: ${advisoryObj.id} - ${advisoryObj.title}`
// END TEMPLATE


// START TEMPLATE: take an advisory object and render a human-readable display
const advisorySummary = advisoryObj => `${advisoryObj.overview}

${advisoryObj.recommendation}

- Version:   ${advisoryObj.findings[0].version}
- Path:      ${advisoryObj.findings[0].paths[0]}
- More info: ${advisoryObj.url}`
// END TEMPLATE


// START TEMPLATE: take a list of recommended actions and lists of advisory IDs
// to generate a summary of the audit
const auditSummary = (actions, passThruIds, ignoredIds) => `Summary

- Advisories: ${passThruIds.length}
- Ignored:    ${ignoredIds.length}
${actions.length > 0 ? (
  '\nRecommended Actions\n\n' +
  actions.map(a => '- ' + renderAction(a)).join('\n')
): ''}`
// END TEMPLATE


module.exports = { advisoryTitle, advisorySummary, auditSummary }