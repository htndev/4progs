const express = require( 'express' );
const site = express();
const fs = require( 'fs' );
const emailing = require( '../emailing' );
const upload = require( 'express-fileupload' );
const dbp = require( '../database' );
const dbConnection = new dbp();
const db = require( '../databaseConnection' );
const bodyParser = require( 'body-parser' );
const md5 = require( 'md5' );
const expressSession = require( 'express-session' );
const urlencodedParser = bodyParser.urlencoded( { extended: false } );
const multer = require( 'multer' );
const multerUpload = multer( { dest: 'uploads/' } );
const ini = require( 'ini' );
site.use( upload() );
let days = 86400000 * 3;
site.use( expressSession( {
  secret  : '4Progs', resave: true, saveUninitialized: true, maxAge: days,
  httpOnly: true
} ) );
let sess;

function isEmptyObject ( obj ) {
  return !Object.keys( obj ).length;
}

const insertToken = ( token, email, password ) => {
  let query = 'INSERT INTO confirmations (token, email, password) VALUES (?, ?, ?)';
  dbConnection.query( query, [ token, email, password ] );
};

const getRequestsAmount = id => {
  return new Promise( ( resolve, reject ) => {
    let sqlCount = 'SELECT COUNT(*) FROM requests WHERE to_user = ?';
    dbConnection
      .query( sqlCount, [ id ] )
      .then( result => resolve( result[ 0 ][ 'COUNT(*)' ] ) );

  } );
};

/* GET home page. */
site.get( '/', function ( req, res, next ) {
  sess = req.session;
  if ( sess.userName === undefined || sess.userName === null ) {
    let cfg = ini.parse( fs.readFileSync( __dirname + '/../cfg.ini', 'utf-8' ) );
    res.render( 'index', {
      title: 'Welcome to 4Progs', config: cfg, username: sess.userName
    } );
  } else {
    res.redirect( 'feed' );
  }
} );

const selectFriendsInfo = item => {
  return new Promise( resolve => {
    dbConnection
      .query( 'SELECT user_name as name, user_title as title, avatar as avatar FROM users WHERE id = ? and banned = 0', [ item.id ] )
      .then( result => resolve( result[ 0 ] ) )
      .catch( error => console.error( error ) );
  } );
};

const selectUserPost = item => {
  return new Promise( resolve => {
    dbConnection
      .query( 'SELECT id, publishing_place, post_text, likes, comments, posted_date as date FROM post  WHERE publishing_place = ? and banned = 0 and type = "user"', [ item.id ] )
      .then( result => resolve( result ) )
      .catch( error => console.error( error ) );
  } );
};

const selectAttachment = item => {
  return new Promise( resolve => {
    dbConnection
      .query( 'SELECT type, content, language FROM post_attachment WHERE post_id = ?', [ item.id ] )
      .then( result => resolve( result ) );
  } );
};

const getPostAttachments = item => {
  return new Promise( resolve => {
    let subActions = item.map( selectAttachment );
    let subResults = Promise.all( subActions );
    subResults
      .then( data => {
        resolve( data );
      } );
  } );
};

const selectGroupInfo = item => {
  return new Promise( resolve => {
    dbConnection
      .query( 'SELECT id, group_name as name, group_title as title, group_avatar as avatar FROM `group` WHERE id = ? and banned = 0', item.id )
      .then( result => resolve( result[ 0 ] ) );
  } );
};

const selectGroupsPosts = item => {
  return new Promise( resolve => {
    dbConnection
      .query( 'SELECT id, publishing_place, post_text, likes, comments, posted_date as date FROM post WHERE publishing_place = ? and banned = 0 and type="group"', [ item.id ] )
      .then( result => resolve( result ) );
  } );
};

