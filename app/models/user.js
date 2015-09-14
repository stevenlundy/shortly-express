var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



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
      var salt = bcrypt.genSaltSync(16);
      model.set('salt', salt);
      model.set('password', bcrypt.hashSync(options.password, salt));
    });
  }
});

module.exports = User;