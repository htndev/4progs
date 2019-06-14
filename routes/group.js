const express = require( 'express' );
const group = express();
// const upload = require( 'express-fileupload' );
const multer = require( 'multer' );
const upload = multer( { dest: `public/images/` } );
const dbp = require( '../database' );
const dbConnection = new dbp();
const md5 = require( 'md5' );
const bodyParser = require( 'body-parser' );
const expressSession = require( 'express-session' );
const urlencodedParser = bodyParser.urlencoded( { extended: false } );
let sess;

function isEmptyObject ( obj ) {
  return !Object.keys( obj ).length;
}

const throw404 = res => res.status( 404 ).render( '404', { title: 'Ooops!' } );

const selectGroupInfo = group => {
  let sql = 'SELECT * FROM `group` WHERE id = ?';
  return new Promise( ( resolve, reject ) => {
    dbConnection
      .query( sql, [ group[ 'group_id' ] ] )
      .then( result => {
        resolve( result[ 0 ] );
      } )
      .catch( error => reject( error ) );
  } );
};

const classifyAttachments = item => {
  return new Promise( resolve => {
    if ( item.type === 'code' ) {
      resolve( { code: item[ 'content' ], language: item[ 'language' ] } );
    } else if ( item.type === 'image' ) {
      resolve( item[ 'content' ] );
    }
  } );
};

const selectAttachment = item => {
  return new Promise( resolve => {
    let attachments = 'select * from post_attachment where post_id = ?';
    dbConnection
      .query( attachments, [ item[ 'id' ] ] )
      .then( result => {
        let obj = { snippets: [], images: [] };
        let actions = result.map( classifyAttachments );
        let results = Promise.all( actions );
        results
          .then( data => {
            data.forEach( part => {
              if ( typeof part === 'object' ) {
                obj.snippets.push( part );
              } else if ( typeof part === 'string' ) {
                obj.images.push( part );
              }
            } );
            resolve( obj );
          } );
      } )
      .catch( error => console.log( error ) );
  } );
};

const selectUsers = id => {
  return new Promise( ( resolve, reject ) => {
    dbConnection
      .query( 'SELECT user_name, user_title, avatar FROM users WHERE id = ?', id.id_user )
      .then( result => {
        resolve( result[ 0 ] );
      } );
  } );
};

const getRequestsAmount = id => {
  return new Promise( ( resolve, reject ) => {
    let sqlCount = 'SELECT COUNT(*) FROM requests WHERE to_user = ?';
    dbConnection
      .query( sqlCount, [ id ] )
      .then( result => resolve( result[ 0 ][ 'COUNT(*)' ] ) );
  } );
};

group.get( '/', function ( req, res, next ) {
  sess = req.session;
  let selectUser  = 'SELECT * FROM users WHERE user_name = ? or email = ?',
      isPrivilege = false,
      id,
      numberOfRequests,
      isRequest   = false;
  console.log( sess );
  if ( sess.userName !== undefined ) {
    let sqlBanchecking = 'SELECT id from users WHERE user_name = ? or email and banned = b\'0\'';
    dbConnection
      .query( sqlBanchecking, [ sess.userName, sess.userName ] )
      .then( isBanned => {
        if ( isEmptyObject( isBanned ) ) {
          res.redirect( '/logout' );
        } else {
          id = isBanned[ 0 ][ 'id' ];
          getRequestsAmount( id )
            .then( count => {
              if ( count > 0 ) {
                isRequest = true;
              }
              numberOfRequests = count;
            } )
            .then( () => {
              dbConnection
                .query( selectUser,
                  [ sess.userName, sess.userName ] )
                .then( user => {
                  if ( user[ 0 ].position > 0 ) {
                    isPrivilege = true;
                  }
                  let groupSelecting = 'SELECT * FROM group_memebership WHERE id_user = ?  ORDER BY group_id';
                  dbConnection
                    .query( groupSelecting, [ user[ 0 ][ 'id' ] ] )
                    .then( result => {
                      console.log( result );
                      if ( isEmptyObject( result ) ) {
                        return res.render( 'groups', {
                          title              : 'Groups',
                          usr                : user,
                          privilege          : isPrivilege,
                          groupExists        : false,
                          isRequest          : isRequest,
                          friendsNotification: numberOfRequests
                        } );
                      } else {
                        let actions = result.map( selectGroupInfo ),
                            results = Promise.all( actions );
                        results
                          .then( data => {
                            // console.log( data );
                            let filteredGroups = [];
                            data.forEach( gr => {
                              gr.verified = gr.verified > 0;
                              console.log( gr );
                              let banned = gr.banned.readUIntBE( 0, 1 );
                              if ( !banned ) {
                                filteredGroups.push( gr );
                              }
                            } );
                            let groupLen = data.length > 0;
                            return res.render( 'groups', {
                              title              : 'Groups',
                              usr                : user,
                              privilege          : isPrivilege,
                              group              : filteredGroups,
                              groupExists        : groupLen,
                              isRequest          : isRequest,
                              friendsNotification: numberOfRequests
                            } );
                          } );
                      }
                    } );
                } );
            } );
        }
      } );
  } else {
    return res.redirect( '/' );
  }
} );

