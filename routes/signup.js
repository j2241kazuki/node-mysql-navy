const express = require('express');
const router = express.Router();
const knex = require("../db/knex");

router.get('/', function (req, res, next) {
  res.render('signup', {
    title: 'Sign up',
  });
});

router.post('/', function (req, res, next) {
  const username = req.body.username;
  const password = req.body.password;
  const repassword = req.body.repassword;
});

module.exports = router;