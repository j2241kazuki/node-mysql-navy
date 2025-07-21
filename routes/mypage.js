router.get('/mypage', (req, res) => {
  if (!req.user) {
    return res.redirect('/signin');
  }

  connection.query(
    'SELECT * FROM recipes WHERE user_id = ?',
    [req.user.id],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).send('DBエラー');
      }

      res.render('mypage', { user: req.user, recipes: results });
    }
  );
});