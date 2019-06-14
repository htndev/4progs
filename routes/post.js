const express = require( 'express' );
const post = express();
const fs = require( 'fs' );
const dbp = require( '../database' );
const multer = require( 'multer' );
const upload = multer( { dest: `public/images/` } );
const dbConnection = new dbp();
const bodyParser = require( 'body-parser' );
const md5 = require( 'md5' );
const expressSession = require( 'express-session' );
const urlencodedParser = bodyParser.urlencoded( { extended: false } );
const Prism = require( 'prismjs' );
const Normalizer = require( 'prismjs/plugins/normalize-whitespace/prism-normalize-whitespace' );
let nw = Prism.plugins.NormalizeWhitespace;
let sess;

const throw404 = res => res.status( 404 ).render( '404', { title: 'Ooops!' } );

function isEmptyObject ( obj ) {
  return !Object.keys( obj ).length;
}

function modifyText ( str ) {
  let pattern = /^\@[\d\w]+\b/g;
  str = str.replace( '<', '&#60;' ).replace( '>', '&#62;' );
  console.log( 'String' );
  console.log( str );
  str = str.split( ' ' );
  str.forEach( ( item, index ) => {
    let nickname = pattern.exec( item );
    console.log( item );
    if ( nickname !== null ) {
      nickname = nickname[ 0 ].replace( '@', '' );
      console.log( nickname );
      let rest = item.replace( '@' + nickname, '' );
      str[ index ] = `<a href="/p/${ nickname }">@${ nickname }</a>${ rest }`;
    }
  } );
  return str.join( ' ' );
}

const getMaxPostId = () => {
  return new Promise( ( resolve, reject ) => {
    let getInfo = 'SELECT MAX(id) as maxId FROM post';
    dbConnection
      .query( getInfo, [] )
      .then( result => {
        resolve( result[ 0 ].maxId );
      } )
      .catch( error => reject( error ) );
  } );
};

const selectSnippets = item => {
  return new Promise( resolve => {
    dbConnection
      .query( 'SELECT code, language from uploaded_snippets where id = ?', [ item ] )
      .then( result => resolve( result ) );
  } );
};

const selectPhotos = item => {
  return new Promise( resolve => {
    dbConnection
      .query( 'SELECT path from uploaded_image where id = ?', [ item ] )
      .then( result => resolve( result ) )
      .catch( error => console.log( error ) );
  } );
};

const insertSnippetToAttachments = item => {
  return new Promise( resolve => {
    let code = nw.normalize( item.code, { indent: 1 } );
    dbConnection
      .query( 'INSERT INTO post_attachment (post_id, `type`, content, language) VALUES (?, ?, ?, ?)', [
        item.postId, 'code', code, item.language
      ] )
      .then( result => resolve( result ) )
      .catch( error => console.log( error ) );
  } );
};

const insertPhotosToAttachments = item => {
  return new Promise( resolve => {
    dbConnection
      .query( 'INSERT INTO post_attachment (post_id, `type`, content) values (?, ?, ?)', [
        item.postId, 'image', item.path
      ] )
      .then( result => resolve( result ) );
  } );
};