site.get( '/feed', ( req, res, next ) => {
  sess = req.session;
  if ( sess.userName !== undefined ) {
    let sqlGetUser = 'SELECT id FROM users WHERE user_name = ? and banned = 0 or email = ? and banned = 0',
        userID,
        isRequest  = false,
        numberOfRequests;

    dbConnection
      .query( sqlGetUser, [ sess.userName, sess.userName ] )
      .then( result => {
        if ( isEmptyObject( result ) ) {
          return res.redirect( '/' );
        }
        userID = result[ 0 ][ 'id' ];
        getRequestsAmount( userID )
          .then( count => {
            if ( count > 0 ) {
              numberOfRequests = count;
              isRequest = true;
            }
          } );
      } );
    let currentUser = { name: sess.userName },
        postsArray  = [];
    return new Promise( resolve => {
      dbConnection
        .query( 'SELECT id, user_name, user_title, position, avatar FROM users WHERE user_name = ? or email = ? and banned = 0', [
          currentUser.name, currentUser.name
        ] )
        .then( curUser => {
          if ( isEmptyObject( curUser ) ) {
            return res.redirect( '/logout' );
          }
          [
            currentUser.id,
            currentUser.username,
            currentUser.title,
            currentUser.avatar,
            currentUser.privilege
          ] = [
            curUser[ 0 ].id,
            curUser[ 0 ].user_name,
            curUser[ 0 ].user_title,
            curUser[ 0 ].avatar,
            curUser[ 0 ].position > 0
          ];
          resolve();
        } );
    } )
      .then( () => {
        return new Promise( resolve => {
          getRequestsAmount( currentUser.id )
            .then( result => {
              console.log( result );
              resolve();
            } );
        } );
      } )
      .then( () => {
        // selecting all friends news
        return new Promise( resolveUser => {
          dbConnection
            .query( 'SELECT user_friend as id FROM friend_list WHERE user_id = ?', [ currentUser.id ] )
            .then( friendsIds => {
              let actions = friendsIds.map( selectFriendsInfo );
              let results = Promise.all( actions );
              results
                .then( data => {
                  console.log( friendsIds );
                  return new Promise( resolve => {
                    data.forEach( ( item, index ) => {
                      if ( item === undefined ) {
                        data.splice( index, 1 );
                      }
                      console.log( 'Here' );
                      console.log( index );
                      console.log( item );
                      // console.log( friendsIds[ index ] );
                      if ( item !== undefined ) {
                        item.id = friendsIds[ index ].id;
                      }
                    } );
                    resolve( data );
                  } );
                } )
                .then( friends => {
                  // console.log( 'This is data' );
                  console.log( 'FR' );
                  console.log( friends );
                  friends.forEach( ( item, index ) => {
                    if ( item === undefined ) {
                      friends.splice( index, 1 );
                    }
                  } );
                  let actions = friends.map( selectUserPost );
                  let results = Promise.all( actions );
                  results
                    .then( posts => {
                      let postAct = posts.map( getPostAttachments );
                      let postRes = Promise.all( postAct );
                      postRes
                        .then( data => {
                          posts.forEach( ( item, index ) => {
                            item.forEach( ( element, i ) => {
                              element.attachmentsExists = data[ index ][ i ].length > 0;
                              if ( element.attachmentsExists ) {
                                element.attachments = {};
                                element.attachments.snippets = [];
                                element.attachments.photos = [];
                                data[ index ][ i ].forEach( attach => {
                                  if ( typeof attach === 'object' ) {
                                    if ( attach.type === 'image' ) {
                                      element.attachments.photos.push( attach.content );
                                    } else if ( attach.type === 'code' ) {
                                      element.attachments.snippets.push( {
                                        code    : attach.content,
                                        language: attach.language
                                      } );
                                    }
                                  }
                                } );
                              }
                            } );
                          } );
                          posts.forEach( item => {
                            item.forEach( element => {
                              element.letter = 'p';
                              friends.forEach( friend => {
                                if ( friend.id === element.publishing_place ) {
                                  return element.poster = friend;
                                }
                              } );
                              postsArray.push( element );
                            } );
                          } );
                          resolveUser();
                        } );
                    } );
                } );
            } );
        } )
          .then( () => {
            return new Promise( resolveGroup => {
              console.log( 'How its going on?' );
              return new Promise( resolve => {
                dbConnection
                  .query( 'SELECT group_id as id FROM group_memebership WHERE id_user = ?', [ currentUser.id ] )
                  .then( groupResult => {
                    let actions = groupResult.map( selectGroupInfo );
                    let results = Promise.all( actions );
                    results
                      .then( data => {
                        resolve( data );
                      } );
                  } );
              } )
                .then( groupsInfo => {
                  groupsInfo.forEach( ( item, index ) => {
                    if ( item === undefined ) {
                      groupsInfo.splice( index, 1 );
                    }
                  } );
                  let actions = groupsInfo.map( selectGroupsPosts );
                  let results = Promise.all( actions );
                  results
                    .then( posts => {
                      let actions = posts.map( getPostAttachments );
                      let results = Promise.all( actions );
                      results
                        .then( data => {
                          data.forEach( ( item, index ) => {
                            posts[ index ].forEach( ( element, i ) => {
                              element.attachmentsExists = item[ i ].length > 0;
                              if ( element.attachmentsExists ) {
                                element.attachments = {};
                                element.attachments.snippets = [];
                                element.attachments.photos = [];
                                item[ i ].forEach( elem => {
                                  if ( elem.type === 'image' ) {
                                    element.attachments.photos.push( elem.content );
                                  } else if ( elem.type === 'code' ) {
                                    element.attachments.snippets.push( {
                                      code    : elem.content,
                                      language: elem.language
                                    } );
                                  }
                                } );
                              }
                            } );
                          } );
                          posts.forEach( item => {
                            item.forEach( element => {
                              element.letter = 'g';
                              groupsInfo.forEach( group => {
                                if ( group.id === element.publishing_place ) {
                                  return element.poster = group;
                                }
                              } );
                              postsArray.push( element );
                            } );
                            postsArray.push();
                          } );
                          console.log( postsArray.length );
                          postsArray.forEach( ( item, index ) => {
                            // console.log( item );
                            if ( item === undefined ) {
                              postsArray.splice( index, 1 );
                            } else {
                              item.i = index + 1;
                            }
                          } );
                          console.log( '~~~~~~~~~~~~~~~~~~' );
                          postsArray.sort( ( a, b ) => new Date( a.date ) - new Date( b.date ) );
                          postsArray.reverse();
                          postsArray.forEach( element => {
                            let date = new Date( element.date );
                            element.date = `${ ( '0' + date.getHours() ).slice( -2 ) }:${ ( '0' + date.getMinutes() ).slice( -2 ) } ${ ( '0' + date.getDate() ).slice( -2 ) }.${ ( '0' + ( +date.getMonth() + 1 ) ).slice( -2 ) }.${ date.getFullYear() }`;
                            console.log( element.date );
                          } );
                          // return;
                          resolveGroup();
                        } );
                    } );
                } );
            } );
          } )
          .then( () => {
            return res.render( 'feed', {
              title              : 'Feed',
              user               : currentUser,
              posts              : postsArray,
              username           : currentUser.username,
              isRequest          : isRequest,
              friendsNotification: numberOfRequests,
              postsExists        : postsArray.length > 0
            } );
          } );
      } );
  } else {
    return res.redirect( '/' );
  }
} );

