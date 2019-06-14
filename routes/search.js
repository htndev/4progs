const express      = require('express');
const search       = express();
const dbp          = require('../database');
const dbConnection = new dbp();
;
const bodyParser       = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({extended: false});

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

search.get('/', function (req, res, next) {
  sess           = req.session;
  let sqlGetUser = "SELECT id, user_name, avatar, user_title FROM users WHERE user_name = ?",
      userID,
      isRequest  = false,
      numberOfRequests;

  if (sess.userName !== null || sess.userName !== undefined) {
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
            dbConnection
              .query(sqlGetUser, [sess.userName])
              .then(result => {
                res.render('search', {
                  title              : 'Search',
                  condition          : false,
                  usr                : result,
                  isRequest          : isRequest,
                  friendsNotification: numberOfRequests
                })
              });
          });
      });
  } else {
    res.redirect('/');
  }
});
search.get('/find', urlencodedParser, function (req, res, next) {
  let ifResultUser, ifResultGroups, usrResult, groupResult, user;
  sess                      = req.session;
  let sqlGetUser            = "SELECT id, user_name, avatar, user_title FROM users WHERE user_name = ?",
      userID,
      isRequest             = false,
      numberOfRequests;
  let sqlSelectResFromUsers = 'SELECT * FROM users WHERE user_name LIKE ? AND banned = 0 or user_title LIKE ? AND banned = 0',
      sqlSelectFromGroups   = 'SELECT * FROM `group` WHERE group_name LIKE ? AND banned = 0 or group_title LIKE ? AND banned = 0',
      searchingParam        = req.query.searchingIn,
      userChecked           = req.query.usersCheck,
      groupsChecked         = req.query.groupsCheck;
  console.log(userChecked);

  if (sess.userName !== null || sess.userName !== undefined) {
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
            if (searchingParam !== null || searchingParam !== undefined) {
              if (userChecked !== null || userChecked !== undefined) {
                dbConnection
                  .query(sqlSelectResFromUsers, [searchingParam + '%', searchingParam + '%'])
                  .then(user => {
                    if (isEmptyObject(user)) {
                      ifResultUser = false;
                    } else {
                      ifResultUser = true;
                      usrResult    = user;
                    }
                  });
              } else {
                res.redirect('/search')
              }
              if (groupsChecked !== null || groupsChecked !== undefined) {
                dbConnection
                  .query(sqlSelectFromGroups, [searchingParam + '%', searchingParam + '%'])
                  .then(group => {
                    if (isEmptyObject(group)) {
                      ifResultGroups = false;
                    } else {
                      ifResultGroups = true;
                      groupResult    = group;
                    }

                    let sqlGetUser = "SELECT id, avatar, user_name, user_title FROM users WHERE user_name = ?";
                    dbConnection
                      .query(sqlGetUser, sess.userName)
                      .then(result => {
                        user = result;
                        res.render('search', {
                          title              : 'Search result`s',
                          condition          : false,
                          usr                : user,
                          isRequest          : isRequest,
                          friendsNotification: numberOfRequests,
                          isResultUser       : ifResultUser,
                          isResultGroups     : ifResultGroups,
                          usrResult          : usrResult,
                          groupResult        : groupResult
                        });
                      });
                  });
              }
            } else {
              res.redirect('/search')
            }
          });
      });
  } else {
    res.redirect('/');
  }
});

module.exports = search;