post.post( '/u/newPost', urlencodedParser, ( req, res, next ) => {
  sess = req.session;
  console.log( 'Im ready to work with post' );
  let postedObject = {
    id      : sess.userName,
    text    : req.body[ 'new-user-post' ],
    snippets: JSON.parse( req.body.snippetsUploaded ),
    photos  : JSON.parse( req.body.photosUploaded ),
    type    : 'u'
  };
  postedObject.text = modifyText( postedObject.text, req.headers.origin );
  return new Promise( resolve => {
    getUserId( postedObject.id )
      .then( result => {
        postedObject.userId = result;
        resolve( result );
      } )
      .then( () => {
        getMaxPostId()
          .then( result => {
            postedObject.postId = result + 1;
            return new Promise( resolve => {
              if ( postedObject.snippets.length > 0 ) {
                let actions = postedObject.snippets.map( selectSnippets );
                let results = Promise.all( actions );
                postedObject.snippetsArray = [];
                results
                  .then( data => {
                    data.forEach( item => {
                      postedObject.snippetsArray.push( {
                        code  : item[ 0 ].code, language: item[ 0 ].language,
                        postId: postedObject.postId
                      } );
                    } );
                  } )
                  .then( () => {
                    delete postedObject.snippets;
                    resolve();
                  } );
              } else {
                delete postedObject.snippets;
                resolve();
              }
            } )
              .then( () => {
                return new Promise( resolve => {
                  if ( postedObject.photos.length > 0 ) {
                    let actions = postedObject.photos.map( selectPhotos );
                    let results = Promise.all( actions );
                    postedObject.photosArray = [];
                    results
                      .then( data => {
                        data.forEach( item => postedObject.photosArray.push( {
                          path: item[ 0 ].path, postId: postedObject.postId
                        } ) );
                      } )
                      .then( () => {
                        delete postedObject.photos;
                        resolve();
                      } );
                  } else {
                    delete postedObject.photos;
                    resolve();
                  }
                } );
              } )
              .then( () => {
                return new Promise( resolve => {
                  if ( postedObject.snippetsArray !== undefined ) {
                    // let sql = ;
                    let actions = postedObject.snippetsArray.map( insertSnippetToAttachments );
                    let results = Promise.all( actions );
                    results
                      .then( () => {
                        resolve();
                      } );
                  } else {
                    resolve();
                  }
                } )
                  .then( () => {
                    return new Promise( resolve => {
                      if ( postedObject.photosArray !== undefined ) {
                        let actions = postedObject.photosArray.map( insertPhotosToAttachments );
                        let results = Promise.all( actions );
                        results
                          .then( () => resolve() );
                      } else {
                        resolve();
                      }
                    } );
                  } )
                  .then( () => {
                    console.log( postedObject );
                    dbConnection
                      .query( 'INSERT INTO post (type, author_id, place_name, post_text, publishing_place, likes, comments, banned) values ("user", ?, ?, ?, ?, ?, ?, ?)', [
                        postedObject.userId, postedObject.id, postedObject.text,
                        postedObject.userId, 0, 0, 0, 0
                      ], ( result, error ) => {
                        console.log( error );
                      } )
                      .then( () => {
                        res.send( JSON.stringify( postedObject ) );
                      } );
                  } );
              } );
          } );
      } );
  } );
} );

post.post( '/g/newPost', urlencodedParser, ( req, res, next ) => {
  sess = req.session;
  console.log( 'Im ready to work with post' );
  let postedObject = {
    id      : sess.userName,
    text    : req.body[ 'new-group-post' ],
    snippets: JSON.parse( req.body.snippetsUploaded ),
    photos  : JSON.parse( req.body.photosUploaded ),
    group   : { groupName: req.body.groupId },
    type    : 'g'
  };
  if ( !postedObject.text ) {
    if ( postedObject.snippets.length === 0 ) {
      if ( postedObject.photos.length === 0 ) {
        return;
      }
    }
  }
  postedObject.text = modifyText( postedObject.text, req.headers.origin );
  console.log( postedObject );
  return new Promise( resolve => {
    getUserId( postedObject.id )
      .then( result => {
        postedObject.userId = result;
        resolve( result );
      } )
      .then( () => {
        getMaxPostId()
          .then( result => {
            postedObject.postId = result + 1;
            console.log( postedObject );
            return new Promise( resolve => {
              if ( postedObject.snippets.length > 0 ) {
                let actions = postedObject.snippets.map( selectSnippets );
                let results = Promise.all( actions );
                postedObject.snippetsArray = [];
                results
                  .then( data => {
                    data.forEach( item => {
                      postedObject.snippetsArray.push( {
                        code  : item[ 0 ].code, language: item[ 0 ].language,
                        postId: postedObject.postId
                      } );
                    } );
                  } )
                  .then( () => {
                    delete postedObject.snippets;
                    resolve();
                  } );
              } else {
                delete postedObject.snippets;
                resolve();
              }
            } )
              .then( () => {
                return new Promise( resolve => {
                  if ( postedObject.photos.length > 0 ) {
                    let actions = postedObject.photos.map( selectPhotos );
                    let results = Promise.all( actions );
                    postedObject.photosArray = [];
                    results
                      .then( data => {
                        data.forEach( item => postedObject.photosArray.push( {
                          path: item[ 0 ].path, postId: postedObject.postId
                        } ) );
                      } )
                      .then( () => {
                        delete postedObject.photos;
                        resolve();
                      } );
                  } else {
                    delete postedObject.photos;
                    resolve();
                  }
                } );
              } )
              .then( () => {
                return new Promise( resolve => {
                  if ( postedObject.snippetsArray !== undefined ) {
                    let actions = postedObject.snippetsArray.map( insertSnippetToAttachments );
                    let results = Promise.all( actions );
                    results
                      .then( () => {
                        resolve();
                      } );
                  } else {
                    resolve();
                  }
                } )
                  .then( () => {
                    return new Promise( resolve => {
                      if ( postedObject.photosArray !== undefined ) {
                        let actions = postedObject.photosArray.map( insertPhotosToAttachments );
                        let results = Promise.all( actions );
                        results
                          .then( () => resolve() );
                      } else {
                        resolve();
                      }
                    } );
                  } )
                  .then( () => {
                    dbConnection
                      .query( 'SELECT * FROM `group` WHERE group_name = ?', [ postedObject.group.groupName ] )
                      .then( groupResult => {
                        console.log( groupResult );
                        postedObject.group.groupId = groupResult[ 0 ].id;
                      } )
                      .then( () => {
                        console.log( postedObject );
                        dbConnection
                          .query( 'INSERT INTO post (type, author_id, place_name, post_text, publishing_place, likes, comments, banned) values ("group", ?, ?, ?, ?, ?, ?, ?)', [
                            postedObject.userId, postedObject.group.groupName,
                            postedObject.text,
                            postedObject.group.groupId, 0, 0, 0, 0
                          ], ( result, error ) => {
                            console.log( error );
                          } )
                          .then( () => {
                            res.send( JSON.stringify( postedObject ) );
                          } );
                      } );
                  } );
              } );
          } );
      } );
  } );
} );

