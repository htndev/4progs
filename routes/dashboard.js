const express          = require('express'),
      dashboard        = express(),
      fs               = require('fs'),
      dbp              = require('../database'),
      multer           = require('multer'),
      upload           = multer({dest: `public/images/`}),
      dbConnection     = new dbp(),
      bodyParser       = require('body-parser'),
      md5              = require('md5'),
      expressSession   = require('express-session'),
      urlencodedParser = bodyParser.urlencoded({extended: false}),
      ini              = require('ini');
let sess;

const throw404 = res => res.status(404).render('404', {title: 'Ooops!'});

const removeReport = reportId => {
  return new Promise((resolve, reject) => {
    dbConnection
      .query('DELETE FROM report WHERE id = ?', [reportId])
      .then(() => resolve());
  });
};

const selectTitles = item => {
  return new Promise(resolve => {
    if (item.type === 'post') {
      dbConnection
        .query('SELECT publishing_place FROM post WHERE id = ?', item.id)
        .then(result => {
          console.log(result);
          resolve({
            id: result[0].publishing_place, type: 'post', title: 'Post'
          });
        })
        .catch(error => console.error(error));
    } else {
      let [kind, table, title] = [
        item.type === 'user' ? 'user_name' : 'group_name',
        item.type === 'user' ? 'users' : '`group`',
        item.type === 'user' ? 'user_title' : 'group_title'
      ];

      let sql = `SELECT id, ${item.type === 'user' ? 'user_name' : 'group_name'}, ${item.type === 'user' ? 'user_title' : 'group_title'} FROM ${item.type === 'user' ? 'users' : '`group`'} WHERE id = ?`;

      dbConnection
        .query(sql, [item.id])
        .then(result => resolve({
          id   : result[0].id,
          name : result[0][kind],
          type : table,
          title: result[0][title]
        }))
        .catch(error => console.error(error));
    }
  });
};

const getRequestsAmount = id => {
  return new Promise((resolve, reject) => {
    let sqlCount = 'SELECT COUNT(*) FROM requests WHERE to_user = ?';
    dbConnection
      .query(sqlCount, [id])
      .then(result => resolve(result[0]['COUNT(*)']));

  });
};

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

dashboard.get('/', (req, res, next) => {
  console.log('This is dashboard');
  let sqlGetUser = "SELECT id FROM users WHERE user_name = ?",
      userID,
      isRequest  = false,
      numberOfRequests;
  sess           = req.session;
  if (sess.userName !== undefined) {
    let currentUser = {name: sess.userName};
    return new Promise((resolve, reject) => {
      dbConnection
        .query('SELECT * FROM users WHERE user_name = ? or email = ?', [
          currentUser.name, currentUser.name
        ])
        .then(user => {
          console.log(user);
          [
            currentUser.username,
            currentUser.title,
            currentUser.position,
            currentUser.avatar
          ]                     = [
            user[0].user_name,
            user[0].user_title,
            user[0].position,
            user[0].avatar
          ];
          currentUser.privilege = currentUser.position > 0;
          currentUser.isAdmin   = currentUser.position > 1;
          if (!currentUser.privilege) {
            reject();
          } else {
            resolve();
          }
        });
    })
      .then(() => {
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
                let cfg = ini.parse(fs.readFileSync(__dirname + '/../cfg.ini', 'utf-8'));
                console.log(currentUser);
                return res.render('dashboard_general', {
                  title              : 'General', user: currentUser, config: cfg,
                  username           : currentUser.username,
                  isRequest          : isRequest,
                  friendsNotification: numberOfRequests
                });
              });
          });
      })
      .catch(() => throw404(res));
  } else {
    return throw404(res);
  }
});

