const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcrypt'); // 忘れずに
const knex = require('../db/knex');
const passport = require('passport');
const upload = multer({ dest: 'public/uploads/' });

// 複数ファイル＋1枚の全体画像対応（"stepsImages" は配列）
const cpUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'stepsImages' } // 複数受け取り
]);

// 認証済みチェック用ミドルウェア
function isAuthenticated(req, res, next) {
  if (req.user) return next();
  res.redirect('/signin');
}

// レシピ一覧・検索
router.get('/', async (req, res) => {
  const { q, category } = req.query;

  let query = knex('recipes')
    .select('recipes.*', 'categories.name as category')
    .leftJoin('recipe_categories', 'recipes.id', 'recipe_categories.recipe_id')
    .leftJoin('categories', 'recipe_categories.category_id', 'categories.id');

  if (q) query.where('recipes.title', 'like', `%${q}%`);
  if (category) query.where('categories.id', category);

  try {
    const recipes = await query;
    const categories = await knex('categories').select('*');

    res.render('index', {
      title: 'レシピ一覧',
      recipes,
      categories,
      selectedCategory: category,
      user: req.user || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('エラーが発生しました');
  }
});

// 新しいレシピ作成フォーム表示
router.get('/new', isAuthenticated, async (req, res) => {
  try {
    const categories = await knex('categories').select('*');
    res.render('recipes/new', {
      categories,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('エラーが発生しました');
  }
});

router.get('/dashboard', isAuthenticated, (req, res) => {
  res.send(`ログイン成功！ようこそ、${req.user.username}さん`);
});

router.get('/signup', (req, res) => {
  res.render('signup', { 
    title: 'Sign Up',
    user: req.user || null,
    isAuth: req.isAuthenticated ? req.isAuthenticated() : false,
    errorMessages: req.flash('error')
  });
});


// レシピ登録
router.post('/', cpUpload, async (req, res) => {
  const { title, description, ingredients, steps: stepsRaw, category } = req.body;

  const mainImage = req.files['image'] ? req.files['image'][0].filename : null;
  const stepImages = req.files['stepsImages'] || [];

  try {
    // レシピ本体を登録
    const [recipeId] = await knex('recipes').insert({
      title,
      description,
      image: mainImage,
      user_id: req.user.id
    });

    // 材料処理（任意）
    if (ingredients) {
      const ingredientList = ingredients.split(',').map(i => i.trim());
      for (const name of ingredientList) {
        await knex('ingredients').insert({ recipe_id: recipeId, name });
      }
    }

    // 手順の処理（stepsRaw は配列またはオブジェクト配列）
    if (stepsRaw && Array.isArray(stepsRaw)) {
      for (let i = 0; i < stepsRaw.length; i++) {
        const description = stepsRaw[i].description || '';
        const image = stepImages[i] ? stepImages[i].filename : null;

        await knex('steps').insert({
          recipe_id: recipeId,
          description,
          step_order: i + 1,
          image // 🔸 image カラムが必要
        });
      }
    }

    // カテゴリ（単数セレクトなので1つだけ処理）
    if (category) {
      await knex('recipe_categories').insert({
        recipe_id: recipeId,
        category_id: category
      });
    }

    res.redirect('/recipes');
  } catch (err) {
    console.error(err);
    res.status(500).send('レシピの登録中にエラーが発生しました');
  }
});


// レシピ削除
router.post('/:id/delete', isAuthenticated,async (req, res) => {
  const recipeId = req.params.id;

  try {
    // 手順を削除
    await knex('steps').where({ recipe_id: recipeId }).del();

    // 材料を削除
    await knex('ingredients').where({ recipe_id: recipeId }).del();

    // 中間テーブル（カテゴリ）削除
    await knex('recipe_categories').where({ recipe_id: recipeId }).del();

    // レシピ本体を削除
    await knex('recipes').where({ id: recipeId }).del();

    res.redirect('/recipes'); // レシピ一覧に戻る
  } catch (err) {
    console.error(err);
    res.status(500).send('サーバーエラー: ' + err.message);
  }
});
//signin ページ表示
router.post('/signin', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/signin',
  failureFlash: true 
}));

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await knex("users").insert({ email, password: hashedPassword });

    //自動ログイン
    const users = await knex("users").where({ email });
    const user = users[0];
    req.login(user, (err) => {
      if (err) {
        console.error("Login error after signup:", err);
        return res.redirect("/signin");
      }
      return res.redirect("/"); // ← 👈 ホームにリダイレクト
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.redirect("/signup");
  }
});

// ログアウト
router.post('/logout', (req, res) => {
  req.logout?.(() => {}); // passport があれば
  req.session.destroy(err => {
    if (err) console.error(err);
    res.clearCookie('connect.sid');
    res.redirect('/signin');
  });
});

module.exports = router;
