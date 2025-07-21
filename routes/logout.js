const express = require('express');
const router = express.Router();

router.get('/', function (req, res, next) {
  req.logout();
  res.redirect("/");
});
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).send('ログアウトに失敗しました');
    }
    res.redirect('/signin'); // ログアウト後はサインイン画面へリダイレクト
  });
});

module.exports = router;