site.post( '/signin', urlencodedParser, function ( req, res, next ) {
  sess = req.session;
  if ( !req.body ) return res.sendStatus( 400 );
  let email = req.body.usrLogin;
  let userName = req.body.usrLogin;
  let password = req.body.usrPassword;
  console.log( email, userName, password );
  let sql = 'SELECT * FROM users WHERE email = ? or user_name = ? and password = ? and banned = b\'0\'';
  db.dbconnection.query( sql, [
    email, userName, password
  ], function ( err, result, fields ) {
    if ( err ) throw new Error( err );
    if ( isEmptyObject( result ) ) {
      res.send( JSON.stringify( {
        result: 'Failed', text: 'Wrong login or password'
      } ) );
      res.end();
    } else {
      sess.userName = userName.toLowerCase();
      res.redirect( 'feed' );
    }
  } );
} );

site.post( '/signup', urlencodedParser, function ( req, res, next ) {
  let email    = req.body.email,
      password = req.body.password,
      confPass = req.body[ 'password-confirmation' ];
  if ( email !== undefined && password !== undefined && confPass !== undefined ) {
    if ( confPass === password ) {
      let sql = 'SELECT * FROM users WHERE email = ?';
      db.dbconnection.query( sql, [ email ], ( err, result, fields ) => {
        if ( err ) throw new Error( err );
        if ( isEmptyObject( result ) ) {
          let sql = 'SELECT * FROM confirmations WHERE email = ?';
          let token = md5( email + ( new Date() ) + Math.random() * 100 );
          db.dbconnection.query( sql, [ email ], ( error, result ) => {
            if ( error ) throw new Error( error );
            if ( !isEmptyObject( result ) ) {
              let query = 'DELETE FROM confirmations WHERE email = ?';
              db.dbconnection.query( query, [ email ] );
              insertToken( token, email, password );
            } else {
              insertToken( token, email, password );
            }
          } );
          let txt     = `<h1>Thank you for registration!</h1><p>Follow link token: <a href="http://${ req.headers.host }/registration/${ token }">Follow me</a></p><p><b>TOKEN IS DISPOSABLE!</b></p>`,
              subject = '4progs registration';
          emailing.sendEmail( txt, email, subject );
          res.send( JSON.stringify( {
            result: 'Successful',
            text  : 'Confirmation letter has been sent to your email 📩'
          } ) );
          res.end();
        } else {
          res.send( JSON.stringify( {
            result: 'Failed', text: 'User has already exists 🙁'
          } ) );
          res.end();
        }
      } );
    } else {
      res.send( JSON.stringify( {
        result: 'Failed', text: 'Passwords are different'
      } ) );
      res.end();
    }
  }
} );

