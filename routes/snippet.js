const express          = require('express');
const snippet          = express();
const fs               = require('fs');
const dbp              = require('../database');
const multer           = require('multer');
const upload           = multer({dest: `public/images/`});
const dbConnection     = new dbp();
const bodyParser       = require('body-parser');
const md5              = require('md5');
const expressSession   = require('express-session');
const urlencodedParser = bodyParser.urlencoded({extended: false});
const Prism            = require('prismjs');
const Normalizer       = require('prismjs/plugins/normalize-whitespace/prism-normalize-whitespace');
let nw                 = Prism.plugins.NormalizeWhitespace;
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

function modifyText(str) {
  let pattern = /^\@[\d\w]+\b/g;
  str         = str.replace('<', '&#60;').replace('>', '&#62;');
  str         = str.split(' ');
  str.forEach((item, index) => {
    let nickname = pattern.exec(item);
    if (nickname !== null) {
      nickname   = nickname[0].replace('@', '');
      let rest   = item.replace('@' + nickname, '');
      str[index] = `<a href="/p/${nickname}">@${nickname}</a>${rest}`;
    }
  });
  return str.join(' ');
};

const throw404 = res => res.status(404).render('404', {title: 'Ooops!'});

const generateRandomString = length => {
  let characters = '01234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM',
      code       = '';
  for (let i = 0; i < length; i++) {
    let random = (Math.random() * characters.length) << 0;
    console.log(random);
    code += characters[random];
  }
  return code;
};

snippet.get('/', (req, res, next) => {
  sess = req.session;
  if (sess.userName !== undefined) {
    let sqlGetUser = "SELECT id FROM users WHERE user_name = ?",
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
        .query('SELECT id, user_name, user_title, position, avatar FROM users WHERE user_name = ? or email = ?', [
          currentUser.name, currentUser.name
        ])
        .then(user => {
          resolve();
          [
            currentUser.id,
            currentUser.position,
            currentUser.username,
            currentUser.avatar,
            currentUser.title
          ]                     = [
            user[0].id,
            user[0].position,
            user[0].user_name,
            user[0].avatar,
            user[0].user_title
          ];
          currentUser.privilege = currentUser.position > 0;
          console.log(currentUser);
        });
    })
      .then(() => {
        dbConnection
          .query('SELECT id, title, description, visibility, language, identifier FROM snippet WHERE user_id = ? ORDER by id DESC', [currentUser.id])
          .then(snippets => {
            let snippetsArray = [];
            for (let i = 0; i < snippets.length; i++) {
              snippetsArray.push({
                title     : snippets[i].title,
                desc      : snippets[i].description,
                language  : snippets[i].language,
                txtLan    : snippets[i].language.charAt(0)
                  .toUpperCase() + snippets[i].language.slice(1),
                visibility: snippets[i].visibility.readUIntBE(0, 1) === 0 ? 'Public' : 'Private',
                id        : snippets[i].identifier
              });
              switch (snippets[i].language) {
                case 'markup':
                  snippets[i].txtLan = 'HTML';
                  break;
                case 'javascript':
                  snippets[i].txtLan = 'JavaScript';
                  break;
                case 'csharp':
                  snippets[i].txtLan = 'C#';
                  break;
                case 'css':
                  snippets[i].txtLan = 'CSS';
                  break;
              }
            }
            console.log(snippetsArray);
            return res.render('snippet_list', {
              title              : 'Snippets',
              user               : currentUser,
              snippets           : snippetsArray,
              snippetsExist      : snippetsArray.length > 0,
              username           : currentUser.username,
              isRequest          : isRequest,
              friendsNotification: numberOfRequests
            });
          });
      });
  } else {
    res.redirect('/');
  }
});