dashboard.get('/reports', (req, res, next) => {
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
  if (sess.userName !== undefined) {
    let currentUser  = {name: sess.userName},
        reportsArray = [];
    return new Promise((resolve, reject) => {
      let sql = 'SELECT user_name, user_title, position, avatar FROM users WHERE user_name = ? or email = ?';
      dbConnection
        .query(sql, [currentUser.name, currentUser.name])
        .then(user => {
          console.log(user);
          [
            currentUser.username,
            currentUser.title,
            currentUser.position,
            currentUser.avatar
          ]                     = [
            user[0].user_name,
            user[0].user_title,
            user[0].position,
            user[0].avatar
          ];
          currentUser.privilege = currentUser.position > 0;
          currentUser.isAdmin   = currentUser.position > 1;
          console.log(currentUser);
          if (!currentUser.privilege) {
            reject();
          } else {
            resolve();
          }
        })
        .then(() => {
          return new Promise((resolve, reject) => {
            let reportSql = 'SELECT * FROM report ORDER BY date DESC';
            dbConnection
              .query(reportSql)
              .then(reports => {
                reports.forEach(item => {
                  let date = new Date(item.date);
                  reportsArray.push({
                    id      : item.object_id,
                    reportId: item.id,
                    type    : item.type,
                    reason  : item.reason,
                    comment : item.comment,
                    date    : `${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)} ${('0' + date.getDate()).slice(-2)}.${('0' + (+date.getMonth() + 1)).slice(-2)}.${date.getFullYear()}`
                  });
                });
                console.log(reportsArray);
                let actions = reportsArray.map(selectTitles);
                let results = Promise.all(actions);
                results
                  .then(data => {
                    for (let i = 0; i < reportsArray.length; i++) {
                      [
                        reportsArray[i].data, reportsArray[i].i
                      ] = [data[i], i + 1];
                      switch (reportsArray[i].type) {
                        case 'post':
                          reportsArray[i].link = `/post/${reportsArray[i].data.id}/${reportsArray[i].id}`;
                          break;
                        case 'user':
                          reportsArray[i].link = `/p/${reportsArray[i].data.name}`;
                          break;
                        case 'group':
                          reportsArray[i].link = `/g/${reportsArray[i].data.name}`;
                          break;
                      }

                      switch (reportsArray[i].reason) {
                        case 'another':
                          reportsArray[i].txtReason = 'Another';
                          break;
                        case 'verbal-abuse':
                          reportsArray[i].txtReason = 'Verbal Abuse';
                          break;
                        case 'spam':
                          reportsArray[i].txtReason = 'Spam';
                          break;
                        case 'harassment':
                          reportsArray[i].txtReason = 'Harassment';
                          break;
                      }
                    }
                    return res.render('dashboard_report', {
                      title             : 'Reports', user: currentUser,
                      reports           : reportsArray, username: currentUser.username,
                      isRequest         : isRequest,
                      friendsNotification: numberOfRequests
                    });
                  });
              });
          });
        });
    })
      .catch(() => throw404(res));
  } else {
    return throw404(res);
  }
});

dashboard.get('/admins', (req, res, next) => {
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
  if (sess.userName !== undefined) {
    let currentUser = {name: sess.userName};
    return new Promise((resolve, reject) => {
      dbConnection
        .query('SELECT user_name, user_title, position, avatar FROM users WHERE user_name = ? or email = ?', [
          currentUser.name, currentUser.name
        ])
        .then(user => {
          [
            currentUser.username,
            currentUser.title,
            currentUser.position,
            currentUser.avatar,
            currentUser.isAdmin
          ] = [
            user[0].user_name,
            user[0].user_title,
            user[0].position,
            user[0].avatar,
            user[0].position > 1
          ];
          if (!currentUser.isAdmin) {
            return throw404(res);
          } else {
            resolve();
          }
        });
    })
      .then(() => {
        return new Promise((resolve, reject) => {
          dbConnection
            .query('SELECT id, user_name, user_title, position FROM users WHERE banned = 0')
            .then(users => {
              // console.log( users );
              users.forEach((item, index) => {
                // console.log( item );
                item.i = index + 1;
                if (item.position === 0) {
                  item.textPos = 'User';
                } else if (item.position === 1) {
                  item.textPos = 'Moderator';
                } else if (item.position === 2) {
                  item.textPos = 'Administrator';
                } else if (item.position === 3) {
                  item.textPos = 'Main Administrator';
                }
              });
              console.log(users);
              return res.render('dashboard_admin', {
                title   : 'Admins panel', user: currentUser, users: users,
                username: currentUser, isRequest: isRequest, friendsNotification: numberOfRequests
              });
            });
        });
      });
  } else {
    return throw404(res);
  }
});

