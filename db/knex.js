const environment = "development";
const config = require("../knexfile.js")[environment];
const knex = require("knex")(config);

const mysql = require('mysql');
module.exports = knex;