group.get( '/create', function ( req, res, next ) {
  sess = req.session;
  let sqlGetUser = 'SELECT id FROM users WHERE user_name = ?',
      userID,
      isRequest  = false,
      numberOfRequests;

  let sql = 'SELECT * FROM users WHERE user_name = ? or email = ?';
  dbConnection
    .query( sql, [ sess.userName, sess.userName ] )
    .then( usr => {
      dbConnection
        .query( sqlGetUser, [ sess.userName ] )
        .then( result => {
          userID = result[ 0 ][ 'id' ];
          getRequestsAmount( userID )
            .then( count => {
              if ( count > 0 ) {
                isRequest = true;
                numberOfRequests = count;
              }
              console.log( numberOfRequests );
              console.log( isRequest );
              res.render( 'create_group', {
                title              : 'Group creation',
                condition          : false,
                usr                : usr,
                isRequest          : isRequest,
                friendsNotification: numberOfRequests
              } );
            } );
        } );
    } );
} );

group.get( '/leave/:id', urlencodedParser, function ( req, res, next ) {
  sess = req.session;
  let groupId = req.params.id.toLowerCase(),
      sqlUser = 'SELECT id FROM users WHERE user_name = ? or email = ?',
      userAmount,
      sql     = 'delete from group_memebership WHERE group_id = ? and id_user = ?',
      groupRealId;
  return new Promise( ( resolve, reject ) => {
    dbConnection
      .query( 'SELECT id FROM `group` WHERE group_name = ?', [ groupId ] )
      .then( id => {
        groupRealId = id[ 0 ].id;
        resolve();
      } );
  } )
    .then( () => {
      dbConnection
        .query( sqlUser, [ sess.userName, sess.userName ] )
        .then( result => {
          dbConnection
            .query( sql, [ groupRealId, result[ 0 ][ 'id' ] ] )
            .then( result => {
              if ( !isEmptyObject( result ) ) {
                let sglGet = 'SELECT user_amount from `group` WHERE id = ?';
                dbConnection
                  .query( sglGet, [ groupRealId ] )
                  .then( result => {
                    userAmount = result[ 0 ][ 'user_amount' ];
                    let sqlUpdate = 'UPDATE `group` SET user_amount = ? WHERE id = ?';
                    dbConnection
                      .query( sqlUpdate, [
                        userAmount - 1, groupRealId
                      ] )
                      .then( () => {
                        res.redirect( '/g' );
                      } );
                  } );
              }
            } );
        } );
    } );
} );

