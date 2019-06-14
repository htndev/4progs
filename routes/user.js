let express = require( 'express' );
let user = express();
let db = require( '../databaseConnection' );
const dbp = require( '../database' );
const dbConnection = new dbp();
let bodyParser = require( 'body-parser' );
let sess;

function isEmptyObject ( obj ) {
  return !Object.keys( obj ).length;
}



// module.exports = user;