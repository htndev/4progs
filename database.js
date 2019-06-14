const mysql = require( 'mysql' ),
      cfg   = require( './dbConfig' );

module.exports = class Database {
  constructor () {
    this.connection = mysql.createPool( {
      host    : cfg.host, user: cfg.user, password: cfg.password,
      database: cfg.db, charset: cfg.charset
    } );
  }

  query ( sql, args ) {
    return new Promise( ( resolve, reject ) => {
      this.connection.query( sql, args, ( error, rows ) => {
        if ( error ) {
          return reject( error );
        }
        // console.log( rows );
        resolve( rows );
      } );
    } );
  }

  close () {
    return new Promise( ( resolve, reject ) => {
      this.connection.end( error => {
        if ( error ) {
          reject( error );
        }
        resolve();
      } );
    } );
  }
};

/**
 * Usage:
 * @type {module.Database}
 */
// let db = new Database();

// db.query( 'SELECT * FROM users', [] )
//   .then( result => console.log( result ) );