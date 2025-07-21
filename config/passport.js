const LocalStrategy = require("passport-local").Strategy;
const knex = require("../db/knex");
const bcrypt = require("bcrypt");

module.exports = function(passport) {
  passport.use(new LocalStrategy({
    usernameField: "username",
    passwordField: "password"
  }, async (username, password, done) => {
    try {
      const users = await knex("users").where({ username });
      if (users.length === 0) {
        return done(null, false, { message: "Incorrect username." });
      }

      const user = users[0];

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, { message: "Incorrect password." });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const users = await knex("users").where({ id });
      done(null, users[0]);
    } catch (err) {
      done(err);
    }
  });
};