post.post( '/delete', urlencodedParser, ( req, res, next ) => {
  sess = req.session;
  if ( sess.userName !== undefined ) {
    let postToDelete  = +req.body.id,
        userPrivilege = false,
        userId;
    console.log( postToDelete );
    return new Promise( resolve => {
      dbConnection
        .query( 'SELECT id, position FROM users WHERE user_name = ? or email = ? and banned = 0', [
          sess.userName, sess.userName
        ] )
        .then( pos => {
          if ( isEmptyObject( pos ) ) {
            return res.send( JSON.stringify( {
              status: 'F', text: 'Sign in!'
            } ) );
          }
          userPrivilege = pos[ 0 ].position > 0;
          userId = pos[ 0 ].id;
          if ( userPrivilege ) {
            dbConnection
              .query( 'DELETE FROM post WHERE id = ?', [ postToDelete ] )
              .then( () => res.send( JSON.stringify( {
                status: 'S', text: 'Post deleted successful'
              } ) ) );
          }
          resolve();
        } );
    } )
      .then( () => {
        return new Promise( resolve => {
          dbConnection
            .query( 'SELECT publishing_place, type FROM post WHERE id = ?', [ postToDelete ] )
            .then( place => {
              if ( isEmptyObject( place ) ) {
                return res.send( JSON.stringify( {
                  status: 'F',
                  text  : 'What? We can not find place of publishing!'
                } ) );
              }
              if ( place[ 0 ].type === 'user' ) {
                if ( place[ 0 ].publishing_place === userId ) {
                  dbConnection
                    .query( 'DELETE FROM post WHERE id = ?', [ postToDelete ] )
                    .then( () => res.send( JSON.stringify( {
                      status: 'S', text: 'Post deleted successful'
                    } ) ) );
                }
              } else if ( place[ 0 ].type === 'group' ) {
                dbConnection
                  .query( 'SELECT group_owner FROM `group` WHERE id = ?', [ place[ 0 ].publishing_place ] )
                  .then( owner => {
                    if ( owner[ 0 ].group_owner === userId ) {
                      dbConnection
                        .query( 'DELETE FROM post WHERE id = ?', [ postToDelete ] )
                        .then( () => res.send( JSON.stringify( {
                          status: 'S', text: 'Post deleted successful'
                        } ) ) );
                    } else {
                      return res.send( JSON.stringify( {
                        status: 'F', text: 'It\'s not your post 🤔'
                      } ) );
                    }
                  } );
              }
            } );
        } );
      } );
  }
} );

