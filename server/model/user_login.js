var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Define a schema.
var userSchema = new Schema({
    user_name : String,
    password  : String,
    email     : String,
    mobile    : Number
});

var user_login = mongoose.model('user_login', userSchema);
module.exports = user_login;