// site.get('/settings', function (req, res, next) {
//   sess = req.session;
//   if (sess.userName !== undefined) {
//     let sql = 'SELECT * FROM users WHERE user_name = ? or email = ?';
//     dbConnection
//       .query(sql, [sess.userName, sess.userName])
//       .then(result => {
//         let userBio     = result[0]['user_title'].split(' ');
//         let username    = userBio[0].toString();
//         let usersurname = userBio[1].toString();
//         res.render('user_settings', {
//           title      : 'Settings',
//           condition  : false,
//           res        : result,
//           userName   : username,
//           userSurname: usersurname,
//           username   : username
//         });
//       });
//   }
// });

site.post( '/settingAdditional', urlencodedParser, function ( req, res, next ) {
  sess = req.session;
  let status = req.body.Status;
  let BIO = req.body.Bio;
  if ( req.files !== null ) {
    let file = req.files.user_avatar;
    let fileExt = file.mimetype.split( '/' );
    let filename = md5( file.name + ( new Date ).getTime() );
    let filePath = `public/user/${ filename }.${ fileExt[ 1 ] }`;
    let sql = 'UPDATE users SET avatar = ? WHERE user_name = ?';
    dbConnection
      .query( sql, [ filePath, sess.userName ] )
      .then( result => {
        if ( !isEmptyObject( result ) ) {
          file
            .mv( filePath, function ( err ) {
              if ( err ) {
                res.send( JSON.stringify( {
                  result: 'Failed', text: 'Problems with uploading file'
                } ) );
              } else {
                res.send( JSON.stringify( {
                  result: 'Success', text: 'New avatar has been set'
                } ) );
              }
            } );
        }
      } );
  }
  if ( req.files === null ) {
    let statusBioSql = 'UPDATE users SET bio = ?, status = ? WHERE user_name = ?';
    dbConnection
      .query( statusBioSql, [ BIO, status, sess.userName ] )
      .then( result => {
        if ( !isEmptyObject( result ) ) {
          res.send( JSON.stringify( {
            result: 'Success', text: 'Your data has been updated!'
          } ) );
        } else {
          res.send( JSON.stringify( {
            result: 'Failed', text: 'Connection with server lost!'
          } ) );
        }
      } );
  }
} );

site.post( '/like', urlencodedParser, ( req, res, next ) => {
  sess = req.session;
  if ( sess.userName !== undefined ) {
    console.log( req.body );
    let postId = +req.body.postId,
        userId;
    return new Promise( resolve => {
      dbConnection
        .query( 'SELECT id FROM users WHERE user_name = ? or email = ? and banned = 0', [
          sess.userName, sess.userName
        ] )
        .then( result => {
          userId = result[ 0 ].id;
          resolve();
        } );
    } )
      .then( () => {
        console.log( userId, postId );
        dbConnection
          .query( 'SELECT * FROM likes WHERE post_id = ? and user_id = ?', [
            postId, userId
          ] )
          .then( result => {
            if ( isEmptyObject( result ) ) {
              dbConnection
                .query( 'INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [
                  userId, postId
                ] )
                .then( () => {
                  dbConnection
                    .query( 'UPDATE post SET likes = likes + 1 WHERE id = ? and banned = 0', postId )
                    .then( () => {
                      dbConnection
                        .query( 'SELECT likes FROM post WHERE id = ?', [ postId ] )
                        .then( result => res.send( '' + result[ 0 ].likes ) );
                    } );
                } );
            } else {
              dbConnection
                .query( 'DELETE FROM likes WHERE user_id = ? and post_id = ?', [
                  userId, postId
                ] )
                .then( () => {
                  dbConnection
                    .query( 'UPDATE post SET likes = likes - 1 WHERE id = ? and banned = 0', postId )
                    .then( () => {
                      dbConnection
                        .query( 'SELECT likes FROM post WHERE id = ?', [ postId ] )
                        .then( result => res.send( '' + result[ 0 ].likes ) );
                    } );
                } );
            }
          } );
      } );
  }
} );

site.get( '/faq', ( req, res, next ) => {
  dbConnection
    .query( 'SELECT title, description FROM faq' )
    .then( result => {
      let faqExists = !isEmptyObject( result );
      return res.render( 'faq', {
        title   : 'FAQ', faqs: result, exists: faqExists,
        username: req.session.userName
      } );
    } );
} );

site.get( '/logout', function ( req, res, next ) {
  sess = req.session;
  sess.destroy();
  res.redirect( '/' );
} );

module.exports = site;