group.get( '/:id', function ( req, res, next ) {
  sess = req.session;
  let sqlGroup    = 'SELECT * FROM `group` WHERE group_name = ? and banned = 0',
      sqlUser     = 'SELECT * FROM users WHERE user_name = ? or email = ?',
      sessionUser = {
        username: sess.userName
      },
      groupObject = { name: req.params.id };
  dbConnection
    .query( sqlUser, [ sess.userName, sess.userName ] )
    .then( result => {
      if ( isEmptyObject( result ) ) {
        throw404( res );
      }
      [
        sessionUser.id, sessionUser.title,
        sessionUser.avatar, sessionUser.position, sessionUser.realUsername
      ] = [
        result[ 0 ].id, result[ 0 ].user_title,
        result[ 0 ].avatar, result[ 0 ].position, result[ 0 ].user_name
      ];
    } )
    .then( () => {
      return new Promise( ( resolve, reject ) => {
        dbConnection
          .query( sqlGroup, [ groupObject.name ] )
          .then( group => {
            if ( isEmptyObject( group ) ) {
              reject();
            } else {
              [
                groupObject.groupId, groupObject.name, groupObject.title,
                groupObject.description, groupObject.userAmount,
                groupObject.avatar,
                groupObject.ownerId, groupObject.verified
              ] = [
                group[ 0 ].id, group[ 0 ].group_name, group[ 0 ].group_title,
                group[ 0 ].group_description, group[ 0 ].user_amount,
                group[ 0 ].group_avatar, group[ 0 ].group_owner,
                group[ 0 ].verified
              ];
              groupObject.verified = groupObject.verified > 0;
              sessionUser.availableToPost = groupObject.ownerId === sessionUser.id;
              console.log( groupObject );
              console.log( sessionUser );
              sessionUser.isPrivilege = sessionUser.position > 0;
              sessionUser.availableToDelete = sessionUser.availableToPost ? true : sessionUser.isPrivilege;
              resolve();
            }
          } );
      } );
    } )
    .then( () => {
      dbConnection
        .query( 'SELECT user_name, user_title FROM users where id = ?', [ groupObject.ownerId ] )
        .then( result => {
          groupObject.ownerInfo = {};
          [ groupObject.ownerInfo.username, groupObject.ownerInfo.title ] = [
            result[ 0 ].user_name, result[ 0 ].user_title
          ];
          delete groupObject.ownerId;
          return Promise.resolve();
        } );
    } )
    .then( () => {
      return new Promise( ( resolve, reject ) => {
        let postSql = 'SELECT * FROM post WHERE type = \'group\' and publishing_place = ? order by posted_date DESC';
        dbConnection
          .query( postSql, [ groupObject.groupId ] )
          .then( posts => {
            groupObject.posts = [];
            let actions = posts.map( selectAttachment );
            let results = Promise.all( actions );
            results
              .then( data => {
                for ( let i = 0; i < posts.length; i++ ) {
                  let banned = posts[ i ].banned.readUIntBE( 0, 1 );
                  // console.log( posts[ i ].posted_date );
                  let date = new Date( posts[ i ].posted_date );
                  posts[ i ].posted_date = `${ ( '0' + date.getHours() ).slice( -2 ) }:${ ( '0' + date.getMinutes() ).slice( -2 ) } ${ ( '0' + date.getDate() ).slice( -2 ) }.${ ( '0' + ( +date.getMonth() + 1 ) ).slice( -2 ) }.${ date.getFullYear() }`;
                  if ( !banned ) {
                    groupObject.posts.push( {
                      postData: posts[ i ], attachments: data[ i ], i: i
                    } );
                  }
                }
                resolve();
              } );
          } );
      } );
    } )
    .then( () => {
      let sqlGetUser = 'SELECT id FROM users WHERE user_name = ?',
          userID,
          isRequest  = false,
          numberOfRequests;

      dbConnection
        .query( sqlGetUser, [ sess.userName ] )
        .then( result => {
          userID = result[ 0 ][ 'id' ];
          getRequestsAmount( userID )
            .then( count => {
              if ( count > 0 ) {
                numberOfRequests = count;
                isRequest = true;
              }

              console.log( groupObject.posts.length );
              console.log( sessionUser );
              groupObject.postsExists = groupObject.posts.length > 0;
              console.log( groupObject.posts );
              return res.render( 'group', {
                groupInfo          : groupObject,
                title              : groupObject.title,
                user               : sessionUser,
                isRequest          : isRequest,
                friendsNotification: numberOfRequests
              } );
            } );
        } );
    } )
    .catch( () => throw404( res ) );
} );

