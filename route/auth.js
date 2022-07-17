var GoogleStrategy = require('passport-google-oidc');
const jwt = require("jsonwebtoken")

const User = require('../model/User');
const config = require("../config")

function setup_google(router, passport) {
  router.get('/login/federated/google', 
    passport.authenticate('google', {
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email']}
    ));

  router.get('/oauth2/redirect/google', 
    passport.authenticate('google', {
      successRedirect: '/',
      failureRedirect: '/login'
    }));

  const callbackURL = `${config.URI}/oauth2/redirect/google`
  console.log(`google strategy, callbackURL: ${callbackURL}`)

  passport.use(new GoogleStrategy({
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: callbackURL,
      scope: [ 'profile' ]
    },
    async function(issuer, profile, done) {
      console.log("LOGIN",issuer,profile);
      var conditions = [
        {'google_id': profile.id},
      ];
      profile.emails.forEach(email => {
        conditions.push({'email': email.value })
      });
      console.log("conditions: " + JSON.stringify(conditions));
      var user = await User.findOne({ $or: conditions });
      if (user) { // user found
        user._token = jwt.sign({ id: user._id }, 
          config.SECRET,
          { expiresIn: 86400 });
        console.log('USER FOUND: ', user);
        done(null, user);
      } else {
        var user = new User();
        user.google_id = profile.id;
        user.displayName = profile.displayName;
        user.email = profile.emails[0].value;
        user.emailVerified = true; 
        user._token =  jwt.sign({ id: user.id }, 
          config.SECRET, 
          { expiresIn: 86400 });
        console.log("NEW USER: ", user);
        await user.save();
        done(null, user);
      }
    }));
  }

function setup_twitter(server, passport) {
  // twitter social auth
  const { TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET } =  process.env;
  console.log("setting up twitter social login " + TWITTER_CONSUMER_KEY);
  const { Strategy } = require('passport-twitter');

  passport.use(new Strategy({
      consumerKey: TWITTER_CONSUMER_KEY,
      consumerSecret: TWITTER_CONSUMER_SECRET,
      callbackURL: 'http://localhost:4000/return'
    },
    (accessToken, refreshToken, profile, cb) => {
      return cb(null, profile);
  }));

  server.get('/login/twitter', passport.authenticate('twitter'));

  server.get('/return', 
    passport.authenticate('twitter', { failureRedirect: '/' }),
    (req, res, next) => {
      res.redirect('/');
  });
}

module.exports = function(express, passport) {
  var router = express.Router();

  passport.serializeUser((user, cb) => {
    console.log("serializeUser " + JSON.stringify(user));
    cb(null, user._id);
  });

  passport.deserializeUser(async (obj, cb) => {
    const user = await User.findById(obj);
    cb(null, user);
  });  

  if (config.GOOGLE_CLIENT_ID) {
    setup_google(router, passport)
  } else {
    console.log("google authentication disabled")
    console.log("set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable")
  }

  return router;

}

