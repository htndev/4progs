const createError      = require('http-errors'),
      express          = require('express'),
      app              = express(),
      path             = require('path'),
      logger           = require('morgan'),
      hbs              = require('express-handlebars'),
      indexRouter      = require('./routes/index'),
      regRouter        = require('./routes/regestration'),
      settRouter       = require('./routes/settings'),
      groupRouter      = require('./routes/group'),
      snippetRouter    = require('./routes/snippet'),
      postRouter       = require('./routes/post'),
      dashBoardRouter  = require('./routes/dashboard'),
      searchRouter     = require('./routes/search'),
      expressValidator = require('express-validator'),
      // debug            = require( 'debug' )( 'MyCourseWork:server' ),
      http             = require('http'),
      port             = normalizePort(process.env.PORT || '8200'),
      server           = http.createServer(app),
      dbp              = require('./database'),
      dbConnection     = new dbp(),
      socket           = require('socket.io');

app.set('port', port);

const io = socket(server);

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

function modifyText(str) {
  let pattern = /^\@[\d\w]+\b/g;
  str         = str.replace('<', '&#60;').replace('>', '&#62;');
  console.log('String');
  console.log(str);
  str = str.split(' ');
  str.forEach((item, index) => {
    let nickname = pattern.exec(item);
    console.log(item);
    if (nickname !== null) {
      nickname = nickname[0].replace('@', '');
      console.log(nickname);
      let rest   = item.replace('@' + nickname, '');
      str[index] = `<a href="/p/${nickname}">@${nickname}</a>${rest}`;
    }
  });
  return str.join(' ');
};

let usersOnline = [];

io.on('connection', socket => {
  let exists = false;
  usersOnline.forEach((item, index) => {
    if (item.nickname === socket.handshake.query['nickname']) {
      item.socket = socket;
      exists      = true;
    }
  });
  if (!exists) {
    // console.log( '\x1b[36m', socket.handshake.query[ 'nickname' ] + '
    // joined' );
    usersOnline.push({
      nickname: socket.handshake.query['nickname'],
      socket  : socket
    });
  }
  socket.on('chat message', msg => {
    console.log('Message ' + msg);
    console.log(msg);
    return new Promise(resolve => {
      dbConnection
        .query('SELECT id, user_name, user_title, avatar FROM users WHERE user_name = ?', [msg.from])
        .then(user => {
          if (!isEmptyObject(user)) {
            resolve(user[0]);
          }
        });
    })
      .then(user => {
        dbConnection
          .query('INSERT INTO messages (sender_id, text) VALUES (?, ?)', [
            user.id, msg.text
          ])
          .then(() => {
            let date = new Date();
            io.emit('new message', {
              user: user,
              text: modifyText(msg.text),
              date: `${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)} ${('0' + date.getDate()).slice(-2)}.${('0' + (+date.getMonth() + 1)).slice(-2)}.${date.getFullYear()}`
            });
          });
      });
  });
  // console.log( 'Users online' );
  // usersOnline.forEach( item => console.log( item.nickname ) );
  socket.on('disconnect', () => {
    usersOnline.forEach((item, index) => {
      if (item.nickname === socket.handshake.query['nickname']) {
        usersOnline.splice(index, 1);
      }
    });
    console.log(socket.handshake.query['nickname'] + ' left');
    // console.log( 'Users online' );
    // usersOnline.forEach( item => console.log( '\x1b[31m', item.nickname ) );
  });
});

server.listen(port);

// view engine setup
app.engine('hbs', hbs({
  extname   : 'hbs', defaultLayout: 'layout',
  layoutsDir: __dirname + '/views/layouts/'
}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// app.use( logger( 'dev' ) );
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(expressValidator());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/p/public', express.static('public'));
app.use('/d/public', express.static('public'));
app.use('/public', express.static('public'));
app.use('/registration/public', express.static('public'));
app.use('/settings/public', express.static('public'));
app.use('/g/public', express.static('public'));
app.use('/g/:id/public', express.static('public'));
app.use('/post/:from/public', express.static('public'));
app.use('/s/public', express.static('public'));
app.use('/s/:id/public', express.static('public'));
app.use('/', indexRouter);
app.use('/registration', regRouter);

let sess;

const getRequestsAmount = id => {
  return new Promise((resolve, reject) => {
    let sqlCount = 'SELECT COUNT(*) FROM requests WHERE to_user = ?';
    dbConnection
      .query(sqlCount, [id])
      .then(result => resolve(result[0]['COUNT(*)']));

  });
};

const selectUserData = item => {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM users WHERE id = ?';
    dbConnection
      .query(sql, [item.user_friend])
      .then(result => resolve(result[0]));
  });
};