group.get( '/:id/members', ( req, res, next ) => {
  sess = req.session;
  if ( sess.userName !== undefined ) {
    let sqlGetUser = 'SELECT id FROM users WHERE user_name = ?',
        userID,
        isRequest  = false,
        numberOfRequests;
    let currentUser = { name: sess.userName },
        groupObject = { groupName: req.params.id };
    console.log( groupObject );
    return new Promise( ( resolve, reject ) => {
      dbConnection
        .query( 'SELECT id, group_title, group_owner FROM `group` WHERE group_name = ?', [ groupObject.groupName ] )
        .then( group => {
          if ( isEmptyObject( group ) ) {
            return throw404( res );
          }
          [
            groupObject.id,
            groupObject.title,
            groupObject.owner
          ] = [
            group[ 0 ].id,
            group[ 0 ].group_title,
            group[ 0 ].group_owner
          ];
          resolve();
        } );
    } )
      .then( () => {
        return new Promise( ( resolve, reject ) => {
          dbConnection
            .query( 'SELECT id, position, avatar, user_title, user_name FROM users WHERE user_name = ? or email = ?', [
              currentUser.name, currentUser.name
            ] )
            .then( user => {
              [
                currentUser.id,
                currentUser.username,
                currentUser.title,
                currentUser.position,
                currentUser.avatar,
                currentUser.privilege
              ] = [
                user[ 0 ].id,
                user[ 0 ].user_name,
                user[ 0 ].user_title,
                user[ 0 ].position,
                user[ 0 ].avatar,
                user[ 0 ].position > 0
              ];
              resolve();
            } );
        } );
      } )
      .then( () => {
        dbConnection
          .query( 'SELECT id_user, id FROM group_memebership WHERE group_id = ?', [ groupObject.id ] )
          .then( users => {
            console.log( users );
            let actions = users.map( selectUsers );
            let results = Promise.all( actions );
            results
              .then( data => {
                currentUser.allowedToRemove = groupObject.owner === currentUser.id ? true : currentUser.privilege;
                console.log( currentUser );
                console.log( groupObject );
                groupObject.membersAmount = data.length;
                console.log( data );
                data.forEach( ( item, index ) => {
                  item.id = users[ index ].id;
                } );

                dbConnection
                  .query( sqlGetUser, [ sess.userName ] )
                  .then( result => {
                    userID = result[ 0 ][ 'id' ];
                    getRequestsAmount( userID )
                      .then( count => {
                        if ( count > 0 ) {
                          numberOfRequests = count;
                          isRequest = true;
                        }
                        return res.render( 'group_members', {
                          title              : `${ groupObject.title } members`,
                          members            : data,
                          user               : currentUser, group: groupObject,
                          isRequest          : isRequest,
                          friendsNotification: numberOfRequests
                        } );
                      } );
                  } );
              } );
          } );
      } );
  } else {
    return throw404( res );
  }
} );

