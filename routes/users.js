var express = require('express');
var router = express.Router();

const passport = require('passport');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// ログイン画面を表示
router.get('/signin', (req, res) => {
  res.render('signin'); // views/signin.ejs を表示
});

// ログイン処理
router.post('/signin',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/users/signin',
    failureFlash: true
  })
);

// ログアウト
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

module.exports = router;
