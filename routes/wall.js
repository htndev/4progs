const express = require( 'express' );
const wall = express();
const dbp = require( '../database' );
const multer = require( 'multer' );
const upload = multer( { dest: `public/images/` } );
const dbConnection = new dbp();
const bodyParser = require( 'body-parser' );
const md5 = require( 'md5' );
const expressSession = require( 'express-session' );
const urlencodedParser = bodyParser.urlencoded( { extended: false } );
let sess;

const throw404 = res => res.status( 404 ).render( '404', { title: 'Ooops!' } );

function isEmptyObject ( obj ) {
  return !Object.keys( obj ).length;
}

function modifyText ( str ) {
  let pattern = /^\@[\d\w]+\b/g;
  str = str.replace( '<', '&#60;' ).replace( '>', '&#62;' );
  str = str.split( ' ' );
  str.forEach( ( item, index ) => {
    let nickname = pattern.exec( item );
    if ( nickname !== null ) {
      nickname = nickname[ 0 ].replace( '@', '' );
      let rest = item.replace( '@' + nickname, '' );
      str[ index ] = `<a href="/p/${ nickname }">@${ nickname }</a>${ rest }`;
    }
  } );
  return str.join( ' ' );
};

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
        text: modifyText( modifyText( req.body.comment ) ),
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
    let wallSql       = 'SELECT * FROM post WHERE id = ? and publishing_place = ?',
        postObject    = { id: req.params.postId, postBy: req.params.from },
        currentUser   = { username: sess.userName },
        commentsArray = [];
    console.log( postObject );
    dbConnection
      .query( wallSql, [ postObject.id, postObject.postBy ] )
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
            publisherInfo = 'SELECT group_name, group_title, group_avatar FROM `group` WHERE id = ?';
            postObject.headingType = 'g';
            dbConnection
              .query( publisherInfo, [ postObject.postBy ] )
              .then( pubPlace => {
                [
                  postObject.postInfo.name, postObject.postInfo.title,
                  postObject.postInfo.avatar
                ] = [
                  pubPlace[ 0 ].group_name, pubPlace[ 0 ].group_title,
                  pubPlace[ 0 ].group_avatar
                ];
                resolve();
              } );
          } else if ( postObject.type === 'user' ) {
            publisherInfo = 'SELECT user_name, user_title, avatar FROM users WHERE id = ?';
            postObject.headingType = 'p';
            dbConnection
              .query( publisherInfo, [ postObject.postBy ] )
              .then( pubPlace => {
                [
                  postObject.postInfo.name, postObject.postInfo.title,
                  postObject.postInfo.avatar
                ] = [
                  pubPlace[ 0 ].user_name, pubPlace[ 0 ].user_title,
                  pubPlace[ 0 ].avatar
                ];
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
        return res.render( 'wall', {
          user     : currentUser,
          post     : postObject,
          available: availableToDelete,
          comments : commentsArray,
          privilege: currentUser.position > 0
        } );
      } )
      .catch( () => throw404( res ) );
  } else {
    throw404( res );
  }
  // return res.render( 'wall', { title: 'Wall' } );
} );

module.exports = wall;