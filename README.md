# NPM Audit+

**NPM Audit+** is a wrapper around NPM's [built-in audit tool](https://docs.npmjs.com/cli/audit). It adds the following functionality:

* Ignore particular advisories
* Specify a project to audit
* Output audit result as JUnit XML, compatible with many CI systems

## Installation

```sh
npm install npm-audit-plus
```

## Usage

```sh
npm-audit-plus --ignore=123,456 --xml
```

For more documentation on NPM Audit+'s flags, run

```sh
npm-audit-plus --help
```