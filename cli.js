var package = require('./package.json')
console.log('carta gtfs import scripts - version ' + package.version)

var argv = require('yargs')
  .alias('i', 'input')
  .describe('i', 'Specify the input directory')
  .alias('o', 'output')
  .describe('o', 'Specify the output directory')
  .usage('node cli --input <directory> --output <directory>')
  .demand(['i','o'])
  .example('node cli --input c:/gtfs --output c:/gtfs_clean','Runs the clean up scripts on data in c:/gtfs.\n\tNew files will be written to c:/gtfs_bak')
  .argv
var fix = require('./fix')

fix(argv.input, argv.output)