function getUserId ( username ) {
  return new Promise( ( resolve, reject ) => {
    let sql = 'SELECT id FROM users where user_name = ? or email = ?';
    dbConnection
      .query( sql, [ username, username ] )
      .then( result => {
        if ( !isEmptyObject( result ) ) {
          resolve( result[ 0 ].id );
        }
      } );
  } );
};

post.post( '/upload/snippet', urlencodedParser, ( req, res, next ) => {
  console.log( 'Snippet uploading' );
  let sess = req.session;
  console.log( req.body );
  let code       = req.body.code,
      language   = req.body.language,
      unificator = md5( code + language + ( new Date ).getTime() );
  return new Promise( ( resolve, reject ) => {
    if ( code !== undefined ) {
      if ( code.length === 0 ) {
        reject( { status: 'Failed', text: 'You do not entered code!' } );
      }
      return new Promise( ( resolve, reject ) => {
        let query = 'INSERT INTO uploaded_snippets (code, language, unificator) VALUES (?, ?, ?)';
        if ( language === undefined || language === '' ) {
          language = 'markup';
        }
        dbConnection
          .query( query, [ code, language, unificator ] )
          .then( () => {
            let sql = 'SELECT id FROM uploaded_snippets WHERE unificator = ?';
            dbConnection
              .query( sql, [ unificator ] )
              .then( result => {
                console.log( result[ 0 ].id );
                reject( { status: 'Successful', text: result[ 0 ].id } );
              } );
          } );
      } )
        .catch( error => reject( error ) );
      // let sql = 'INSERT INTO';
    } else {
      reject( { status: 'Failed', text: 'We lost your code!' } );
    }
  } )
    .catch( error => res.send( JSON.stringify( error ) ) );
} );

post.post( '/upload/images', upload.single( 'imgUploading' ), ( req, res, next ) => {
  console.log( 'Images uploading' );
  if ( req.files !== null ) {
    let file     = req.files.uploadedImage,
        fileName = file.name,
        path     = `public/posts/${ fileName }`;
    return new Promise( ( resolve, reject ) => {
      file.mv( path, ( error ) => {
        if ( error ) {
          reject( error );
        } else {
          resolve( file );
        }
      } );
    } )
      .then( file => {
        let newFileName = `public/posts/${ md5( file.md5 + ( new Date ).getTime() ) }.${ file.name.split( '.' )
          .pop() }`;
        return new Promise( ( resolve, reject ) => {
          fs.rename( `public/posts/${ file.name }`, newFileName, error => {
            if ( error ) {
              reject( error );
            } else {
              resolve( newFileName );
            }
          } );
        } )
          .then( result => Promise.resolve( result ) );
      } )
      .then( fileName => {
        console.log( `Filename: ${ fileName }` );
        return new Promise( ( resolve, reject ) => {
          let sql = 'INSERT INTO uploaded_image (path) VALUES (?)';
          dbConnection
            .query( sql, [ fileName ], ( result, error ) => {
              console.log( result );
              console.log( error );
            } )
            .then( () => resolve( fileName ) );
        } )
          .then( result => Promise.resolve( result ) );
      } )
      .then( filename => {
        console.log( 'For select: ' + filename );
        let sql = 'SELECT id FROM uploaded_image WHERE path = ?';
        return new Promise( ( resolve, reject ) => {
          dbConnection
            .query( sql, [ filename ] )
            .then( result => {
              console.log( result );
              reject( {
                status: 'Successful', text: result[ 0 ].id
              } );
            } );
        } );
      } )
      .catch( error => res.send( JSON.stringify( error ) ) );
  }
} );

const selectUserInfo = item => {
  return new Promise( ( resolve, reject ) => {
    let userSql = 'SELECT user_name, avatar, user_title FROM users WHERE id = ?';
    dbConnection
      .query( userSql, [ item.comment_by ] )
      .then( result => resolve( result[ 0 ] ) );
  } );
};