group.get( '/:id/edit', ( req, res, next ) => {
  sess = req.session;
  if ( sess.userName !== undefined ) {
    let currentUser = { name: sess.userName },
        groupObject = { name: req.params.id };
    console.log( groupObject );
    console.log( currentUser );
    return new Promise( ( resolve, reject ) => {
      dbConnection
        .query( 'SELECT id, user_name, user_title, position, avatar FROM users WHERE user_name = ? or email = ?', [
          currentUser.name, currentUser.name
        ] )
        .then( user => {
          if ( isEmptyObject( user ) ) {
            reject();
          }
          [
            currentUser.id,
            currentUser.username,
            currentUser.title,
            currentUser.position,
            currentUser.avatar
          ] = [
            user[ 0 ].id,
            user[ 0 ].user_name,
            user[ 0 ].user_title,
            user[ 0 ].position,
            user[ 0 ].avatar
          ];
          currentUser.privilege = currentUser.position > 0;
          resolve();
        } );
    } )
      .then( () => {
        return new Promise( ( resolve, reject ) => {
          dbConnection
            .query( 'SELECT * FROM `group` WHERE group_name = ?', [ groupObject.name ] )
            .then( groupResult => {
              if ( isEmptyObject( groupResult ) ) {
                return throw404( res );
              } else if ( currentUser.id !== groupResult[ 0 ].group_owner && currentUser.position === 0 ) {
                return throw404( res );
              }
              [
                groupObject.groupName,
                groupObject.title,
                groupObject.desc
              ] = [
                groupResult[ 0 ].group_name,
                groupResult[ 0 ].group_title,
                groupResult[ 0 ].group_description
              ];
              console.log( groupObject );
              console.log( currentUser );
              let sqlGetUser = 'SELECT id FROM users WHERE user_name = ?',
                  userID,
                  isRequest  = false,
                  numberOfRequests;

              dbConnection
                .query( sqlGetUser, [ sess.userName ] )
                .then( result => {
                  userID = result[ 0 ][ 'id' ];
                  getRequestsAmount( userID )
                    .then( count => {
                      if ( count > 0 ) {
                        numberOfRequests = count;
                        isRequest = true;
                      }
                      return res.render( 'configurate_group', {
                        title              : `${ groupObject.title } settings`,
                        group              : groupObject,
                        user               : currentUser,
                        isRequest          : isRequest,
                        friendsNotification: numberOfRequests
                      } );
                    } );
                } );
            } );
        } );
      } )
      .catch( () => throw404( res ) );
  } else {
    return res.redirect( '/' );
  }
} );

group.post( '/update', urlencodedParser, ( req, res, next ) => {
  sess = req.session;
  console.log( req.body );
  console.log( req.files );
  if ( sess.userName !== undefined ) {
    let currentUser = { name: sess.userName },
        groupObject = { name: req.body.groupName };
    return new Promise( ( resolve, reject ) => {
      dbConnection
        .query( 'SELECT id, position FROM users WHERE user_name = ? or email = ?', [
          currentUser.name, currentUser.name
        ] )
        .then( user => {
          [
            currentUser.id,
            currentUser.position
          ] = [
            user[ 0 ].id,
            user[ 0 ].position
          ];
          resolve();
        } );
    } )
      .then( () => {
        return new Promise( ( resolve, reject ) => {
          dbConnection
            .query( 'SELECT group_owner FROM `group` WHERE group_name = ?', [ groupObject.name ] )
            .then( owner => {
              if ( owner[ 0 ].group_owner === currentUser.id || currentUser.position > 0 ) {
                resolve();
              }
            } );
        } );
      } )
      .then( () => {
        [
          groupObject.title,
          groupObject.newName,
          groupObject.desc,
          groupObject.groupName
        ] = [
          req.body.title,
          req.body.group_name,
          req.body.desc,
          req.body.groupName
        ];
        if ( !!groupObject.title && !!groupObject.newName ) {
          if ( groupObject.newName.match( /^[a-z\d\.\_]+$/g ) !== null ) {
            if ( req.files !== null ) {
              let file     = req.files.groupavatar,
                  ext      = req.files.groupavatar.mimetype
                    .split( '/' )
                    .pop(),
                  filePath = `public/groups/${ md5( file.md5 + ( new Date ).getTime() ) }.${ ext }`;
              file.mv( filePath );
              dbConnection
                .query( 'UPDATE `group` SET group_name = ?, group_title = ?, group_description = ?, group_avatar = ? WHERE group_name = ?', [
                  groupObject.newName, groupObject.title, groupObject.desc,
                  filePath, groupObject.groupName
                ] )
                .then( () => res.send( 'Setting updated!' ) );
            } else {
              dbConnection
                .query( 'UPDATE `group` SET group_name = ?, group_title = ?, group_description = ? WHERE group_name = ?', [
                  groupObject.newName, groupObject.title, groupObject.desc,
                  groupObject.groupName
                ] )
                .then( () => res.send( 'Setting updated!' ) );
            }
          } else {
            return res.send( 'For group id allowed only [a-z0-9._]!' );
          }
        } else {
          return res.send( 'Fill all data!' );
        }
      } );
  }
} );

