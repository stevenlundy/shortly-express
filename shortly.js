var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var passport = require('passport');
var GitHubStrategy = require('passport-github2').Strategy;
var ppAuth = require('./config/passport');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var Session = require('./app/models/session');

var app = express();


passport.serializeUser(function(user, done) {
  new User({github_id: user.id}).fetch().then(function(found){
    if(!found){
      Users.create({
        username: user.username,
        github_id: user.id
      })
      .then(function(newUser){
        user.dbId = newUser.get('id');
        done(null, user);
      });
    } else {
      user.dbId = found.get('id');
      done(null, user);
    }
  })
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});



// Use the GitHubStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and GitHub
//   profile), and invoke a callback with a user object.
passport.use(new GitHubStrategy({
    clientID: ppAuth.GITHUB_CLIENT_ID,
    clientSecret: ppAuth.GITHUB_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:4568/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's GitHub profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the GitHub account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));






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

app.use(passport.initialize());
app.use(passport.session());

app.get('/', util.restrict,
function(req, res) {
  res.render('index');
});

app.get('/login', 
function(req, res) {
  res.render('login');
});

app.get('/logout',
function(req, res){
  req.logout();
  res.redirect('/login');

  // new Session({token: req.sessionID}).fetch().then(function(session){
  //   if(session){
  //     session.destroy();
  //   }
  //   res.redirect('/login');
  // });
});

// app.get('/signup', 
// function(req, res) {
//   res.render('signup');
// });

///// From https://github.com/cfsghost/passport-github/blob/master/examples/login/app.js

// GET /auth/github
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHub will redirect the user
//   back to this application at /auth/github/callback
app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/create', util.restrict,
function(req, res) {
  res.render('index');
});

app.get('/links', util.restrict,
function(req, res) {
  util.getUserId(req, function(userId){
    Links.reset()
    .query('where', 'user_id', '=', userId)
    .fetch().then(function(links) {
      res.send(200, links.models);
    });
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  util.getUserId(req, function(userId){
    if(userId === -1){
      console.log(req.sessionID);
      console.log('Non users should not be able to get here...');
    }
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
});

// app.post('/signup',
// function(req, res) {
//   new User({username: req.body.username }).fetch().then(function(found) {
//     if(found){
//       res.send(400, 'Username already taken');
//     } else {
//       Users.create({
//         username: req.body.username,
//         password: req.body.password
//       })
//       .then(function(newUser){
//         console.log(req.sessionID);
//         new Session({user_id: newUser.get('id'), token: req.sessionID}).save();
//         return res.redirect('/');
//       });
//     }
//   })
// });

// app.post('/login',
// function(req, res) {
//   new User({username: req.body.username }).fetch().then(function(found) {
//     if(!found){
//       res.redirect('/login'); // User does not exist
//     } else {
//       var salt = found.get('salt');
//       var hash = bcrypt.hashSync(req.body.password, salt);
//       if(hash !== found.get('password')){
//         res.redirect('/login'); // User does not exist
//       } else {
//         console.log('log in with session '+req.sessionID);
//         new Session({user_id: found.get('id'), token: req.sessionID}).save();
//         return res.redirect('/');
//       }
//     }
//   });
// });

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