dashboard.get('/verify', (req, res, next) => {
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
  if (sess.userName !== undefined) {
    let currentUser = {name: sess.userName},
        objects     = [];
    return new Promise((resolve, reject) => {
      dbConnection
        .query('SELECT user_name, user_title, avatar, position FROM users WHERE user_name = ? or email = ? and banned = 0', [
          currentUser.name, currentUser.name
        ])
        .then(user => {
          [
            currentUser.username,
            currentUser.avatar,
            currentUser.title,
            currentUser.position,
            currentUser.privilege,
            currentUser.isAdmin
          ] = [
            user[0].user_name,
            user[0].avatar,
            user[0].user_title,
            user[0].position,
            user[0].position > 0,
            user[0].position > 1
          ];
          resolve();
        })
        .catch(error => console.error(error));
    })
      .then(() => {
        return new Promise(resolve => {
          dbConnection
            .query('SELECT id, user_name as name, user_title as title, verified FROM users WHERE banned = 0')
            .then(users => {
              if (!isEmptyObject(users)) {
                users.forEach(item => {
                  item.type   = 'user';
                  item.letter = 'p';
                });
                objects = [...objects, ...users];
              }
              resolve();
            });
        });
      })
      .then(() => {
        return new Promise(resolve => {
          dbConnection
            .query('SELECT id, group_name as name, group_title as title, verified FROM `group` WHERE banned = 0')
            .then(groups => {
              if (!isEmptyObject(groups)) {
                groups.forEach(item => {
                  item.type   = 'group';
                  item.letter = 'g';
                });
                objects = [...objects, ...groups];
              }
              resolve();
            });
        });
      })
      .then(() => {
        objects.sort((a, b) => {
          if (a.title < b.title) {
            return -1;
          }
          if (a.title > b.title) {
            return 1;
          }
          return 0;
        });
        objects.forEach((item, index) => {
          item.verified = item.verified !== 0;
          item.i        = index + 1;
        });
        console.log(objects);
        return res.render('dashboard_verification', {
          title   : 'Verification', user: currentUser, items: objects,
          username: currentUser.username, isRequest: isRequest, friendsNotification: numberOfRequests
        });
      });
  } else {
    return throw404(res);
  }
});

dashboard.get('/faq', (req, res, next) => {
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
  if (sess.userName !== undefined) {
    let currentUser = {name: sess.userName};
    return new Promise(resolve => {
      dbConnection
        .query('SELECT id, user_name, user_title, avatar, position FROM users WHERE user_name = ? or email = ? and banned = 0', [
          currentUser.name, currentUser.name
        ])
        .then(user => {
          [
            currentUser.id,
            currentUser.username,
            currentUser.avatar,
            currentUser.title,
            currentUser.position,
            currentUser.privilege,
            currentUser.isAdmin
          ] = [
            user[0].id,
            user[0].user_name,
            user[0].avatar,
            user[0].user_title,
            user[0].position,
            user[0].position > 0,
            user[0].position > 1
          ];
          resolve();
        });
    })
      .then(() => {
        dbConnection
          .query('SELECT * FROM faq')
          .then(faqs => {
            faqs.forEach((item, index) => {
              let date  = new Date(item.date);
              item.date = `${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)} ${('0' + date.getDate()).slice(-2)}.${('0' + (+date.getMonth() + 1)).slice(-2)}.${date.getFullYear()}`;
              item.i    = index + 1;
            });
            return res.render('dashboard_faq', {
              title   : 'FAQs', user: currentUser, faq: faqs,
              username: currentUser.username, isRequest: isRequest, friendsNotification: numberOfRequests
            });
          });
      });
  } else {
    return res.redirect('/');
  }
});

