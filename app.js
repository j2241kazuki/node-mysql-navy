const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport'); // passport本体
const initializePassport = require('./config/passport'); // 自作の初期化関数
const methodOverride = require('method-override');

// ルーター
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const recipesRouter = require('./routes/recipes');
const signinRouter = require('./routes/signin');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ミドルウェア
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// セッション設定
app.use(session({
  secret: 'your_secret',
  resave: false,
  saveUninitialized: false
}));

//メソッドオーバーライドの設定
app.use(methodOverride('_method'));

initializePassport(passport);  // ここで初期化関数を呼ぶ
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Passportの初期化
initializePassport(passport); // 自作のpassport設定（strategyとか）
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.isAuth = req.isAuthenticated ? req.isAuthenticated() : false;
  next();
});

// ルーティング
app.use('/', indexRouter);
app.use('/signin', signinRouter);
app.use('/users', usersRouter);
app.use('/recipes', recipesRouter);

// 404エラー
app.use(function(req, res, next) {
  next(createError(404));
});

// エラーハンドラ
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error'); // passportはこのキーを使用する
  next();
});

app.use((req, res, next) => {
  res.locals.isAuth = req.session.userId != null;
  next();
});

module.exports = app;