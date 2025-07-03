const express = require('express');
const router = express.Router();

router.get('/', function (req, res, next) {
  res.render('signin', {
    title: 'Sign in',
  });
});

router.post('/', function (req, res, next) {
   const username = req.body.username;
  const password = req.body.password;
});
module.exports = router;