dashboard.post('/faq/new', urlencodedParser, (req, res, next) => {
  sess = req.session;
  if (sess.userName !== undefined) {
    let title = req.body.title,
        desc  = req.body.desc;
    console.log(title, desc);
    dbConnection
      .query('INSERT INTO faq (title, description) values (?, ?)', [
        title, desc
      ])
      .then(() => {
        dbConnection
          .query('SELECT id FROM faq WHERE title = ? and description =?', [
            title, desc
          ])
          .then(id => {
            return res.send(JSON.stringify({
              title: title, desc: desc, id: id[0].id
            }));
          });
      });
  }
});

dashboard.post('/faq/remove', urlencodedParser, (req, res, next) => {
  console.log(req.body);
  sess = req.session;
  if (sess.userName !== undefined) {
    let id = +req.body.id;
    dbConnection
      .query('SELECT * FROM faq WHERE id = ?', [id])
      .then(result => {
        if (isEmptyObject(result)) {
          return res.send(JSON.stringify({
            status: 'F', text: 'FAQ does not exist ☹️'
          }));
        }
        dbConnection
          .query('DELETE FROM faq WHERE id = ?', [id])
          .then(() => res.send(JSON.stringify({
            status: 'S', text: 'FAQ removed successful!'
          })));
      });
  }
});

dashboard.post('/verification', urlencodedParser, (req, res, next) => {
  console.log(req.body);
  sess = req.session;
  if (sess.userName !== undefined) {
    return new Promise(resolve => {
      dbConnection
        .query('SELECT position FROM users WHERE user_name = ? or email = ? and banned = 0', [
          sess.userName, sess.userName
        ])
        .then(pos => {
          if (pos[0].position < 1) {
            return res.send('You have no permission for this action!');
          }
          resolve();
        });
    })
      .then(() => {
        let table = req.body.type === 'user' ? 'users' : '`group`';
        dbConnection
          .query('SELECT verified FROM ' + table + ' WHERE id = ? and banned = 0', [+req.body.id])
          .then(result => {
            if (isEmptyObject(result)) {
              return res.send('Group not found...');
            }
            if (!result[0].verified) {
              dbConnection
                .query('UPDATE ' + table + ' SET verified = 1 WHERE id = ?', [+req.body.id])
                .then(() => res.send('Verified successful!'));
            } else {
              dbConnection
                .query('UPDATE ' + table + ' SET verified = 0 WHERE id = ?', [+req.body.id])
                .then(() => res.send('Unverified successful!'));
            }
          });
      });
  } else {
    return res.send('You need to sign in!');
  }
});

dashboard.post('/promote/up', urlencodedParser, (req, res, next) => {
  sess = req.session;
  if (sess.userName !== undefined) {
    let currentUser  = {name: sess.userName},
        promotedUser = {id: req.body.id};
    return new Promise((resolve, reject) => {
      dbConnection
        .query('SELECT id, position FROM users WHERE user_name = ? or email = ? and banned = 0', [
          currentUser.name, currentUser.name
        ])
        .then(user => {
          if (user[0].id === +promotedUser.id) {
            return res.send(JSON.stringify({
              status: 'F', text: 'You can\'t promote your position 🤨'
            }));
          }
          if (user[0].position < 2) {
            return throw404(res);
          }
          console.log(user[0].position);
          resolve(user[0].position);
        });
    })
      .then(currentPosition => {
        dbConnection
          .query('SELECT position FROM users WHERE id = ?', promotedUser.id)
          .then(user => {
            console.log(user);
            if (currentPosition > user[0].position + 1 && user[0].position < 2) {
              dbConnection
                .query('UPDATE users SET position = position + 1 WHERE id = ?', promotedUser.id)
                .then(() => res.send(JSON.stringify({
                  status: 'S', text: 'You promote user successfully!'
                })));
            } else if (currentPosition < user[0].position) {
              return res.send(JSON.stringify({
                status: 'F',
                text  : 'You can\'t promote user\'s position whose position bigger than yours ☹️'
              }));
            } else if (currentPosition === user[0].position) {
              console.log(JSON.stringify({
                status: 'F',
                text  : 'You can\'t promote user\'s position whose position same to yours ☹️'
              }));
              return res.send(JSON.stringify({
                status: 'F',
                text  : 'You can\'t promote user\'s position whose position same to yours ☹️'
              }));
            } else {
              return res.send(JSON.stringify({
                status: 'F',
                text  : 'You have not enough permission to promote ☹️'
              }));
            }
          });
      });
  } else {
    return res.send('You need to sign in!');
  }
});

