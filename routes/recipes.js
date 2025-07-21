const express = require('express');
const router = express.Router();
const multer = require('multer');
const knex = require('../db/knex');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/steps');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// 認証済みチェック用ミドルウェア
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.redirect('/signin'); // 未ログイン時はサインインページへ
}

// レシピ一覧・検索・カテゴリ絞り込み
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
       title: 'ホーム',
  user: req.user || null  ,// パスポート認証済みであれば user 情報が入る
      recipes,
      categories,
      selectedCategory: category || null
    });
  } catch (err) {
    console.error(err);
    res.send("エラーが発生しました");
  }
});

// 新しいレシピ作成フォーム表示
router.get('/new', isAuthenticated, async (req, res) => {
  try {
    const categories = await knex('categories').select('*');
    res.render('recipes/new', { categories });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading recipe creation page.');
  }
});

router.get('/my-recipes', (req, res) => {
  if (!req.session.user) return res.redirect('/signin');

  const userId = req.session.user.id;
  const sql = 'SELECT * FROM recipes WHERE user_id = ?';

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('内部エラー');
    }
    res.render('my-recipes', { recipes: results });
  });
});

// レシピ登録
router.post('/', upload.single('image'), async (req, res) => {
  const { title, description, ingredients, steps, categories } = req.body;
  const image = req.file ? req.file.filename : null;

  try {
    const [recipeId] = await knex('recipes').insert({ title, description, image });

    // 材料登録
    if (ingredients) {
      const ingredientList = ingredients.split(',').map(i => i.trim());
      for (const name of ingredientList) {
        await knex('ingredients').insert({ recipe_id: recipeId, name });
      }
    }

    // 手順登録
    if (steps) {
      const stepList = steps.split('\n').map(s => s.trim());
      for (let i = 0; i < stepList.length; i++) {
        await knex('steps').insert({
          recipe_id: recipeId,
          description: stepList[i],
          step_order: i + 1
        });
      }
    }

    // カテゴリ登録
    if (categories) {
      const categoryList = categories.split(',').map(c => c.trim());
      for (const catName of categoryList) {
        let category = await knex('categories').where({ name: catName }).first();
        if (!category) {
          const [catId] = await knex('categories').insert({ name: catName });
          category = { id: catId };
        }
        await knex('recipe_categories').insert({
          recipe_id: recipeId,
          category_id: category.id
        });
      }
    }

    res.redirect('/recipes');
  } catch (err) {
    console.error(err);
    res.status(500).send("レシピの登録中にエラーが発生しました");
  }
});

// DELETE: レシピ削除
router.post('/:id/delete', async (req, res) => {
  const recipeId = req.params.id;

  try {
    // ステップなどの関連情報も一緒に削除（必要に応じて）
    await db.query('DELETE FROM steps WHERE recipe_id = ?', [recipeId]);
    await db.query('DELETE FROM recipes WHERE id = ?', [recipeId]);
    await db.query('DELETE FROM recipes WHERE id = ? AND user_id = ?', [recipeId, req.user.id]);
  res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('サーバーエラー');
  }
});

module.exports = router;