group.post( '/new', urlencodedParser, function ( req, res, next ) {
  sess = req.session;
  let groupID = req.body.group_id;
  let filePath = null;
  console.log( groupID );
  if ( sess.userName !== undefined || sess.userName !== undefined ) {
    return new Promise( ( resolve, reject ) => {
      let pattern = /[a-zA-Z\d\.\_]+/g;
      if ( groupID.length > 2 ) {
        if ( groupID.match( pattern ).length === 1 ) {
          if ( req.files !== null ) {
            let file = req.files.group_avatar;
            let fileExt = file.mimetype.split( '/' ).pop();
            let filename = md5( file.name + ( new Date ).getTime() );
            console.log( file );
            console.log( fileExt );
            console.log( filename );
            filePath = `public/groups/${ filename }.${ fileExt }`;
            console.log( filePath );
            file.mv( filePath, function ( err ) {
              if ( err ) {
                reject( {
                  result: 'Failed', text: 'Problems with uploading file'
                } );
              }
            } );
          } else {
            filePath = 'public/groups/group_default.jpg';
          }
          console.log( filePath );
          let sqlCheck = 'SELECT id FROM `group` WHERE group_name = ?';
          dbConnection
            .query( sqlCheck, [ groupID.toLowerCase() ] )
            .then( group => {
              if ( isEmptyObject( group ) ) {
                let user_id = 'SELECT id FROM users WHERE user_name = ? or email = ? and banned = 0';
                let user;
                dbConnection
                  .query( user_id, [ sess.userName, sess.userName ] )
                  .then( userId => {
                    user = userId[ 0 ][ 'id' ];
                    let sqlCreateGroup = 'INSERT INTO `group` (group_name, group_title, group_description, user_amount, group_avatar, group_owner) VALUES (?, ?, ?, ?, ?, ?)';
                    dbConnection
                      .query( sqlCreateGroup, [
                        groupID.toLowerCase(), req.body.group_title,
                        req.body.group_description, 1, filePath, user
                      ] )
                      .then( result => {
                        if ( !isEmptyObject( result ) ) {
                          dbConnection
                            .query( 'SELECT id FROM `group` WHERE group_name = ?', groupID.toLowerCase() )
                            .then( gr => {
                              let userMembership = 'INSERT INTO group_memebership (group_id, id_user) VALUES (?, ?)';
                              dbConnection
                                .query( userMembership, [
                                  gr[ 0 ].id, user
                                ] )
                                .then( () => {
                                  reject( {
                                    result: 'Success',
                                    text  : 'Group successfully created!',
                                    gID   : groupID
                                  } );
                                } );
                            } );

                        } else {
                          reject( {
                            result: 'Failed', text: 'Operation failed!'
                          } );
                        }
                      } );
                  } );
              } else {
                reject( {
                  result: 'Failed', text: 'Group with this id is already exist!'
                } );
              }
            } );
        } else {
          reject( {
            result: 'Failed',
            text  : 'Group id contains illegal symbols! Use [a-zA-Z0-9._]!'
          } );
        }
      } else {
        reject( {
          result: 'Failed',
          text  : 'Group id should contains more than 3 characters!'
        } );
      }
    } )
      .catch( error => res.send( JSON.stringify( error ) ) );
  } else {
    res.redirect( '/' );
  }
} );

