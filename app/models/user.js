var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Link = require('./link.js');
var Session = require('./session');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  sessions: function(){
    return this.hasMany(Session);
  },
  links: function(){
    return this.hasMany(Link);
  },
  initialize: function(){
    this.on('creating', function(model, attrs, options){
      // var salt = bcrypt.genSaltSync(10);
      // model.set('salt', salt);
      // var password = model.get('password');
      // model.set('password', bcrypt.hashSync(password, salt));
    });
  }
});

module.exports = User;