app.get('/friends', function (req, res, next) {
  sess          = req.session;
  let userAvatar;
  let userName;
  let user;
  let numberOfRequests;
  let isRequest = false;
  let user_title;
  if (sess.userName !== undefined && sess.userName !== null) {
    return new Promise((resolve, reject) => {
      let sqlGetUser  = 'SELECT id, user_name, avatar, user_title from users WHERE user_name = ? and banned = 0 or email = ? and banned = 0';
      let sqlFriends  = 'SELECT * FROM friend_list WHERE user_id = ?';
      let sqlRequests = 'SELECT * from requests WHERE to_user = ?';
      let sqlCount    = 'SELECT COUNT(*) FROM requests WHERE to_user = ?';
      dbConnection
        .query(sqlGetUser, [sess.userName, sess.userName])
        .then(userInfo => {
          user       = userInfo[0]['id'];
          userName   = userInfo[0]['user_name'];
          userAvatar = userInfo[0]['avatar'];
          user_title = userInfo[0]['user_title'];
          getRequestsAmount(user)
            .then(count => {
              if (count > 0) {
                numberOfRequests = count;
                isRequest        = true;
              }
            });
          dbConnection
            .query(sqlFriends, [user])
            .then(friendList => {
              // console.log( 'FR list' );
              // console.log( friendList );
              let actions = friendList.map(selectUserData);
              let results = Promise.all(actions);
              results
                .then(data => {
                  usersOnline.forEach(usr => console.log(usr.nickname));
                  data.forEach(item => {
                    usersOnline.forEach(onlineUser => {
                      // console.log( onlineUser.nickname, item.user_name,
                      // onlineUser.nickname === item.user_name ); item.online
                      // = onlineUser.nickname === item.user_name;
                      if (onlineUser.nickname === item.user_name) {
                        return item.online = onlineUser.nickname === item.user_name;
                      }
                    });
                  });
                  // console.log( data );
                  let friendsList = data;
                  dbConnection
                    .query(sqlRequests, [user])
                    .then(requestRes => {
                      let actions = requestRes.map(selectUserData);
                      let results = Promise.all(actions);
                      results
                        .then(requests => {
                          // console.log( 'Data' );
                          // console.log( requests );
                          // console.log( friendsList );
                          friendsList.forEach(item => console.log(item.user_name, item.online));
                          res.render('friends_alt', {
                            title              : userName + '\'s friends',
                            userAvatar         : userAvatar,
                            userName           : userName,
                            friends            : true,
                            friendsList        : friendsList,
                            requestList        : requests,
                            friendsNotification: numberOfRequests,
                            isRequest          : isRequest,
                            username           : userName,
                            userTitle          : user_title
                          });
                        });
                    });
                });
            })
            .catch(error => {
              console.log(error);
            });
        });
    });
  } else {
    res.redirect('/');
  }
});

app.get('/friends/:id/removeRequests', function (req, res, next) {
  sess     = req.session;
  let user = req.params.id.toLowerCase();
  let userID;
  if (sess.userName !== null || sess.userName !== undefined) {
    let takeAUserFriend = 'SELECT id from users WHERE user_name = ?';
    dbConnection
      .query(takeAUserFriend, [user])
      .then(id => {
        userID = id[0]['id'];
      });
    let sqlGetUser = 'SELECT id FROM users WHERE user_name = ? or email = ?';
    dbConnection
      .query(sqlGetUser, [sess.userName, sess.userName])
      .then(result => {
        let sqlDeleteRequest = 'DELETE FROM requests WHERE to_user = ? and user_friend = ?';
        dbConnection
          .query(sqlDeleteRequest, [result[0]['id'], userID]);
        res.redirect('/friends');
      });
  }
});