snippet.get('/view/:id', (req, res, next) => {
  sess           = req.session;
  let sqlGetUser = "SELECT id FROM users WHERE user_name = ?",
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
  let currentUser   = {name: sess.userName},
      snippetObject = {id: req.params.id};
  if (currentUser.name !== undefined) {
    return new Promise((resolve, reject) => {
      dbConnection
        .query('SELECT user_title, user_name, id, avatar, position from users where user_name = ? or email = ?', [
          currentUser.name, currentUser.name
        ])
        .then(user => {
          [
            currentUser.username, currentUser.title, currentUser.avatar,
            currentUser.position, currentUser.id
          ]                     = [
            user[0].user_name, user[0].user_title, user[0].avatar,
            user[0].position, user[0].id
          ];
          currentUser.privilege = currentUser.position > 0;
          console.log(currentUser);
          resolve();
        });
    })
      .then(() => {
        return new Promise((resolve, reject) => {
          dbConnection
            .query('SELECT * FROM snippet WHERE identifier = ?', [snippetObject.id])
            .then(snippet => {
              if (isEmptyObject(snippet)) {
                reject();
              }
              [
                snippetObject.ownerId, snippetObject.title, snippetObject.desc,
                snippetObject.code,
                snippetObject.language, snippetObject.txtLang,
                snippetObject.visibility
              ] = [
                snippet[0].user_id, snippet[0].title,
                snippet[0].description, snippet[0].code,
                snippet[0].language, snippet[0].language.charAt(0)
                  .toUpperCase() + snippet[0].language.slice(1),
                snippet[0].visibility.readUIntBE(0, 1)
              ];
              switch (snippetObject.language) {
                case 'markup':
                  snippetObject.txtLang = 'HTML';
                  break;
                case 'javascript':
                  snippetObject.txtLang = 'JavaScript';
                  break;
                case 'csharp':
                  snippetObject.txtLang = 'C#';
                  break;
                case 'css':
                  snippetObject.txtLang = 'CSS';
                  break;
              }
              resolve();
            });
        })
          .catch(() => throw404(res));
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          dbConnection
            .query('SELECT id, user_name, user_title FROM users WHERE id = ?', [snippetObject.ownerId])
            .then(author => {
              console.log(author[0]);
              console.log(author[0].user_name);
              snippetObject.author = {};
              [
                snippetObject.author.username, snippetObject.author.title,
                snippetObject.author.id
              ]                    = [
                author[0].user_name, author[0].user_title, author[0].id
              ];
              console.log(snippetObject);
              console.log(currentUser);
              if (!!snippetObject.visibility) {
                if (currentUser.privilege) {
                  console.log('You are privileged!');
                  currentUser.availableToDelete = true;
                  resolve();
                } else if (currentUser.id === snippetObject.author.id) {
                  console.log('Your are author!');
                  currentUser.availableToDelete = true;
                  resolve();
                } else {
                  console.log('Heh');
                  throw404(res);
                }
              } else {
                console.log('This is public');
                currentUser.availableToDelete = currentUser.id === snippetObject.author.id ? true : currentUser.privilege;
                resolve();
              }
            });
        });
      })
      .then(() => {
        console.log('Ready to render');
        return res.render('snippet', {
          title              : snippetObject.title,
          snippet            : snippetObject,
          user               : currentUser,
          username           : currentUser.username,
          isRequest          : isRequest,
          friendsNotification: numberOfRequests
        });
      });
  } else {
    return res.redirect('/');
  }
});

snippet.get('/view/:id/raw', (req, res, next) => {
  dbConnection
    .query('SELECT user_id, code, visibility, title FROM snippet WHERE identifier = ?', [req.params.id])
    .then(snippetRaw => {
      if (isEmptyObject(snippetRaw)) {
        return throw404(res);
      }
      let visibility = snippetRaw[0].visibility.readUIntBE(0, 1);
      if (!visibility) {
        return res.send(`<title>${snippetRaw[0].title}</title><pre>${snippetRaw[0].code}</pre>`);
      } else {
        if (req.session.userName !== undefined) {
          dbConnection
            .query('SELECT id, position FROM users WHERE user_name = ? or email = ?', [
              req.session.userName, req.session.userName
            ])
            .then(user => {
              if (isEmptyObject(user)) {
                return throw404(res);
              }
              if (user[0].position > 0) {
                return res.send(`<title>${snippetRaw[0].title}</title><pre>${snippetRaw[0].code}</pre>`);
              } else if (user[0].id === snippetRaw[0].user_id) {
                return res.send(`<title>${snippetRaw[0].title}</title><pre>${snippetRaw[0].code}</pre>`);
              } else {
                return throw404(res);
              }
            });
        } else {
          return throw404(res);
        }
      }
    });
  if (req.session.userName !== null) {

  }
  // return res.sendFile( '404.hbs' );
});

