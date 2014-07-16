var csv = require('tuttle')
var fs = require('fs')
var filter = require('stream-filter')
var den = require('den')
var path = require('path')
var fs = require('fs')

function fix(inDir, outDir) {

  if (!inDir) {
    throw new Error('input directory not specified!')
  }

  if (!outDir) {
    throw new Error('output directory not specified!')
  }

  if (inDir === outDir) {
    throw new Error('input and output directories must be different')
  }


  if (!fs.existsSync(inDir)) {
    throw new Error(inDir + ' does not exist')
  }


  console.log('running cleanup script')
  console.log('input: %s', inDir)
  console.log('output: %s', outDir)

  // Route Short Name Is Contained In Long Name
  fs.createReadStream(path.join(inDir, 'routes.txt'))
    .pipe(csv.read())
    .pipe(csv.through(function (row){
      row.route_long_name = remove(row.route_long_name, row.route_short_name)
      return row
    }))
    .pipe(csv.write())
    .pipe(fs.createWriteStream(path.join(outDir, 'routes.txt')))
    .on('finish', fixRoutes)

  // format ints in shapes.txt
  fs.createReadStream(path.join(inDir, 'shapes.txt'))
    .pipe(csv.read({json:true}))
    .pipe(csv.through(function (row) {
      row.shape_pt_sequence = parseInt(row.shape_pt_sequence)
      return row
    }))
    .pipe(csv.write())
    .pipe(fs.createWriteStream(path.join(outDir, 'shapes.txt')))

  // Trip Headsign Contains Route Short Name
  // Trip Headsign Contains Route Long Name
  function fixRoutes() {
    var routes = {}
    fs.createReadStream(path.join(inDir, 'routes.txt'))
      .pipe(csv.read({json:true}))
      .pipe(csv.through(function (row) {
        routes[row.route_id] = row
      }))
      .pipe(den())
      .then(function () {

        fs.createReadStream(path.join(inDir, 'trips.txt'))
          .pipe(csv.read({json:true}))
          .pipe(csv.through(function (row) {
            var route = routes[row.route_id]

            row.trip_headsign = remove(row.trip_headsign, route.route_short_name)
            row.trip_headsign = remove(row.trip_headsign, route.route_long_name)
            row.trip_headsign = stripChars(row.trip_headsign, '[]():')

            // set direction id
            if (contains(row.trip_headsign, 'OB') || contains(row.trip_headsign, ' OUT ')) {
              row.direction_id = 0
            }
            else if (contains(row.trip_headsign, 'IB') || contains(row.trip_headsign, ' IN ')) {
              row.direction_id = 1
            } else {
              console.log('no direction: ', row.trip_id)
            }

            // trip leading numbers
            row.trip_headsign = row.trip_headsign.replace(/^[0-9\-]*/,'')
            return row
          }))
          .pipe(csv.write())
          .pipe(fs.createWriteStream(path.join(outDir, 'trips.txt')))
        
      })

  }

}

module.exports = fix

// utility functions:
function stripChars(str, chars) {
  var c = chars.split('')
  if (!c.some(function (char) {
    return contains(str, char)
  })) { return str }

  var newStr = c.reduce(function (str, excludeChar) {
    return str.replace(excludeChar,'')
  }, str)
  console.log('stripChars: ', str, ' => ', newStr)
  return newStr
}

function remove(str, str2) {
  var newStr = str
  while(contains(newStr, str2)) {
    newStr = str.replace(str2, '').trim()
    console.log('remove: ', str, ' => ', newStr)
    str = newStr
  }
  return newStr
}

function contains(str, str2) {
  return str.indexOf(str2) > -1
}