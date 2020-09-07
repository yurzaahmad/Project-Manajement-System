var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util')
var path = require('path');
var moment = require('moment');
console.log(helpers)
/* GET home page. */

let checkOption = {
  id: true,
  name: true,
  member: true
}
let optionMember = {
  id: true,
  name: true,
  position: true
}
let optionIssues = {
  issueid: true,
  subject: true,
  tracker: true,
  description: true
}

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
      data.push(`projects.name ILIKE '${req.query.name}'`)
    }
    if (req.query.checkMember && req.query.member) {
      data.push(`members.userid=${req.query.member}`)
    }
    if (data.length > 0) {
      getData += ` WHERE ${data.join(" AND ")}`
    }
    getData += `) AS projectname`;
    // console.log('search', getData);
    db.query(getData, (err, totaldata) => {
      // console.log( totaldata.rows);
      if (err) return res.json(err)
      //pagination
      const url = req.url == '/' ? '/?page=1' : req.url
      const page = req.query.page || 1
      const limit = 3
      // console.log(page);
      const offset = (page - 1) * limit
      const total = totaldata.rows[0].total
      const pages = Math.ceil(total / limit);

      let getData = `SELECT DISTINCT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname, ', ')
          AS member from projects
          LEFT JOIN members ON members.projectid = projects.projectid
          LEFT JOIN users ON users.userid = members.userid `

      if (data.length > 0) {
        getData += `WHERE ${data.join(' OR ')}`
        // console.log(getData);
      }

      getData += `GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset};`
      // console.log(getData);


      db.query(getData, (err, dataproject) => {
        // console.log(getData);
        // console.log('data project', dataproject);
        if (err) return res.json(err)
        db.query(getData, (err, data) => {
          // console.log('wee');
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
                option: checkOption,
                login: user
              })
          })

        })

      })
    })





  });

  router.post('/option', helpers.isLoggedIn, (req, res) => {
    checkOption.id = req.body.checkid;
    checkOption.name = req.body.checkname;
    checkOption.member = req.body.checkmember;
    res.redirect('/projects')
  })

  router.get('/add', helpers.isLoggedIn, function (req, res, next) {
    let user = req.session.user
    let sql = `SELECT DISTINCT userid, CONCAT (firstname, ' ' , lastname) AS fullname FROM users ORDER BY fullname`
    db.query(sql, (err, data) => {
      console.log(data.rows);
      res.render('projects/add', {
        data: data.rows,
        user: req.session.user,
        login: user
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
            console.log(member);
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

  router.get('/edit/:projectid', helpers.isLoggedIn, (req, res) => {
    let user = req.session.user
    // console.log('wed');
    let projectid = req.params.projectid
    let links = 'projects'
    let sql = `SELECT projects.name from projects WHERE projectid = ${projectid}`
    db.query(sql, (err, data) => {
      if (err) return res.status(500).json
      let nameProject = data.rows[0]
      let sqlMember = `SELECT DISTINCT (userid), concat(firstname, ' ', lastname) AS fullname from users`
      db.query(sqlMember, (err, member) => {
        if (err) return res.status(500).json
        let members = member.rows;
        // console.log(members);
        let sqlMember = `SELECT members.userid, projects.name, projects.projectid FROM members LEFT JOIN projects ON members.projectid = projects.projectid WHERE projects.projectid = ${projectid};`
        db.query(sqlMember, (err, dataMembers) => {
          // console.log('ini', dataMembers);
          if (err) return res.status(500).json({
            error: true,
            message: err
          })
          let dataMember = dataMembers.rows.map(item => item.userid)
          res.render('projects/edit', {
            dataMember,
            nameProject,
            members,
            links,
            user: req.session.user,
            login: user
          })
        })
      })
    })
  });

  router.post('/edit/:projectid', helpers.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    const {
      projectname,
      editmembers
    } = req.body
    console.log(req.body);

    let sqlProjectname = `UPDATE projects SET name = '${projectname}' WHERE projectid = ${projectid}`
    console.log(sqlProjectname);
    if (projectid && projectname && editmembers) {
      console.log('iki', sqlProjectname);
      db.query(sqlProjectname, (err) => {
        console.log(err);
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        let sqlDeletemember = `DELETE FROM members WHERE projectid = ${projectid}`

        db.query(sqlDeletemember, (err) => {
          console.log('ini', sqlDeletemember);
          if (err) return res.status(500).json({
            error: true,
            message: err
          })
          let result = [];

          if (typeof editmembers == 'string') {
            result.push(`(${editmembers}, ${projectid})`);
          } else {
            for (let i = 0; i < editmembers.length; i++) {
              result.push(`(${editmembers[i]}, ${projectid})`);
            }
          }
          console.log(result);
          let sqlUpdate = `INSERT INTO members (userid, projectid) VALUES ${result.join(",")}`

          db.query(sqlUpdate, (err) => {
            if (err) return res.status(500).json({
              error: true,
              message: err
            })
            res.redirect('/projects')
          })
        })
      })
    } else {
      res.redirect(`/projects`)
    }
  });

  router.get('/delete/:projectid', helpers.isLoggedIn, function (req, res, next) {
    let projectid = parseInt(req.params.projectid)

    let deletemember = `DELETE FROM members WHERE projectid = ${projectid}`
    console.log(deletemember);
    db.query(deletemember, (err) => {
      console.log(err)
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      let deleteProject = `DELETE FROM projects WHERE projectid = ${projectid}`
      console.log(deleteProject);
      db.query(deleteProject, err => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        res.redirect('/projects')
      })
    })
  });
  // end main project

  // start overview

  router.get('/overview/:projectid', helpers.isLoggedIn, function (req, res, next) {
    // console.log('masuk');
    let user = req.session.user
    let projectid = req.params.projectid
    let sql = `SELECT * FROM projects WHERE projectid = ${projectid}`

    db.query(sql, (err, data) => {
      // console.log(sql);
      // console.log(data);
      if (err) return res.status(500).json
      let nameProject = data.rows[0]

      let sqlMembers = `SELECT users.firstname, users.lastname, members.role FROM members
      LEFT JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid}`

      db.query(sqlMembers, (err, member) => {
        console.log(member);
        console.log(sqlMembers);
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        let members = member.rows;

        let sqlIssues = `SELECT tracker, status FROM issues WHERE projectid = ${projectid}`

        db.query(sqlIssues, (err, dataIssue) => {
          if (err) return res.status(500).json({
            error: true,
            message: err
          })

          let bugOpen = 0;
          let bugTotal = 0;
          let featureOpen = 0;
          let featureTotal = 0;
          let supportOpen = 0;
          let supportTotal = 0;

          dataIssue.rows.forEach(item => {
            if (item.tracker == 'Bug' && item.status !== "closed") {
              bugOpen += 1
            }
            if (item.tracker == 'Bug') {
              bugTotal += 1
            }
          })
          dataIssue.rows.forEach(item => {
            if (item.tracker == 'Feature' && item.status !== "closed") {
              featureOpen += 1
            }
            if (item.tracker == 'Feature') {
              featureTotal += 1
            }
          })
          dataIssue.rows.forEach(item => {
            if (item.tracker == 'Support' && item.status !== "closed") {
              supportOpen += 1
            }
            if (item.tracker == 'Support') {
              supportTotal += 1
            }
          })
          console.log('masuk2');
          res.render('projects/overview/view', {
            user: req.session.user, projectid,
            projectid,
            nameProject,
            members,
            bugOpen,
            bugTotal,
            featureOpen,
            featureTotal,
            supportOpen,
            supportTotal,
            login: user
          })

        })
      })
    })
  });

  router.get('/activity/:projectid', helpers.isLoggedIn, function (req, res, next) {
    // console.log('masuk');
    let user = req.session.user
    const links = 'projects';
    const url = 'activity';
    const projectid = req.params.projectid

    let projectData = `SELECT * FROM projects WHERE projectid=${projectid}`
    db.query(projectData, (err, dataProject) => {
      // console.log(dataProject);
      if (err) return res.send(err)

      let project = dataProject.rows[0]
      let sqlActivity = `SELECT activity.*, CONCAT(users.firstname,' ', users.lastname) AS author,
      (time AT TIME ZONE 'Asia/Jakarta'):: time AS timeactivity,
      (time AT TIME ZONE 'Asia/Jakarta'):: date AS dateactivity
      FROM activity
      LEFT JOIN users ON activity.author = users.userid WHERE projectid = ${projectid}
      ORDER BY dateactivity DESC, timeactivity DESC`

      db.query(sqlActivity, (err, dataActivity) => {
        console.log(sqlActivity);
        console.log(dataActivity);
        if (err) return res.status(500).json

        let activity = dataActivity.rows;

        activity.forEach(item => {
          item.dateactivity = moment(item.dateactivity).format('YYYY-MM-DD');
          item.timeactivity = moment(item.timeactivity, 'HH:mm:ss.SSS').format('HH.mm.ss');

          if (item.dateactivity == moment().format('YYYY-MM-DD')) {
            item.dateactivity = 'Today'
          } else if (item.dateactivity == moment().subtract(1, 'days').format('YYYY-MM-DD')) {
            item.dateactivity = 'Yesterday'
          } else {
            item.dateactivity = moment(item.dateactivity).format("MMMM Do, YYYY")
          }
        })
        res.render('projects/activity/view', {
          user: req.session.user,
          links,
          url,
          projectid,
          project,
          moment,
          activity,
          login: user
        })

      })
    })
  });

  router.post('/members/:projectid/option', helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid;
    optionMember.id = req.body.checkid;
    optionMember.name = req.body.checkname;
    optionMember.position = req.body.checkposition;
    res.redirect(`/projects/members/${projectid}`)
  })



  // start members
  router.get('/members/:projectid', helpers.isLoggedIn, function (req, res, next) {
    let link = 'projects'
    let projectid = req.params.projectid
    let user = req.session.user
    console.log('woi');
    let sqlFilter = `SELECT count (member) AS total from (SELECT members.userid FROM members 
                     JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid} `;

    let result = []
    if (req.query.checkId && req.query.id) {
      result.push(`members.id = ${req.query.id} `)
    }
    if (req.query.checkName && req.query.name) {
      result.push(`CONCAT(users.firstname, ' ' , users.lastname) ILIKE '${req.query.name}'`)
    }
    if (req.query.checkPosition && req.query.position) {
      result.push(`users.position=${req.query.position}`)
    }
    if (result.length > 0) {
      sqlFilter += ` AND ${result.join(" AND ")}`
    }
    sqlFilter += `) AS member`;
    // console.log('search', sqlFilter);
    db.query(sqlFilter, (err, totaldata) => {
      // console.log('ini', totaldata);
      if (err) return res.json(err)
      //pagination
      const url = req.url == '/' ? '/?page=1' : req.url
      const page = req.query.page || 1
      const limit = 3
      // console.log('ini', page);
      const offset = (page - 1) * limit
      const total = totaldata.rows[0].total
      const pages = Math.ceil(total / limit);

      let sqlFilter = `SELECT users.userid, projects.name, projects.projectid, members.id, members.role, 
      concat (users.firstname || ' ' || users.lastname, ' ')
          AS fullname from members
          LEFT JOIN projects ON projects.projectid = members.projectid
          LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = ${projectid} `

      if (result.length > 0) {
        sqlFilter += `AND ${result.join(' AND ')}`
        // console.log(getData);
      }

      sqlFilter += `ORDER BY members.id ASC LIMIT ${limit} OFFSET ${offset};`


      // console.log(sqlFilter);
      db.query(sqlFilter, (err, dataproject) => {
        // console.log(getData);
        // console.log('data project', dataproject);
        if (err) return res.json(err)

        let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`

        db.query(sqlProject, (err, dataProject) => {
          // console.log( dataProject);
          if (err) return res.status(500).json({
            error: true,
            message: err
          })
          res.render('projects/members/list',
            {
              url,
              link,
              page,
              projectid,
              pages,
              user,
              project: dataProject.rows[0],
              data: dataproject.rows,
              option: optionMember,
              login: user
            })
        })



      })
    })





  });

  router.get('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    let user = req.session.user
    let sql = `SELECT DISTINCT userid, CONCAT (firstname, ' ' , lastname) AS fullname FROM users ORDER BY fullname`
    db.query(sql, (err, data) => {
      // console.log(data.rows);
      console.log("popo");
      res.render('projects/members/add', {
        data: data.rows,
        user: req.session.user,
        login: user
      })

    })
  });

  router.post('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    const {
      inputmember,
      inputposition
    } = req.body
    console.log(req.body);
    let sql = `INSERT INTO members (userid, role, projectid) VALUES ($1, $2, $3)`

    let insertMembers = [inputmember, inputposition, projectid]
    db.query(sql, insertMembers, (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json(err)
      }

      res.redirect(`/projects/members/${projectid}`)

    })

  });

  router.post('/members/:projectid/edit/:id', helpers.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    let id = req.params.id
    let position = req.body.inputposition
    let sql = `UPDATE members SET role='${position}' WHERE id = ${id}`
    db.query(sql, (err) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      res.redirect(`/projects/members/${projectid}`)
    })
  });

  router.get('/members/:projectid/edit/:id', helpers.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    let id = req.params.id
    let user = req.session.user

    let sqlMember = `SELECT id, role, CONCAT(firstname,' ',lastname) AS fullname FROM members
    LEFT JOIN users ON members.userid = users.userid WHERE projectid = ${projectid} AND id = ${id};`
    db.query(sqlMember, (err, dataMember) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
      db.query(sqlProject, (err, dataProject) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        res.render('projects/members/edit', {
          login: req.session.user,
          projectid,
          id,
          member: dataMember.rows[0],
          project: dataProject.rows[0]
        })
      })
    })
    // res.redirect(`/projects/members/${req.params.projectid}`)
  });

  router.get('/members/:projectid/delete/:id', helpers.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    let id = req.params.id

    let deleteMember = `DELETE FROM members WHERE projectid = ${projectid} AND id = ${id};`
    db.query(deleteMember, (err) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      res.redirect(`/projects/members/${projectid}`)
    })
  });

  // end members

  // start issues
  router.get('/issues/:projectid', helpers.isLoggedIn, function (req, res, next) {
    // console.log('masuk');
    let link = 'projects'
    let user = req.session.user
    let projectid = req.params.projectid
    let dataissues = `SELECT issueid, subject, tracker, description, projects.projectid, projects.name FROM issues
    LEFT JOIN projects ON issues.projectid = projects.projectid WHERE projects.projectid = ${projectid}`

    db.query(dataissues, (err, data) => {
      // console.log(dataissues);
      // console.log(data);
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      let dataproject = data.rows
      // console.log(dataproject);
      res.render('projects/issues/list', {
        dataproject,
        user: req.session.user,
        data: data.rows,
        login: user,
        option: optionIssues,
        link,
        projectid
      })

    })
  });

  router.post('/issues/:projectid/option', helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid;

    optionIssues.issueid = req.body.checkid;
    optionIssues.subject = req.body.checkname;
    optionIssues.tracker = req.body.checktracker;
    optionIssues.description = req.body.checkdescription;
    res.redirect(`/projects/issues/${projectid}`)
  })

  router.get('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    let user = req.session.user
    let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
    db.query(sqlProject, (err, dataproject) => {
      // console.log('masuk', dataproject);
      if (err) return res.status(500).json
      let sqlMember = `SELECT users.userid, CONCAT(users.firstname,' ', users.lastname) AS fullname FROM members
      LEFT JOIN users ON members.userid = users.userid WHERE projectid = ${projectid}`
      // console.log(sqlMember);
      db.query(sqlMember, (err, datamember) => {
        // console.log('lagi', datamember.rows[0]);
        // console.log(datamember);
        if (err) return res.status(500).json
        res.render('projects/issues/add', {
          user: req.session.user,
          projectid,
          project: dataproject.rows[0],
          member: datamember.rows,
          login: user
        })
      })
    })
  });

  router.post('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid;
    let user = req.session.user;

    //issues by file
    if (req.files) {
      let file = req.files.file;

      let fileName = file.name.toLowerCase().replace('', Date.now()).split().join("-")

      let sqlIssues = `INSERT INTO public.issues(
        projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, files, author, cracteddate)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW());`

      let values = [projectid, req.body.tracker, req.body.subject, req.body.description, req.body.status, req.body.priority, parseInt(req.body.assignee), req.body.startDate, req.body.dueDate, parseInt(req.body.estimatedTime), parseInt(req.body.done), fileName, user.userid]

      db.query(sqlIssues, values, (err) => {
        console.log(sqlIssues);
        console.log(values);
        if (err) return res.status(500).json({
          error: true,
          message: error
        })
        file.mv(path.join(__dirname, "..", "public", "upload", fileName), function (err) {
          if (err) return res.status(500).send(err)
          res.redirect(`/projects/issues/${req.params.projectid}`)
        })
      })
    } else {
      let sqlIssues = `INSERT INTO public.issues(
        projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author, cracteddate)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW());`

      let values = [projectid, req.body.tracker, req.body.subject, req.body.description, req.body.status, req.body.priority, parseInt(req.body.assignee), req.body.startDate, req.body.dueDate, parseInt(req.body.estimatedTime), parseInt(req.body.done), user.userid]

      db.query(sqlIssues, values, (err) => {
        console.log(sqlIssues);
        console.log(values);
        if (err) return res.status(500).json({
          error: true,
          message: error
        })
        res.redirect(`/projects/issues/${req.params.projectid}`)
      })
    }
  });

  router.get('/issues/:projectid/edit/:issueid', helpers.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    let issueid = req.params.issueid
    const link = 'project'
    const url = 'issues'
    let user = req.session.user

    let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
    db.query(sqlProject, (err, dataproject) => {
      // console.log(dataproject);
      // console.log(sqlProject);
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      let project = dataproject.rows[0]

      let sqlputMember = `SELECT issues.*, CONCAT(users.firstname,' ',users.lastname) AS authorname FROM issues
    LEFT JOIN users ON issues.author=users.userid WHERE projectid= ${projectid} AND issueid= ${issueid}`
      db.query(sqlputMember, (err, data) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        let issue = data.rows[0]
        // console.log(issue.authorname);
        let sqleditMember = `SELECT users.userid, CONCAT(users.firstname, ' ' , users.lastname) As fullname FROM members 
        LEFT JOIN users ON members.userid = users.userid WHERE projectid= ${projectid}`
        db.query(sqleditMember, (err, dataIssues) => {
          console.log(dataIssues);
          console.log(sqleditMember);
          if (err) return res.status(500).json({
            error: true,
            message: err
          })
          let member = dataIssues.rows
          sqlgetEdit = `SELECT issueid, subject, tracker FROM issues WHERE projectid = ${projectid}`
          db.query(sqlgetEdit, (err, dataEdit) => {
            // console.log('wkwk', sqlgetEdit);
            if (err) return res.status(500).json({
              error: true,
              message: err
            })
            let edit = dataEdit.rows
            console.log('project', project);
            console.log('issues', issue);
            console.log('member', member);
            console.log(edit);
            res.render('projects/issues/edit', {
              moment,
              user: req.session.user,
              projectid,
              issueid,
              project,
              issue,
              member,
              edit,
              link,
              url,
              login: user
            })
          })
        })

      })
    })
  });

  router.post('/issues/:projectid/edit/:issueid', helpers.isLoggedIn, function (req, res, next) {
    console.log('masuk');
    let projectid = req.params.projectid
    let issueid = req.params.issueid
    let user = req.session.user
    let formEdit = req.body
    let title = `${formEdit.subject} #${issueid} (${formEdit.tracker}) - [${formEdit.status}]`
    let desc = `Spent Time by Hours : from ${formEdit.oldspent} updated to ${formEdit.spenttime}`
    let dataActivity = `INSERT INTO activity (time, title, description, author, projectid, olddone, nowdone) VALUES (NOW(), $1, $2, $3, $4, $5, $6)`
    let value = [title, desc, user.userid, projectid, formEdit.olddone, formEdit.done]


    if (req.files) {
      let file = req.files.file

      let fileName = file.name.toLowerCase().replace("", Date.now()).split(" ").join("-")

      let sqlupdate = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assignee = $5, duedate = $6, done = $7, parenttask = $8, spenttime = $9, targetversion = $10
       WHERE issueid = $11`

      let values = [formEdit.subject, formEdit.description, formEdit.status, formEdit.priority, parseInt(formEdit.assignee), formEdit.dueDate, parseInt(formEdit.done),
      parseInt(formEdit.perenttask), parseInt(formEdit.spenttime), formEdit.target, issueid
      ]

      console.log('nilai', values)
      console.log('sqlupdatenya', sqlupdate)

      db.query(sqlupdate, values, (err) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        console.log('here');
        file.mv(path.join(__dirname, "..", "public", "upload", fileName), function (err) {
          if (err) return res.status(500).send(err)

          db.query(dataActivity, value, (err) => {
            if (err) return res.status(500).json
          })
          res.redirect(`/projects/issues/${req.params.projectid}`)
        })
      })
    } else {
      let sqlupdated = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assignee = $5, duedate = $6, done = $7,
      parenttask = $8, spenttime =$9, targetversion = $10 WHERE issueid = $11`
      let values = [formEdit.subject, formEdit.description, formEdit.status, formEdit.priority, parseInt(formEdit.assignee), formEdit.dueDate, parseInt(formEdit.done),
      parseInt(formEdit.perenttask), parseInt(formEdit.spenttime), formEdit.target, issueid
      ]
      console.log('nih', sqlupdated);
      console.log('nilainya', values);
      db.query(sqlupdated, values, (err) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        db.query(dataActivity, value, (err) => {
          console.log('activity', dataActivity);
          console.log(value);
          if (err) return res.status(500).json
        })
        res.redirect(`/projects/issues/${req.params.projectid}`)
      })
    }
  });

  router.get('/issues/:projectid/delete/:issueid', helpers.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    let issueid = req.params.issueid

    let sqldelete = `DELETE FROM issues WHERE issueid = ${issueid}`

    db.query(sqldelete, (err) => {
      console.log(sqldelete);
      if (err) return res.status(500).json
      res.redirect(`/projects/issues/${req.params.projectid}`)
    })
  });

  // end issues


  return router;
}