dashboard.post('/promote/down', urlencodedParser, (req, res, next) => {
  sess = req.session;
  if (sess.userName !== undefined) {
    let currentUser  = {name: sess.userName},
        promotedUser = {id: req.body.id};
    return new Promise((resolve, reject) => {
      dbConnection
        .query('SELECT id, position FROM users WHERE user_name = ? or email = ? and banned = 0', [
          currentUser.name, currentUser.name
        ])
        .then(user => {
          if (user[0].id === +promotedUser.id) {
            return res.send(JSON.stringify({
              status: 'F',
              text  : 'You can\'t reduce your position 🤨'
            }));
          }
          if (user[0].position < 2) {
            return throw404(res);
          }
          console.log(user[0].position);
          resolve(user[0].position);
        });
    })
      .then(currentPosition => {
        dbConnection
          .query('SELECT position FROM users WHERE id = ?', promotedUser.id)
          .then(user => {
            console.log(user);
            if (currentPosition > user[0].position && user[0].position !== 0) {
              dbConnection
                .query('UPDATE users SET position = position - 1 WHERE id = ?', promotedUser.id)
                .then(() => res.send(JSON.stringify({
                  status: 'S',
                  text  : 'You reduced user\'s position successfully!'
                })));
            } else if (currentPosition < user[0].position) {
              return res.send(JSON.stringify({
                status: 'F',
                text  : 'You can\'t reduce user\'s position whose position bigger than yours ☹️'
              }));
            } else if (currentPosition === user[0].position) {
              return res.send(JSON.stringify({
                status: 'F',
                text  : 'You can\'t reduce user\'s position whose position same to yours ☹️'
              }));
            } else {
              return res.send(JSON.stringify({
                status: 'F',
                text  : 'You can\'t reduce user\'s position anymore ☹️'
              }));
            }
          });
      });
  } else {
    return res.send('You need to sign in!');
  }
});

dashboard.post('/ban', urlencodedParser, (req, res, next) => {
  console.log(req.body);
  sess            = req.session;
  let currentUser = {name: sess.userName};
  if (sess.userName !== undefined) {
    return new Promise((resolve, reject) => {
      dbConnection
        .query('SELECT position FROM users WHERE user_name = ? or email = ? and banned = 0', [
          currentUser.name, currentUser.name
        ])
        .then(position => {
          currentUser.position = position[0].position;
          if (currentUser.position > 0) {
            resolve();
          } else {
            reject({
              status: 'Failed', text: 'Your have not enough permission!'
            });
          }
        });
    })
      .then(() => {
        return new Promise((resolve, reject) => {
          let sql = 'SELECT * FROM report WHERE id = ?';
          dbConnection
            .query(sql, [req.body.id])
            .then(report => {
              resolve(report[0]);
            });
        });
      })
      .then(report => {
        console.log(report);
        return new Promise((resolve, reject) => {
          if (report.type === 'post') {
            let postSql = 'UPDATE post SET banned = 1 WHERE id = ?';
            dbConnection
              .query(postSql, [report.object_id])
              .then(() => {
                removeReport(report.id)
                  .then(() => {
                    removeReport(report.id)
                      .then(() => {
                        reject({
                          status: 'Successful', text: 'Post banned successful!'
                        });
                      });
                  });
              });
          } else if (report.type === 'group') {
            let groupSql = 'UPDATE `group` SET banned = 1 WHERE id = ?';
            dbConnection
              .query(groupSql, [report.object_id])
              .then(() => {
                removeReport(report.id)
                  .then(() => {
                    reject({
                      status: 'Successful', text: 'Group banned successful!'
                    });
                  });
              });
          } else if (report.type === 'user') {
            let userSql = 'SELECT position FROM users WHERE id = ?';
            dbConnection
              .query(userSql, [report.object_id])
              .then(position => {
                if (position[0].position > currentUser.position) {
                  reject({
                    status: 'Failed',
                    text  : 'You can not ban user whose position higher than yours!'
                  });
                } else {
                  let updateSql = 'UPDATE users SET banned = 1 WHERE id = ?';
                  dbConnection
                    .query(updateSql, [report.object_id])
                    .then(() => {
                      removeReport(report.id)
                        .then(() => {
                          reject({
                            status: 'Successful',
                            text  : 'User banned successful!'
                          });
                        });
                    });
                }
              });
          }
        });
      })
      .catch(error => res.send(JSON.stringify(error)));
  }
  /**
   * @Check if reported user higher position then current
   */
});

