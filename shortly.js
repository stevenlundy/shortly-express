var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var Session = require('./session');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
// Session Management
app.use(session({secret:'The cake is a lie.'}));

app.get('/', util.restrict,
function(req, res) {
  res.render('index');
});

app.get('/login', 
function(req, res) {
  res.render('login');
});

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.get('/create', util.restrict,
function(req, res) {
  res.render('index');
});

app.get('/links', util.restrict,
function(req, res) {

  var userId = util.getUserId(req);

  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  var userId = util.getUserId(req);

  new Link({ url: uri, user_id: userId }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          base_url: req.headers.origin,
          user_id: userId
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});

app.post('/signup',
function(req, res) {
  new User({username: req.body.username }).fetch().then(function(found) {
    if(found){
      res.send(400, 'Username already taken');
    } else {
      Users.create({
        username: req.body.username
      }, {
        password: req.body.password
      })
      .then(function(newUser){
        // add sessionId with newUser.get('id')
        return res.redirect('/');
      });
    }
  })
});

app.post('/login',
function(req, res) {
  new User({username: req.body.username }).fetch().then(function(found) {
    if(!found){
      res.redirect('/login'); // User does not exist
    } else {
      var salt = found.get('salt');
      var hash = bcrypt.hashSync(req.body.password, salt);
      if(hash !== found.get('password')){
        res.redirect('/login'); // User does not exist
      } else {
        // save sessionId to session table with userId
        return res.redirect('/');
      }
    });
  })
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits')+1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