app.get('/friends/:id/add', function (req, res, next) {
  sess            = req.session;
  let userForeign = req.params.id.toLowerCase();
  let userID,
      foreignUserId;
  if (sess.userName !== null || sess.userName !== undefined) {
    let takeAUser          = 'SELECT id FROM users WHERE user_name = ? or email = ?';
    let takeForeignUser    = 'SELECT id FROM users WHERE user_name = ?';
    let deleteFromRequests = 'DELETE FROM requests WHERE user_friend = ? and to_user = ?';
    let insertFriend       = 'INSERT INTO friend_list (user_friend, user_id) VALUES (?,?)';
    dbConnection
      .query(takeAUser, [sess.userName, sess.userName])
      .then(user => {
        if (!isEmptyObject(user)) {
          userID = user[0]['id'];
        }
        dbConnection
          .query(takeForeignUser, [userForeign])
          .then(foreignUser => {
            if (!isEmptyObject(foreignUser)) {
              foreignUserId = foreignUser[0]['id'];
            }
            dbConnection
              .query(insertFriend, [foreignUserId, userID]);
            dbConnection
              .query(insertFriend, [userID, foreignUserId])
              .then(result => {
                if (!isEmptyObject(result)) {
                  dbConnection.query(deleteFromRequests, [
                    foreignUserId, userID
                  ]);
                }
                res.redirect('/friends');
              });
          });
      });
  }
});

app.get('/friends/:id/delete', function (req, res, next) {
  sess            = req.session;
  let userForeign = req.params.id.toLowerCase();
  let userID,
      foreignUserId;
  if (sess.userName !== null || sess.userName !== undefined) {
    let takeAUser         = 'SELECT id FROM users WHERE user_name = ? or email = ?';
    let takeForeignUser   = 'SELECT id FROM users WHERE user_name = ?';
    let deleteFromFriends = 'DELETE FROM friend_list WHERE user_friend = ? and user_id = ?';
    dbConnection
      .query(takeForeignUser, [userForeign])
      .then(foreignUser => {
        foreignUserId = foreignUser[0]['id'];
        dbConnection
          .query(takeAUser, [sess.userName, sess.userName])
          .then(result => {
            userID = result[0]['id'];
            dbConnection.query(deleteFromFriends, [foreignUserId, userID])
              .then(result => {
                dbConnection.query(deleteFromFriends, [
                  userID, foreignUserId
                ])
                  .then(result => {
                    if (!isEmptyObject(result)) {
                      res.redirect('/friends');
                    }
                  });
              });
          });
      });
  }
});

const throw404 = res => res.status(404).render('404', {title: 'Ooops!'});

app.get('/', function (req, res, next) {
  res.redirect('/feed');
});

const classifyAttachments = item => {
  console.log('Item');
  console.log(item);
  return new Promise(resolve => {
    if (item.type === 'code') {
      resolve({code: item['content'], language: item['language']});
    } else if (item.type === 'image') {
      resolve(item['content']);
    }
  });
};

const selectAttachment = item => {
  return new Promise(resolve => {
    let attachments = 'select * from post_attachment where post_id = ?';
    dbConnection
      .query(attachments, [item['id']])
      .then(result => {
        let obj     = {snippets: [], images: []};
        let actions = result.map(classifyAttachments);
        let results = Promise.all(actions);
        results
          .then(data => {
            console.log('Results from classifing');
            data.forEach(part => {
              if (typeof part === 'object') {
                obj.snippets.push(part);
              } else if (typeof part === 'string') {
                obj.images.push(part);
              }
            });
            console.log(obj);
            resolve(obj);
          });
      })
      .catch(error => console.log(error));
  });
};

const selectUserInfo = id => {
  return new Promise(resolve => {
    let sql = 'select user_name, user_title, avatar from users where id = ?';
    dbConnection
      .query(sql, [id])
      .then(result => {
        console.log(result);
        resolve({
          avatar   : result[0]['avatar'],
          username : result[0]['user_name'],
          userTitle: result[0]['user_title']
        });
      });
  });
};