snippet.get('/new', (req, res, next) => {
  sess = req.session;
  if (sess.userName !== undefined) {
    let sqlGetUser = "SELECT id FROM users WHERE user_name = ?",
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
            let currentUser = {name: sess.userName};
            return new Promise(resolve => {
              dbConnection
                .query('SELECT id, user_name, user_title, position, avatar FROM users WHERE user_name = ? or email = ?', [
                  currentUser.name, currentUser.name
                ])
                .then(user => {
                  resolve();
                  [
                    currentUser.id, currentUser.title, currentUser.position,
                    currentUser.username,
                    currentUser.avatar
                  ]                     = [
                    user[0].id, user[0].user_title, user[0].position,
                    user[0].user_name,
                    user[0].avatar
                  ];
                  currentUser.privilege = currentUser.position > 0;
                  return res.render('create_snippet', {
                    title              : 'New Snippet',
                    user               : currentUser,
                    username           : currentUser.username,
                    isRequest          : isRequest,
                    friendsNotification: numberOfRequests
                  });
                });
            });
          });
      })
      .then(() => {
        // console.log( user );
      });
  } else {
    return res.redirect('/');
  }
});

snippet.post('/create', urlencodedParser, (req, res, next) => {
  sess = req.session;
  console.log(req.body);
  if (sess.userName !== undefined) {
    let currentUser = {name: sess.userName};
    return new Promise(resolve => {
      dbConnection
        .query('SELECT id FROM users WHERE user_name = ? or email = ?', [
          currentUser.name, currentUser.name
        ])
        .then(user => {
          currentUser.id = user[0].id;
          resolve();
        });
    })
      .then(() => {
        return new Promise(resolve => {
          let identifier = '',
              exist      = false;
          do {
            identifier = generateRandomString(15);
            dbConnection
              .query('SELECT identifier FROM snippet WHERE identifier = ?', [identifier])
              .then(result => {
                if (isEmptyObject(result)) {
                  exist = true;
                  resolve(identifier);
                }
              });
          } while (exist);
        });
      })
      .then((identifier) => {
        return new Promise((resolve, reject) => {
          let code          = nw.normalize(req.body.code, {indent: 1});
          let snippetObject = {
            user       : currentUser.id,
            code       : code,
            language   : req.body.language !== undefined ? req.body.language : 'markup',
            visibility : req.body.type !== undefined ? 1 : 0,
            identifier : identifier,
            title      : req.body.title === '' ? 'Untitled' : req.body.title,
            description: modifyText(req.body.description)
          };
          console.log(req.body);
          if (!snippetObject.code) {
            console.log('Rejected');
            reject({status: 'Failed', text: 'Code cannot be empty!'});
          }
          dbConnection
            .query('INSERT INTO snippet (user_id, title, description, code, language, visibility, identifier) VALUES (?, ?, ?, ?, ?, ?, ?)', [
              snippetObject.user, snippetObject.title,
              snippetObject.description, snippetObject.code,
              snippetObject.language,
              snippetObject.visibility, snippetObject.identifier
            ])
            .then(() => {
              return res.send('/s/view/' + snippetObject.identifier);
            });
          console.log(snippetObject);
        });
      })
      .catch(error => res.send(JSON.stringify(error)));
  }
});

snippet.post('/delete', urlencodedParser, (req, res, next) => {
  sess = req.session;
  if (sess.userName !== undefined) {
    let currentUser     = {name: sess.userName},
        snippetToDelete = {id: req.body.snippetId};
    return new Promise(resolve => {
      dbConnection
        .query('SELECT id, position FROM users WHERE user_name = ? or email = ?', [
          currentUser.name, currentUser.name
        ])
        .then(result => {
          console.log(result);
          [currentUser.id, currentUser.position] = [
            result[0].id, result[0].position
          ];
          resolve();
        });
    })
      .then(() => {
        return new Promise(resolve => {
          dbConnection
            .query('SELECT user_id FROM snippet WHERE identifier = ?', [snippetToDelete.id])
            .then(snippet => {
              if (!isEmptyObject(snippet)) {
                console.log(snippet);
                snippetToDelete.user = snippet[0].user_id;
                resolve();
              }
            });
        });
      })
      .then(() => {
        return new Promise(resolve => {
          if (currentUser.position > 0) {
            resolve();
          } else if (currentUser.id === snippetToDelete.user) {
            resolve();
          }
        });
      })
      .then(() => {
        dbConnection
          .query('DELETE FROM snippet WHERE identifier = ?', [snippetToDelete.id])
          .then(result => {
            console.log(result);
            return res.send(true);
          });
      });
  }
});

module.exports = snippet;