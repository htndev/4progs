const express  = require('express');
const settings = express();
const fs       = require('fs');
const upload   = require('express-fileupload');
settings.use(upload());
const dbp              = require('../database');
const dbConnection     = new dbp();
const bodyParser       = require('body-parser');
const md5              = require('md5');
const expressSession   = require('express-session');
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

settings.get('/', function (req, res, next) {
  sess = req.session;
  let userID,
      isRequest  = false,
      numberOfRequests,
      sqlGetUser = 'SELECT id FROM users WHERE user_name = ?';
  if (sess.userName !== undefined) {

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

    let sql = 'SELECT * FROM users WHERE user_name = ? or email = ?';
    dbConnection
      .query(sql, [sess.userName, sess.userName])
      .then(result => {
        let userBio     = result[0]['user_title'].split(' ');
        let username    = userBio[0].toString();
        let usersurname = userBio[1].toString();
        console.log(isRequest);
        console.log(numberOfRequests);
        res.render('user_settings', {
          title              : 'Settings',
          condition          : false,
          res                : result,
          userName           : username,
          userSurname        : usersurname,
          username           : username,
          isRequest          : isRequest,
          friendsNotification: numberOfRequests
        });
      });
      });
  } else {
    res.redirect('/');
  }
});

settings.post('/settingGeneral', urlencodedParser, function (req, res, next) {
  sess                       = req.session;
  let userFirstName          = req.body.userFstName;
  let userSurname            = req.body.userSurnam;
  let userName               = req.body.userNam;
  let userTitle              = userFirstName + ' ' + userSurname;
  let oldUserName            = sess.userName;
  let check                  = 'SELECT id, user_title from users WHERE user_name = ?';
  let sqlUpdateOnlyUserTitle = 'UPDATE users SET user_title = ? WHERE user_name = ?';
  dbConnection
    .query(check, [userName, userName])
    .then(result => {
      if (!isEmptyObject(result)) {
        let oldUserTitle = result[0]['user_title'];
        dbConnection
          .query(sqlUpdateOnlyUserTitle, [userTitle, oldUserName])
          .then(result => {
            if (userName === oldUserName && userTitle !== oldUserTitle) {
              res.redirect(`/p/${oldUserName}`);
            } else {
              res.redirect('/settings');
            }
          });
      } else {
        let sql            = 'UPDATE users SET user_name = ?, user_title = ? WHERE user_name = ?';
        let sqlUpdateLinks = 'UPDATE links SET owner_id = ? WHERE owner_id = ?';
        dbConnection.query(sqlUpdateLinks, [userName, oldUserName]);
        dbConnection.query(sql, [userName, userTitle, oldUserName]);
        sess.userName = userName;
        sess.save(function (err) {
          sess.reload(function (err) {
            res.redirect(`/p/${userName}`);
          });
        });
      }
    });
});

settings.post('/settingPrivacy', urlencodedParser, function (req, res, next) {
  sess            = req.session;
  let profileType = req.body.profileType;
  let oldPassword = req.body.oldPassword;
  let password    = req.body.newPassword;
  console.log(password);
  let confirmPassword = req.body.ConfirmPassword;
  if (sess.userName !== undefined) {
    let sqlUserType = 'UPDATE users SET user_type = ? WHERE user_name = ?';
    let sql         = 'SELECT password FROM users WHERE user_name = ?';
    dbConnection
      .query(sql, [sess.userName])
      .then(result => {
        if (result[0]['password'] !== oldPassword) {
          res.send(JSON.stringify({
            result: 'Failed', text: 'Old password is not correct!'
          }));
        } else {
          dbConnection
            .query(sqlUserType, [profileType, sess.userName]);
          if (password === confirmPassword) {
            let update = 'UPDATE users SET password = ? WHERE user_name = ?';
            dbConnection.query(update, [password, sess.userName])
              .then(() => {
                res.send(JSON.stringify({
                  result: 'Success',
                  text  : 'Your data has been updated'
                }));
              });
          } else {
            res.send(JSON.stringify({
              result: 'Failed', text: 'New password do not match!'
            }));
          }
        }
      });
  }
});
settings.post('/settingLinks', urlencodedParser, function (req, res, next) {
  sess = req.session;
  if (sess.userName !== undefined) {
    let sql = 'UPDATE `links` SET `website`= ?,`github`= ?,`gitlab`= ?,`bitbucket`= ?,`telegram`= ?,`whatsapp`= ?,`viber`= ?,`facebook`= ?,`twitter`= ?,`skype`= ?,`discord`= ?,`linkedin`= ?,`slack`= ?,`corp_email`= ? WHERE owner_id = ?';
    dbConnection
      .query(sql, [
        req.body.website, req.body.github, req.body.gitlab, req.body.bitbucket,
        req.body.telegram, req.body.whatsapp, req.body.viber, req.body.facebook,
        req.body.twitter, req.body.skype, req.body.discord, req.body.linkedin,
        req.body.slack, req.body.corp_email, sess.userName
      ])
      .then(result => {
        if (!isEmptyObject(result)) {
          res.send(JSON.stringify({
            result: 'Success', text: 'Your data has been updated'
          }));
        } else {
          res.send(JSON.stringify({
            result: 'Failed',
            text  : 'Something wrong with data or your connection closed'
          }));
        }
      });
  }
});

module.exports = settings;