app.get('/p/:id', function (req, res, next) {
  sess              = req.session;
  let userId        = req.params.id.toLowerCase(),
      postsToUpload = [],
      postAvatar,
      postOwnerUsername,
      postOwnerTitle,
      curUserId,
      curUserPhoto,
      sessionUser   = {},
      visitingId,
      visitingUsername,
      userID,
      isRequest     = false,
      numberOfRequests,
      isFriends;
  console.log(userId);

  let CheckFriends    = "SELECT id FROM friend_list WHERE user_friend = ? and user_id = ?";
  let getIDFromFriend = "SELECT id FROM users WHERE user_name = ?";
  return new Promise(resolve => {
    dbConnection
      .query('SELECT id FROM users WHERE user_name = ?', [sess.userName])
      .then(result => {
        let userID = result[0]['id'];
        dbConnection
          .query(getIDFromFriend, [userId])
          .then(result => {
            if(isEmptyObject(result)){
              return throw404(res);
            }
            let id = result[0]['id'];
            dbConnection
              .query(CheckFriends, [id, userID])
              .then(result => {
                if (!isEmptyObject(result)) {
                  isFriends = false;
                } else {
                  isFriends = true;
                }
                resolve();
              })
          });
      })
  })
    .then(() => {
      console.log('hello');
      let selfSql = 'select id, avatar, user_title, position from users where user_name = ? or email = ?';
      dbConnection
        .query(selfSql, [sess.userName, sess.userName])
        .then(result => {
          userID = result[0]['id'];
          getRequestsAmount(userID)
            .then(count => {
              if (count > 0) {
                isRequest        = true;
                numberOfRequests = count;
              }
            });
        });
      dbConnection
        .query(selfSql, [sess.userName, sess.userName])
        .then(info => {
          console.log(info);
          if (isEmptyObject(info)) {
            return throw404(res);
          }
          sessionUser = {
            id          : info[0].id,
            username    : sess.userName,
            avatar      : info[0].avatar,
            title       : info[0].user_title,
            position    : info[0].position,
            allowedToSee: false
          };
        })
        .then(() => {
          if (sess.userName !== undefined) {
            let sql   = 'SELECT * FROM users WHERE user_name = ? and banned = b\'0\'';
            // let sql = 'SELECT * FROM users WHERE user_name = ?';
            let links = 'SELECT * FROM links WHERE owner_id = ?';
            dbConnection
              .query(links, [userId])
              .then(fetchedLinks => {
                dbConnection
                  .query(sql, [userId])
                  .then(result => Promise.resolve(result))
                  .then(result => {
                    if (isEmptyObject(result)) {
                      return res.status(404)
                        .render('404', {title: 'Ooops!'});
                    }
                    let verified     = result[0].verified > 0;
                    visitingUsername = result[0]['user_name'];
                    curUserId        = result[0]['id'];
                    curUserPhoto     = result[0]['avatar'];
                    let userType     = result[0].user_type;
                    console.log(userType);
                    console.log(curUserId, sessionUser.id);
                    return new Promise(resolveFr => {
                      if (curUserId === sessionUser.id) {
                        sessionUser.allowedToSee = true;
                        resolveFr();
                      } else if (sessionUser.position > 0) {
                        sessionUser.allowedToSee = true;
                        resolveFr();
                      } else if (!userType) {
                        sessionUser.allowedToSee = true;
                        resolveFr();
                      } else {
                        dbConnection
                          .query('SELECT * FROM friend_list WHERE user_id = ? and user_friend = ?', [
                            curUserId, sessionUser.id
                          ])
                          .then(fr => {
                            console.log(fr);
                            sessionUser.allowedToSee = !isEmptyObject(fr);
                            resolveFr();
                          });
                      }
                    })
                      .then(() => {
                        let postsSql = 'SELECT * FROM post where publishing_place = ? and type = "user" ORDER BY posted_date DESC';
                        dbConnection
                          .query(postsSql, [result[0]['id']])
                          .then(posts => {
                            let actions = posts.map(selectAttachment);
                            let results = Promise.all(actions);
                            results
                              .then(data => {
                                for (let i = 0; i < posts.length; i++) {
                                  let banned           = posts[i].banned.readUIntBE(0, 1);
                                  // console.log( posts[ i ].posted_date );
                                  let date             = new Date(posts[i].posted_date);
                                  posts[i].posted_date = `${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)} ${('0' + date.getDate()).slice(-2)}.${('0' + (+date.getMonth() + 1)).slice(-2)}.${date.getFullYear()}`;
                                  if (!banned) {
                                    postsToUpload.push({
                                      postData: posts[i], attachments: data[i],
                                      i       : i
                                    });
                                  }
                                }
                              })
                              .then(() => {
                                console.log('Get data');
                                console.log(postsToUpload);
                                selectUserInfo(curUserId)
                                  .then(info => {
                                    postAvatar        = info.avatar;
                                    postOwnerUsername = info.username;
                                    postOwnerTitle    = info.userTitle;
                                  })
                                  .then(() => {
                                    console.log(postAvatar, postOwnerTitle, postOwnerUsername);
                                    let curUser         = false,
                                        availableToEdit = false,
                                        links           = [],
                                        postsExists,
                                        postsNotExists,
                                        privileged      = sessionUser.position > 0;
                                    if (postsToUpload.length > 0) {
                                      postsExists    = true;
                                      postsNotExists = false;
                                    } else {
                                      postsNotExists = true;
                                      postsExists    = false;
                                    }
                                    if (sessionUser.position > 0) {
                                      availableToEdit = true;
                                    }
                                    if (sessionUser.id === curUserId) {
                                      curUser         = true;
                                      availableToEdit = true;
                                    }
                                    console.log(sessionUser);
                                    if (fetchedLinks.length !== 0) {
                                      for (const [i, value] of  Object.entries(fetchedLinks[0])) {
                                        if (i !== 'id') {
                                          if (i !== 'owner_id') {
                                            links.push({
                                              link: value,
                                              set : !!value
                                            });
                                          }
                                        }
                                      }
                                    }
                                    let online = false;
                                    usersOnline.forEach(item => {
                                      if (result[0].user_name === item.nickname) {
                                        return online = item.nickname = result[0].user_name === item.nickname;
                                      }
                                    });
                                    console.log('!!!');
                                    console.log(isFriends);
                                    return res.render('user', {
                                      title              : result[0].user_title,
                                      toSee              : sessionUser.allowedToSee,
                                      userAvatar         : sessionUser.avatar,
                                      userName           : sessionUser.username,
                                      userTitle          : sessionUser.title,
                                      realUsername       : sessionUser.username,
                                      usr                : result,
                                      links              : links,
                                      currentUser        : curUser,
                                      posts              : postsToUpload,
                                      postOwnerUsername  : postOwnerUsername,
                                      postOwnerTitle     : postOwnerTitle,
                                      postedAvatar       : postAvatar,
                                      postsExists        : postsExists,
                                      postsNotExists     : postsNotExists,
                                      availableToEdit    : availableToEdit,
                                      verified           : verified,
                                      privilege          : privileged,
                                      username           : sessionUser.username,
                                      online             : online,
                                      isRequest          : isRequest,
                                      friendsNotification: numberOfRequests,
                                      isFriends          : isFriends
                                    });
                                  });
                              });
                          });
                      });
                  })
                  .catch(error => {
                    console.error(error);
                  });
              });
          } else {
            res.redirect('/');
          }
        });
    })

});

