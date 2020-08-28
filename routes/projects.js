var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util')
console.log(helpers)
/* GET home page. */

module.exports = (db) => {
  // start main project
  router.get('/', helpers.isLoggedIn, function (req, res, next) {
    let link = 'projects'
    let user = req.session.user
    let getData = `SELECT count(id) AS total from (SELECT DISTINCT projects.projectid as id FROM projects 
                       LEFT JOIN members ON members.projectid = projects.projectid 
                       LEFT JOIN users ON users.userid = members.userid `

    let data = []
    if (req.query.checkId && req.query.id) {
      data.push(`projects.projectid=${req.query.id}`)
    }
    if (req.query.checkName && req.query.name) {
      data.push(`projects.name ILIKE '%${req.query.name}%'`)
    }
    if (req.query.checkMember && req.query.member) {
      data.push(`members.userid=${req.query.member}`)
    }
    if (data.length > 0) {
      getData += ` WHERE ${data.join(" AND ")}`
    }
    getData += `) AS projectname`;
    console.log(getData);
    db.query(getData, (err, totaldata) => {

      if (err) return res.json(err)
      //pagination
      const url = req.url == '/' ? '/?page=1' : req.url
      const page = req.query.page || 1
      const limit = 5
      const offset = (page - 1) * limit
      const total = totaldata.rows[0].total
      const pages = Math.ceil(total / limit);

      let getData = `SELECT DISTINCT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname, ', ')
          AS member from projects
          LEFT JOIN members ON members.projectid = projects.projectid
          LEFT JOIN users ON users.userid = members.userid `

      if (data.length > 0) {
        getData += `WHERE ${data.join(' OR ')}`
      }

      getData += `GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset};`


      db.query(getData, (err, dataproject) => {
        console.log('woi', getData);
        console.log('data project', dataproject);
        if (err) return res.json(err)
        db.query(getData, (err, data) => {
          console.log('wee');
          if (err) return res.json(err)

          let getUser = `SELECT userid, concat(firstname,' ',lastname) as fullname from users`

          db.query(getUser, (err, datauser) => {
            res.render('projects/list',
              {
                url,
                link,
                page,
                pages,
                data: dataproject.rows,
                hasil: datauser.rows,
                // option: checkOption,
                login: user
              })
          })

        })

      })
    })





  });

  router.get('/add', helpers.isLoggedIn, function (req, res, next) {
    let sql = `SELECT DISTINCT userid, CONCAT (firstname, ' ' , lastname) AS fullname FROM users ORDER BY fullname`
    db.query(sql, (err, data) => {
      console.log(data.rows);
      res.render('projects/add', {
        data: data.rows,
        user: req.session.user
      })

    })
  });

  router.post('/add', helpers.isLoggedIn, function (req, res, next) {
    const {
      projectname,
      members
    } = req.body
    console.log(req.body);
    if (projectname && members) {
      const insertProject = `INSERT INTO projects (name) VALUES ('${projectname}')`

      db.query(insertProject, (err) => {
        if (err) {
          console.log(err);
          return res.status(500).json(err)
        }
        let selectMaxId = `SELECT MAX (projectid) FROM projects`

        db.query(selectMaxId, (err, data) => {
          if (err) {
            console.log('dede');
            return res.status(500).json(err)
          }
          let idMax = data.rows[0].max;
          console.log('ini id max', idMax);
          let insertMembers = `INSERT INTO members (userid, projectid) VALUES`
          console.log('ini member', members);
          if (typeof members == 'string') {
            insertMembers += `(${members}, ${idMax})`
          } else {
            let member = members.map(item => {
              return `(${item}, ${idMax})`
            }).join()

            insertMembers += `${member}`
            console.log('ini 2 member', member);
          }
          db.query(insertMembers, (err) => {

            if (err) {
              console.log(err);
              return res.status(500).json({
                error: true,
                message: err
              })
            }
            console.log('insert member', insertMembers);
            res.redirect('/projects')
          })

        })
      })
    } else {
      return res.redirect('/projects')

    }
  });

  router.get('/edit/:id', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/edit', { user: req.session.user })
  });

  router.post('/edit/:id', helpers.isLoggedIn, function (req, res, next) {
    res.redirect('/projects')
  });

  router.get('/delete/:id', helpers.isLoggedIn, function (req, res, next) {
    res.redirect('/projects')
  });
  // end main project

  // start overview

  router.get('/overview/:projectid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/overview/view', { user: req.session.user })
  });

  router.get('/activity/:projectid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/activity/view', { user: req.session.user })
  });


  // start members
  router.get('/members/:projectid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/members/list', { user: req.session.user })
  });

  router.get('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/members/add', { user: req.session.user })
  });

  router.post('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/members/${req.params.projectid}`)
  });

  router.get('/members/:projectid/edit/:memberid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/members/edit', { user: req.session.user })
  });

  router.post('/members/:projectid/edit/:memberid', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/members/${req.params.projectid}`)
  });

  router.get('/members/:projectid/delete/:memberid', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/members/${req.params.projectid}`)
  });

  // end members

  // start issues
  router.get('/issues/:projectid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/issues/list', { user: req.session.user })
  });

  router.get('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/issues/add', { user: req.session.user })
  });

  router.post('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/issues/${req.params.projectid}`)
  });

  router.get('/issues/:projectid/edit/:issueid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/issues/edit', { user: req.session.user })
  });

  router.post('/issues/:projectid/edit/:issueid', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/issues/${req.params.projectid}`)
  });

  router.get('/issues/:projectid/delete/:issueid', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/issues/${req.params.projectid}`)
  });

  // end issues


  return router;
}
