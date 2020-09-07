var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt')

/* GET home page. */

module.exports = (db) => {

  router.get('/', function (req, res, next) {
    res.render('login', { loginInfo: req.flash('loginInfo') })
  });

  router.post('/login', function (req, res, next) {
    const { email, password } = req.body
    console.log(req.body);
    db.query('SELECT * FROM users WHERE email = $1', [email], (err, data) => {
      if (err) {
        console.log(err);
        req.flash('loginInfo', 'something wrong, please call administrator')
        return res.redirect('/')
      }
      console.log(data);
      if (data.rows.length == 0) {
        console.log(err);
        req.flash('loginInfo', 'email or password wrong')
        return res.redirect('/')
      }

      bcrypt.compare(password, data.rows[0].password, function (err, isValid) {
        if (err) {
          console.log(err);
          req.flash('loginInfo', 'something wrong, please call administrator')
          return res.redirect('/')
        }

        if (!isValid) {
          req.flash('loginInfo', 'email or password wrong')
          return res.redirect('/')
        }
        console.log('dilogin post')
        req.session.user = data.rows[0]
        console.log(req.session.user)
        res.redirect('/projects')

      });
    });
  });

  router.get('/logout', function (req, res, next) {
    req.session.destroy(function (err) {
      if (err) return res.send(err)
      res.redirect('/')
    })
  });

  return router;
}