app.post('/p/new/addFriend', function (req, res, next) {
  sess       = req.session;
  let userID = req.body.user.toLowerCase();
  let currentUser;
  let foreignUser;
  if (sess.userName !== null || sess.userName !== undefined) {
    let getCurrentUserID = 'SELECT id FROM users WHERE user_name = ? or email = ?';
    let getForeignUserID = 'SELECT id FROM users WHERE user_name = ?';
    let check            = 'SELECT * FROM requests WHERE user_friend = ? and to_user = ?';
    let sendRequest      = 'INSERT INTO requests (user_friend, to_user) VALUES (?, ?)';
    dbConnection
      .query(getCurrentUserID, [sess.userName, sess.userName])
      .then(result => {
        currentUser = result[0]['id'];
        dbConnection
          .query(getForeignUserID, [userID])
          .then(result => {
            foreignUser = result[0]['id'];
            dbConnection
              .query(check, [currentUser, foreignUser])
              .then(result => {
                if (isEmptyObject(result)) {
                  dbConnection
                    .query(sendRequest, [currentUser, foreignUser]);
                  res.send(JSON.stringify({
                    result: 'Success', text: 'Request has been sent!'
                  }));
                } else {
                  res.send(JSON.stringify({
                    result: 'Failed',
                    text  : 'You`ve already sent request to this user'
                  }));
                }
              });
          });
      });
  }
});