dashboard.post('/skip', urlencodedParser, (req, res, next) => {
  console.log(req.body);
  sess = req.session;
  if (sess.userName !== undefined) {
    let currentUser = {name: sess.userName},
        userSql     = 'SELECT position FROM users WHERE user_name = ? or email = ?';
    dbConnection
      .query(userSql, [currentUser.name, currentUser.name])
      .then(position => {
        if (position[0].position > 0) {
          let deleteSql = 'DELETE FROM report WHERE id = ?';
          dbConnection
            .query(deleteSql, [req.body.id])
            .then(() => res.send('Report skipped successful!'));
        } else {
          return res.send('You have not enough permission');
        }
      });
  }
});

dashboard.post('/report/receive', urlencodedParser, (req, res, next) => {
  sess = req.session;
  if (sess.userName !== undefined) {
    let reportObject = {
          reason : req.body.reason === undefined ? 'another' : req.body.reason,
          type   : req.body.reportType,
          comment: req.body.comment,
          id     : req.body.reportId
        },
        sql          = 'INSERT INTO report (object_id, type, reason, comment) VALUES (?, ?, ?, ?)';
    console.log(reportObject);
    switch (reportObject.type) {
      case 'post':
        dbConnection
          .query(sql, [
            +reportObject.id, reportObject.type, reportObject.reason,
            reportObject.comment
          ])
          .then(() => res.send('Report sent successful. Thank you for your activity ❤️'))
          .catch(() => res.send('Report does not send ☹️'));
        break;
      case 'user':
        let userSql = 'SELECT id FROM users WHERE user_name = ?';
        dbConnection
          .query(userSql, [reportObject.id])
          .then(id => {
            dbConnection
              .query('INSERT INTO report (object_id, type, reason, comment) VALUES (?, ?, ?, ?)', [
                id[0].id, reportObject.type, reportObject.reason,
                reportObject.comment
              ])
              .then(() => res.send('Report sent successful. Thank you for your activity ❤️'))
              .catch(() => res.send('Report does not send ☹️'));
          })
          .catch(() => res.send('Report does not send ☹️'));
        break;
      case 'group':
        let groupSql = 'SELECT id FROM `group` WHERE group_name = ?';
        dbConnection
          .query(groupSql, [reportObject.id])
          .then(id => {
            dbConnection
              .query('INSERT INTO report (object_id, type, reason, comment) VALUES (?, ?, ?, ?)', [
                id[0].id, reportObject.type, reportObject.reason,
                reportObject.comment
              ])
              .then(() => {
                return res.send('Report sent successful. Thank you for your activity ❤️');
              })
              .catch(() => res.send('Report does not send ☹️'));
          })
          .catch(() => res.send('Report does not send ☹️'));
        break;
    }
  }
});

dashboard.post('/general/save', urlencodedParser, (req, res, next) => {
  console.log(req.body);
  sess = req.session;
  if (sess.userName !== undefined) {
    if (!!req.body.title && !!req.body.desc && !!req.body.email) {
      fs.writeFileSync(__dirname + '/../cfg.ini', ini.stringify(req.body));
      return res.send(JSON.stringify({
        status: 'Successful', text: 'General settings updated successful!'
      }));
    } else {
      return res.send(JSON.stringify({
        status: 'Failed', text: 'Fill all fields!'
      }));
    }
  }
});

module.exports = dashboard;