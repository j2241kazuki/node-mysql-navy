const environment = "development";
const config = require("../knexfile.js")[environment];
const knex = require("knex")(config);

module.exports = knex;
const mysql = require('mysql');
knex("tasks").select("*");
module.exports = knex;
