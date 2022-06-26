var express = require('express');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oidc');
const User = require('../model/User');

var router = express.Router();

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

module.exports = router;

passport.use(new GoogleStrategy({
    clientID: process.env['GOOGLE_CLIENT_ID'],
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
    callbackURL: '/oauth2/redirect/google',
    scope: [ 'profile' ]
  },
  async function(issuer, profile, done) {
    console.log("LOGIN",issuer,profile);
    var user = await User.findOne({'google.id': profile.id});
    if (user) { // user found
      console.log('USER FOUND: ', user);
      done(null, user);
    } else {
      var user = new User();
      user.google = profile;
      user.displayName = profile.displayName;
      user.email = profile.emails[0];
      user.emailVerified = true; 
      console.log("NEW USER: ", user);
      await user.save();
      done(null, user);
    }
  }));