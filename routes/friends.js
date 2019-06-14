const express          = require('express');
const friends          = express();
const fs               = require('fs');
const upload           = require('express-fileupload');
const dbp              = require('../database');
const dbConnection     = new dbp();
const bodyParser       = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({extended: false});
const multer           = require('multer');
const multerUpload     = multer({dest: 'uploads/'});
friends.use(upload());
let sess;

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

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

friends.get('/', function (req, res, next) {
  sess          = req.session;
  let userAvatar;
  let userName;
  let user;
  let numberOfRequests;
  let isRequest = false;
  let userTitle;
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
          userTitle  = userInfo[0]['user_title'];
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
              console.log(friendList);
              let actions = friendList.map(selectUserData);
              let results = Promise.all(actions);
              results
                .then(data => {
                  let friendsList = data;
                  dbConnection
                    .query(sqlRequests, [user])
                    .then(requestRes => {
                      let actions = requestRes.map(selectUserData);
                      let results = Promise.all(actions);
                      results
                        .then(data => {
                          console.log(data);
                          res.render('friends_alt', {
                            title              : 'friends',
                            userAvatar         : userAvatar,
                            userName           : userName,
                            userTitle          : userTitle,
                            friends            : true,
                            friendsList        : friendsList,
                            requestList        : data,
                            friendsNotification: numberOfRequests,
                            isRequest          : isRequest,
                            username           : userName
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

friends.get('/:id/removeRequests', function (req, res, next) {
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

friends.get('/:id/add', function (req, res, next) {
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

friends.get('/:id/delete', function (req, res, next) {
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
            dbConnection
              .query(deleteFromFriends, [foreignUserId, userID])
              .then(result => {
                dbConnection
                  .query(deleteFromFriends, [
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

module.exports = friends;