const selectSendersInfo = item => {
  return new Promise(resolve => {
    dbConnection
      .query('SELECT user_name, user_title, avatar FROM users WHERE id = ? and banned = 0', [item.sender_id])
      .then(result => resolve(result[0]));
  });
};

app.get('/msg', (req, res, next) => {
  console.log('Hello from messages!');
  sess = req.session;
  if (sess.userName !== undefined) {
    let sqlGetUser = 'SELECT id FROM users WHERE user_name = ?',
        userID,
        isRequest  = false,
        numberOfRequests;

    dbConnection
      .query(sqlGetUser, [sess.userName])
      .then(result => {
        userID = result[0]['id'];
        getRequestsAmount(userID)
          .then(count => {
            if (count > 0) {
              numberOfRequests = count;
              isRequest        = true;
            }
          });
      });
    let currentUser = {name: sess.userName};
    return new Promise(resolve => {
      dbConnection
        .query('SELECT user_name, user_title, position, avatar FROM users WHERE user_name = ? and banned = 0 or email = ? and banned = 0', [
          currentUser.name, currentUser.name
        ])
        .then(user => {
          if (isEmptyObject(user)) {
            return res.redirect('/');
          }
          [
            currentUser.username,
            currentUser.title,
            currentUser.avatar,
            currentUser.privilege
          ] = [
            user[0].user_name,
            user[0].user_title,
            user[0].avatar,
            user[0].position > 0
          ];
          resolve();
        });
    })
      .then(() => {
        dbConnection
          .query('SELECT sender_id, text, date FROM messages')
          .then(msgs => {
            let actions = msgs.map(selectSendersInfo);
            let results = Promise.all(actions);
            results
              .then((data) => {
                data.forEach((item, index) => {
                  if (item !== undefined) {
                    item.text = msgs[index].text;
                    let date  = msgs[index].date;
                    item.date = `${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)} ${('0' + date.getDate()).slice(-2)}.${('0' + (+date.getMonth() + 1)).slice(-2)}.${date.getFullYear()}`;
                  }
                });
                let tmp = [];
                data.forEach((elem, ind) => {
                  if (elem === undefined) {
                    console.log(ind);
                    console.log(elem);
                    data.splice(ind, 1);
                  } else {
                    tmp.push(elem);
                  }
                });
                console.log(data);
                return res.render('messages', {
                  title              : 'Messages', user: currentUser,
                  messages           : tmp,
                  username           : currentUser.username,
                  isRequest          : isRequest,
                  friendsNotification: numberOfRequests
                });
              });
          });
      });
  } else {
    return res.redirect('/');
  }
});
app.use('/msg/public', express.static('public'));
app.use('/settings', settRouter);
app.use('/g', groupRouter);
app.use('/post', postRouter);
app.use('/s', snippetRouter);
app.use('/d', dashBoardRouter);
app.use('/search', searchRouter);
app.use('/search/public', express.static('public'));
app.use('/friends/public', express.static('public'));
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error   = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  return req.res.status(404).render('404', {title: 'Ooops!'});
});

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

// function onError ( error ) {
//   if ( error.syscall !== 'listen' ) {
//     throw error;
//   }
//
//   var bind = typeof port === 'string'
//     ? 'Pipe ' + port
//     : 'Port ' + port;
//
//   // handle specific listen errors with friendly messages
//   switch ( error.code ) {
//     case 'EACCES':
//       console.error( bind + ' requires elevated privileges' );
//       process.exit( 1 );
//       break;
//     case 'EADDRINUSE':
//       console.error( bind + ' is already in use' );
//       process.exit( 1 );
//       break;
//     default:
//       throw error;
//   }
// }
//
// function onListening () {
//   var addr = server.address();
//   var bind = typeof addr === 'string'
//     ? 'pipe ' + addr
//     : 'port ' + addr.port;
//   debug( 'Listening on ' + bind );
// }

module.exports = app;
