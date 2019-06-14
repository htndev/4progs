var mysql = require( 'mysql' );
var pool = mysql.createPool( {
  connectionLimit: 10,
  host           : 'localhost',
  user           : 'root',
  password       : '',
  database       : '4progs'
} );
module.exports.dbconnection = pool;