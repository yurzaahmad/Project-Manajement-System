var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util')

/* GET home page. */

module.exports = (db) => {

  router.get('/', helpers.isLoggedIn, function (req, res, next) {
    let user = req.session.user
    console.log(user.email);
    let sql = `SELECT * FROM users WHERE email = '${user.email}'`
    db.query(sql, (err, data) => {
      console.log(err);
      console.log(sql);
      if (err) return res.status(500).json(err)
      res.render('profile/view', {
        user: req.session.user
      })

    })
  });

  router.post('/', helpers.isLoggedIn, function (req, res, next) {
    res.redirect('/profile')
  });


  return router;
}