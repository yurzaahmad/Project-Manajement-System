var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util')
var bcrypt = require('bcrypt')
const saltRounds = 10;


let cekoption = {
  ID: true,
  Name: true,
  Email: true,
  Position: true,
  TypeJob: true,
  Role: true
}

module.exports = (db) => {
  /* GET users listing. */
  router.get('/', helpers.isLoggedIn, function (req, res, next) {
    let user = req.session.user
    let link = 'users'
    let result = []
    let search = ""

    if (req.query.cekid && req.query.usersId) {
      result.push(`userid = ${parseInt(req.query.usersId)}`)
    }
    if (req.query.cekname && req.query.usersName) {
      result.push(`CONCAT(users.firstname, ' ' , users.lastname) ILIKE '%${req.query.usersName}%'`)
    }
    if (req.query.cekemail && req.query.usersEmail) {
      result.push(`email = '${req.query.usersEmail}'`)
    }
    if (req.query.cekposition && req.query.usersPosition) {
      result.push(`position = '${req.query.usersPosition}'`)
    }
    if (req.query.cektype && req.query.userstype) {
      result.push(`type = ${req.query.userstype}`)
    }
    if (result.length > 0) {
      search += ` WHERE ${result.join(" AND ")}`
    }

    let dataUser = `SELECT COUNT (userid) AS total FROM users ${search}`

    db.query(dataUser, (err, userData) => {
      // console.log('masuk', userData);
      // console.log(dataUser);
      if (err) return res.status(500).json


      //pagination
      const url = req.url == '/' ? '/?page=1' : req.url
      const page = req.query.page || 1
      const limit = 3
      // console.log('ini', page);
      const offset = (page - 1) * limit
      let total = userData.rows[0].total
      const pages = Math.ceil(total / limit);

      let sqlData = `SELECT userid, email, CONCAT(firstname, ' ' , lastname) AS fullname, position, type, role FROM users
       ${search} ORDER BY userid ASC LIMIT ${limit} OFFSET ${offset}`

      db.query(sqlData, (err, dataUser) => {
        // console.log('sqlData', sqlData);
        // console.log('dataUser', dataUser);
        if (err) return res.status(500).json

        res.render('users/list', {
          link,
          page,
          pages,
          url,
          users: dataUser.rows,
          option: cekoption,
          login: user
        })
      })
    })


  });

  router.get('/add', helpers.isLoggedIn, function (req, res, next) {
    const link = 'users';
    let user = req.session.user
    res.render('users/add', {
      user: req.session.user,
      link,
      login: user
    })
  });

  router.post('/add', helpers.isLoggedIn, function (req, res, next) {
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
      if (err) return res.send(err)
      let data = `INSERT INTO users(
        firstname, lastname, email, password, position, type, role)
        VALUES ($1, $2, $3, $4, $5, $6, $7);`
      let values = [req.body.firstName, req.body.lastName, req.body.email, hash, req.body.position, req.body.type, req.body.role]

      db.query(data, values, (err) => {
        console.log('data', data);
        console.log(values);
        if (err) return res.status(500).json
        res.redirect('/users')
      })
    })
  });

  router.post('/', helpers.isLoggedIn, function (req, res) {
    cekoption.ID = req.body.checkid;
    cekoption.Name = req.body.checkname;
    cekoption.Email = req.body.checkemail;
    cekoption.Position = req.body.checkposition;
    cekoption.TypeJob = req.body.checktype;
    cekoption.Role = req.body.checkrole;
    res.redirect('/users')
  });

  router.get('/delete/:issueid', helpers.isLoggedIn, (req, res) => {
    let id = req.params.issueid;
    let deleteData = `DELETE FROM users
    WHERE userid = ${id}`
    db.query(deleteData, (err) => {
      console.log(deleteData);
      if (err) return res.status(500).json
      res.redirect('/users')
    })
  });

  router.get('/edit/:userid', helpers.isLoggedIn, (req, res) => {
    let link = 'users';
    let user = req.session.user
    let id = req.params.userid;
    let data = `SELECT * FROM users WHERE userid = ${id}`
    console.log(data);
    db.query(data, (err, value) => {
      console.log('value', value);
      if (err) return res.status(500).json
      res.render('users/edit', {
        user: req.session.user,
        link,
        value: value.rows[0],
        login: user
      })
    })

  });

  router.post('/edit/:userid', helpers.isLoggedIn, function (req, res, next) {
    let id = req.params.userid;
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
      if (err) return res.status(500).json

      let updateData = `UPDATE users
      SET firstname=$1, lastname=$2, password=$3, position=$4, type=$5, role=$6
      WHERE userid = ${id}`

      let values = [req.body.firstName, req.body.lastName, hash, req.body.position, req.body.type, req.body.role]

      db.query(updateData, values, (err) => {
        console.log('update', updateData);
        console.log(values);
        if (err) return res.status(500).json
        res.redirect('/users')
      })
    })
  });

  return router;
}