post.post( '/comment', urlencodedParser, ( req, res, next ) => {
  sess = req.session;
  let currentUser   = {
        username: sess.userName
      },
      commentObject = {
        text: modifyText( req.body.comment ),
        post: JSON.parse( req.body.postInfo )
      };
  return new Promise( ( resolve, reject ) => {
    console.log( currentUser.username );
    if ( currentUser.username === null ) {
      reject( { status: 'Failed', text: 'You are not signed in!' } );
    }
    console.log( commentObject, currentUser );
    if ( !!commentObject.text ) {
      if ( commentObject.text.length < 321 ) {
        dbConnection
          .query( 'SELECT * FROM users WHERE user_name = ? or email = ?', [
            currentUser.username, currentUser.username
          ] )
          .then( user => {
            console.log( user );
            [
              currentUser.avatar,
              currentUser.title,
              currentUser.id
            ] = [
              user[ 0 ].avatar,
              user[ 0 ].user_title,
              user[ 0 ].id
            ];
            console.log( currentUser );
            resolve();
          } );
      } else {
        reject( { status: 'Failed', text: 'Your comment is too long!' } );
      }
    } else {
      reject( { status: 'Failed', text: 'Comment can not be empty!' } );
    }
  } )
    .then( () => {
      return new Promise( ( resolve, reject ) => {
        let newCommentSql = 'INSERT INTO comment (comment, place_id, post_id, comment_by) VALUES (?, ?, ?, ?)';
        dbConnection
          .query( newCommentSql, [
            commentObject.text, commentObject.post.place,
            commentObject.post.postId, currentUser.id
          ] )
          .then( () => {
            resolve();
          } );
      } );
    } )
    .then( () => {
      let updateCommentsSql = 'UPDATE post SET comments = comments + 1 where id = ?';
      dbConnection
        .query( updateCommentsSql, [ commentObject.post.postId ] )
        .then( () => {
          // reject(  );
          return res.send( JSON.stringify( {
            status: 'Successful', text: JSON.stringify( commentObject )
          } ) );
        } );
    } )
    .catch( error => res.send( JSON.stringify( error ) ) );
} );

