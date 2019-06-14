const express        = require('express');
const reg            = express();
const fs             = require('fs');
const db             = require('../databaseConnection');
const emailing       = require('../emailing');
const bodyParser     = require('body-parser');
const md5            = require('md5');
const expressSession = require('express-session');
const multer         = require('multer');
const upload         = multer({dest: `public/images/`});
const dbp            = require('../database');
const dbConnection   = new dbp();
let days             = 86400000 * 3;
reg.use(expressSession({
  secret  : '4Progs', resave: true, saveUninitialized: true, maxAge: days,
  httpOnly: true
}));

const throw404 = res => res.status(404).render('404', {title: 'Ooops!'});

const capitalize = (str) => {
  if (typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const removeIllegals = str => str.replace(/[$%&#*\s,.^№!@;:\'\"\`\\\/?\~()]/g, '');

const checkNickname = nickname => {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM users WHERE user_name = ? or email = ?';
    nickname  = removeIllegals(nickname);
    if (nickname.length > 30 || nickname.length < 3) {
      reject({
        result: 'Failed', text: 'Nickname is too long 🙁'
      });
    }
    dbConnection
      .query(query, [nickname, nickname])
      .then(result => {
        if (isEmptyObject(result)) {
          resolve(true);
        } else {
          reject({
            result: 'Failed', text: 'User with this nickname already exists'
          });
        }
      })
      .catch(error => console.error(error));
  });
};

const checkToken = token => {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM confirmations WHERE token = ?';
    dbConnection
      .query(query, [token])
      .then(result => {
        if (!isEmptyObject(result)) {
          resolve({
            token   : result[0].token,
            password: result[0].password,
            email   : result[0].email
          });
        } else {
          reject({error: 'Wrong token'});
        }
      });
  });
};

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

const getMaxId = () => {
  return new Promise((resolve, reject) => {
    let getInfo = 'SELECT MAX(id) as maxId FROM users';
    dbConnection
      .query(getInfo, [])
      .then(result => {
        resolve(result[0].maxId);
      })
      .catch(error => reject(error));
  });
};

let urlencodedParser = bodyParser.urlencoded({extended: false});

reg.post('/confirm/:token', urlencodedParser, (req, res, next) => {
  console.log(req.body);
  checkToken(req.params.token)
  // Validating token
    .then(tokenResult => {
      return new Promise((resolve, reject) => {
        if (!req.body.first_name || !req.body.last_name) {
          console.log(req.body.first_name, !req.body.first_name);
          console.log(req.body.last_name, !req.body.last_name);
          reject({
            result: 'Failed',
            text  : 'Don\'t forget to enter first name and last name!'
          });
        }
        if (!isEmptyObject(tokenResult)) {
          let userObject = {
            username : req.body.username,
            tokenInfo: tokenResult
          };
          resolve(userObject);
        } else {
          reject({result: 'Failed', text: 'Wrong token'});
        }
      });
    })
    // Setting username
    .then(userObject => {
      return new Promise((resolve, reject) => {
        if (!userObject.username) {
          getMaxId()
            .then(result => {
              userObject.maxId    = result + 1;
              userObject.username = `user${userObject.maxId}`;
              resolve(userObject);
            });
        } else {
          checkNickname(userObject.username)
            .then(() => {
              resolve(userObject);
            })
            .catch(error => reject({result: 'Failed', text: error}));
        }
      });
    })
    // File uploading
    .then(userObject => {
      return new Promise((resolve, reject) => {
        console.log(req.files);
        if (req.files !== null) {
          let file = req.files.user_avatar;
          return new Promise((resolve, reject) => {
            let fileName = file.name,
                path     = `./public/user/${fileName}`;
            // Uploading file
            file.mv(path, (error) => {
              if (error) {
                reject({result: 'Failed', text: error});
              } else {
                resolve(file);
              }
            });
          })
            .catch(err => console.error(err))
            .then((file) => {
              // File renaming
              return new Promise((resolve, reject) => {
                let newTitle = `./public/user/${md5(file.md5 + (new Date).getTime()) + '.' + file.name.split('.')
                  .pop()}`;
                fs.rename(`./public/user/${file.name}`, newTitle, (error) => {
                  if (error) {
                    reject({result: 'Failed', text: error});
                  } else {
                    console.log('File renamed');
                    userObject.avatar = newTitle;
                    resolve(userObject);
                  }
                });
              })
                .then(userObject => Promise.resolve(userObject))
                .catch(err => console.error(err));
            })
            .then(userObject => resolve(userObject));
        } else {
          userObject.avatar = './public/user/default.jpg';
          resolve(userObject);
        }
      })
        .then(userObject => Promise.resolve(userObject));
    })
    // Inserting into database
    .then(userObject => {
      console.log('hello');
      return new Promise((resolve, reject) => {
        console.log(userObject);
        let query     = 'INSERT INTO users (user_name, email, password, status, bio, avatar, user_type, user_title) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            userTitle = capitalize(req.body.first_name)
              .replace(/\s/g, '') + ' ' + capitalize(req.body.last_name)
              .replace(/\s/g, ''),
            info      = req.body;
        dbConnection
          .query(query, [
            userObject.username, userObject.tokenInfo.email,
            userObject.tokenInfo.password, info.user_status, info.bio,
            userObject.avatar, info.profile_type === 'public' ? 0 : 1,
            userTitle
          ])
          .then(() => resolve(userObject))
          .catch(error => {
            reject({result: 'Failed', text: error});
          });
      });
    })
    // Inserting links into database
    .then(userObject => {
      return new Promise((resolve, reject) => {
        let linksQuery = 'INSERT INTO links (owner_id, website, github, gitlab, bitbucket, telegram, whatsapp, viber, facebook, twitter, skype, discord, linkedin, slack, corp_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        dbConnection
          .query(linksQuery, [
            userObject.username, req.body.website, req.body.github,
            req.body.gitlab, req.body.bitbucket, req.body.telegram,
            req.body.whatsapp,
            req.body.viber, req.body.facebook, req.body.twitter,
            req.body.skype, req.body.discord, req.body.linkedin,
            req.body.slack, req.body.corp_email
          ])
          .then(() => {
            resolve(userObject);
          })
          .catch(error => reject({result: 'Failed', text: error}));
      });
    })
    // Removing token
    .then(userObject => {
      let query = 'DELETE FROM confirmations WHERE TOKEN = ?';
      dbConnection
        .query(query, [userObject.tokenInfo.token])
        .then(() => {
          res.send({
            result: 'Successful', text: 'Thank you for registration!'
          });
          res.end();
        });
    })
    // Catching errors
    .catch(error => {
      res.send(JSON.stringify(error));
    });
// res.redirect( '/' );
});

reg.get('/:token', (req, res) => {
  let token = req.params.token;
  console.log(token);
  let query = 'SELECT * FROM confirmations WHERE token = ?';
  db.dbconnection.query(query, [token], (error, result) => {
    if (error) {
      throw new Error(error);
    } else {
      console.log(result);
      if (!isEmptyObject(result)) {
        res.render('register', {
          title: 'Registration', email: result[0]['email'],
          token: req.params.token
        });
      } else {
        throw404(res);
      }
    }
  });
});

module.exports = reg;