group.post( '/member/add', urlencodedParser, function ( req, res, next ) {
  sess = req.session;
  console.log( req.body );
  let user;
  let groupName = req.body.group.toLowerCase();
  let sqlCheck = 'SELECT id FROM users WHERE user_name = ? or email = ?';
  let groupRealId;
  return new Promise( ( resolve, reject ) => {
    dbConnection
      .query( sqlCheck, [ sess.userName, sess.userName ] )
      .then( result => {
        user = +result[ 0 ][ 'id' ];
        return new Promise( ( resolve, reject ) => {
          dbConnection
            .query( 'SELECT id FROM `group` WHERE group_name = ?', groupName )
            .then( groupId => {
              console.log( groupId );
              groupRealId = groupId[ 0 ].id;
              console.log( user, groupRealId );
              resolve();
            } );
        } )
          .then( () => {
            let sglMembership = 'SELECT group_id FROM group_memebership WHERE id_user = ? and group_id = ?';
            dbConnection
              .query( sglMembership, [ user, groupRealId ] )
              .then( result => {
                if ( !isEmptyObject( result ) ) {
                  res.send( JSON.stringify( {
                    result: 'Failed', text: 'You are already a group member'
                  } ) );
                } else {
                  let sqlInsert = 'INSERT INTO group_memebership (group_id, id_user) VALUES (?,?)';
                  dbConnection
                    .query( sqlInsert, [ groupRealId, user ] )
                    .then( result => {
                      if ( !isEmptyObject( result ) ) {
                        let sqlGet = 'SELECT user_amount FROM `group` WHERE id = ?';
                        dbConnection
                          .query( sqlGet, [ groupRealId ] )
                          .then( result => {
                            console.log( result[ 0 ][ 'user_amount' ] );
                            let userAmount = result[ 0 ][ 'user_amount' ];
                            let sqlUpdate = 'UPDATE `group` SET user_amount = ? WHERE id = ?';
                            dbConnection
                              .query( sqlUpdate, [
                                userAmount + 1, groupRealId
                              ] )
                              .then( result => {
                                if ( !isEmptyObject( result ) ) {
                                  reject( {
                                    result: 'Success',
                                    text  : 'You are now a member'
                                  } );
                                }
                              } );
                          } );
                      } else {
                        reject( {
                          result: 'Failed', text: 'OOPS, something wrong!'
                        } );
                      }
                    } );
                }
              } );
          } );
      } );
  } )
    .catch( error => res.send( JSON.stringify( error ) ) );
} );

group.post( '/member/remove', urlencodedParser, ( req, res, next ) => {
  sess = req.session;
  if ( sess.userName !== undefined ) {
    let currentUser = { name: sess.userName },
        groupObject = {
          groupName: req.body.groupName, memberShipId: req.body.membershipId
        };
    return new Promise( ( resolve, reject ) => {
      dbConnection
        .query( 'SELECT id, position FROM users WHERE user_name = ? or email = ?', [
          currentUser.name, currentUser.name
        ] )
        .then( user => {
          if ( isEmptyObject( user ) ) {
            return res.send( 'Current user not found' );
          }
          [
            currentUser.id,
            currentUser.position
          ] = [
            user[ 0 ].id,
            user[ 0 ].position
          ];
          currentUser.privileged = currentUser.position > 0;
          resolve();
        } );
    } )
      .then( () => {
        dbConnection
          .query( 'SELECT group_owner FROM `group` WHERE group_name = ?', [ groupObject.groupName ] )
          .then( groupResult => {
            if ( isEmptyObject( groupResult ) ) {
              return res.send( 'Group not fined' );
            }
            currentUser.allowed = groupResult[ 0 ].group_owner === currentUser.id ? true : currentUser.privileged;
            if ( currentUser.allowed ) {
              dbConnection
                .query( 'SELECT * FROM group_memebership WHERE id = ?', [ +groupObject.memberShipId ] )
                .then( membership => {
                  if ( isEmptyObject( membership ) ) {
                    return res.send( 'Membership not found' );
                  } else {
                    dbConnection
                      .query( 'DELETE FROM group_memebership WHERE id = ?', [ +groupObject.memberShipId ] )
                      .then( () => {
                        return res.send( 'User removed successful!' );
                      } );
                  }
                } );
            } else {
              return res.send( 'You are not allowed to remove users!' );
            }
          } );
      } );
  } else {
    return throw404( res );
  }
} );

module.exports = group;