post.get( '/:from/:postId', ( req, res, next ) => {
  sess = req.session;
  console.log( sess.userName );
  if ( sess.userName !== undefined ) {
    let postSql       = 'SELECT * FROM post WHERE id = ? and publishing_place = ?',
        postObject    = { id: req.params.postId, postBy: req.params.from },
        currentUser   = { username: sess.userName },
        commentsArray = [];
    console.log( postObject );
    dbConnection
      .query( postSql, [ postObject.id, postObject.postBy ] )
      .then( post => {
        return new Promise( ( resolve, reject ) => {
          if ( isEmptyObject( post ) ) {
            reject();
          } else if ( !!post[ 0 ].banned.readUIntBE( 0, 1 ) ) {
            reject();
          }
          [
            postObject.type, postObject.likes,
            postObject.text,
            postObject.comments, postObject.date, postObject.authorId,
            postObject.banned
          ] = [
            post[ 0 ].type, post[ 0 ].likes,
            post[ 0 ].post_text, post[ 0 ].comments, post[ 0 ].posted_date,
            post[ 0 ].author_id, post[ 0 ].banned
          ];
          let date = new Date( postObject.date );
          postObject.date = `${ ( '0' + date.getHours() ).slice( -2 ) }:${ ( '0' + date.getMinutes() ).slice( -2 ) } ${ ( '0' + date.getDate() ).slice( -2 ) }.${ ( '0' + ( +date.getMonth() + 1 ) ).slice( -2 ) }.${ date.getFullYear() }`;
          resolve();
        } );
      } )
      .then( () => {
        return new Promise( resolve => {
          let publisherInfo;
          postObject.postInfo = {};
          if ( postObject.type === 'group' ) {
            publisherInfo = 'SELECT group_name, group_title, group_avatar FROM `group` WHERE id = ? and banned = 0';
            postObject.headingType = 'g';
            dbConnection
              .query( publisherInfo, [ postObject.postBy ] )
              .then( pubPlace => {
                if ( isEmptyObject( pubPlace ) ) {
                  return throw404( res );
                }
                [
                  postObject.postInfo.name, postObject.postInfo.title,
                  postObject.postInfo.avatar
                ] = [
                  pubPlace[ 0 ].group_name, pubPlace[ 0 ].group_title,
                  pubPlace[ 0 ].group_avatar
                ];
                console.log( '1' );
                resolve();
              } );
          } else if ( postObject.type === 'user' ) {
            publisherInfo = 'SELECT user_name, user_title, avatar FROM users WHERE id = ? and banned = 0';
            postObject.headingType = 'p';
            dbConnection
              .query( publisherInfo, [ postObject.postBy ] )
              .then( pubPlace => {
                if ( isEmptyObject( pubPlace ) ) {
                  return throw404( res );
                }
                [
                  postObject.postInfo.name, postObject.postInfo.title,
                  postObject.postInfo.avatar
                ] = [
                  pubPlace[ 0 ].user_name, pubPlace[ 0 ].user_title,
                  pubPlace[ 0 ].avatar
                ];
                console.log( '1' );
                resolve();
              } );
          }
        } );
      } )
      .then( () => {
        return new Promise( resolve => {
          let commentsSql = 'SELECT * FROM comment WHERE post_id = ? ORDER BY date DESC';
          dbConnection
            .query( commentsSql, [ postObject.id ] )
            .then( comments => {
              console.log( comments );
              let actions = comments.map( selectUserInfo );
              let results = Promise.all( actions );
              results
                .then( data => {
                  comments.forEach( ( element, index ) => {
                    let date = new Date( element.date );
                    element.date = `${ ( '0' + date.getHours() ).slice( -2 ) }:${ ( '0' + date.getMinutes() ).slice( -2 ) } ${ ( '0' + date.getDate() ).slice( -2 ) }.${ ( '0' + ( +date.getMonth() + 1 ) ).slice( -2 ) }.${ date.getFullYear() }`;
                    commentsArray.push( {
                      user: data[ index ], content: element
                    } );
                  } );
                  resolve();
                } );
            } );
        } );
      } )
      .then( () => {
        let attachmentsSql = 'SELECT * FROM post_attachment WHERE post_id = ?';
        return new Promise( resolve => {
          dbConnection
            .query( attachmentsSql, [ postObject.id ] )
            .then( attachments => {
              postObject.photos = [];
              postObject.snippets = [];
              attachments.forEach( attach => {
                if ( attach.type === 'code' ) {
                  postObject.snippets.push( {
                    code: attach.content, language: attach.language
                  } );
                } else if ( attach.type === 'image' ) {
                  postObject.photos.push( attach.content );
                }
              } );
              resolve();
            } );
        } );
      } )
      .then( () => {
        return new Promise( resolve => {
          let authorSql = 'SELECT id, user_name, user_title FROM users WHERE id = ?';
          dbConnection
            .query( authorSql, [ postObject.authorId ] )
            .then( author => {
              postObject.author = {};
              [
                postObject.author.username,
                postObject.author.title,
                postObject.author.id
              ] = [
                author[ 0 ].user_name,
                author[ 0 ].user_title,
                author[ 0 ].id
              ];
              resolve();
            } );
        } );
      } )
      .then( () => {
        return new Promise( resolve => {
          let userSql = 'SELECT id, user_name, position, user_title, avatar FROM users WHERE user_name = ? or email = ?';
          dbConnection
            .query( userSql, [ currentUser.username, currentUser.username ] )
            .then( user => {
              [
                currentUser.realUsername, currentUser.id, currentUser.position,
                currentUser.title,
                currentUser.avatar
              ] = [
                user[ 0 ].user_name, user[ 0 ].id, user[ 0 ].position,
                user[ 0 ].user_title,
                user[ 0 ].avatar
              ];
              resolve();
            } );
        } );
      } )
      .then( () => {
        console.log( 'Here' );
        let availableToDelete = postObject.author.id === currentUser.id ? true : currentUser.position > 0;
        console.log( availableToDelete );
        console.log( postObject.author.id );
        console.log( currentUser.id );
        console.log( currentUser.position );
        return res.render( 'post', {
          user     : currentUser,
          post     : postObject,
          available: availableToDelete,
          comments : commentsArray,
          privilege: currentUser.position > 0,
          username : currentUser.username
        } );
      } )
      .catch( () => throw404( res ) );
  } else {
    throw404( res );
  }
} );

module.exports = post;