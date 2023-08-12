require('dotenv').config();
var express = require('express'),
    bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');



const saltRounds = 10;

var app = express();

const ejs = require("ejs"),
    mongoose = require("mongoose");

    app.set('view engine','ejs');
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.urlencoded({extended:true}));

    app.use(express.static('public'));


main().catch(err => console.log(err));
 
async function main() {

    app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true,
      }))
    

      



  app.use(passport.initialize());  
  //his line initializes Passport.js and adds it as middleware to the Express.js application. Passport.js needs to be initialized to work properly with Express.js. It sets up the basic functionality required for authentication but doesn't handle persistent login sessions on its own.  
  app.use(passport.session());    
  //This line adds the passport.session() middleware to the application. This middleware is responsible for managing persistent login sessions. It works in conjunction with the express-session middleware (as discussed in a previous example) to store and retrieve user session information during the authentication process.




  await mongoose.connect('mongodb://127.0.0.1:27017/userDB');
    // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
    const userSchema = new mongoose.Schema({
        email:String,
        password:String,
        googleId:String,
        secret:String
    });

    userSchema.plugin(passportLocalMongoose);

    const User = new mongoose.model('User',userSchema);

    passport.use(User.createStrategy());

    passport.serializeUser(function(user, done) {
        done(null, user);
      });
     
    passport.deserializeUser(function(user, done) {
        done(null, user);
    });
     
    passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
      },
      function(accessToken, refreshToken, profile, cb) {
        User.findOne({ googleId: profile.id }).then((foundUser) => {
            if (foundUser) {
              return foundUser;
            } else {
              const newUser = new User({
                googleId: profile.id
              });
              return newUser.save();
            }
          }).then((user) => {
            return cb(null, user);
          }).catch((err) => {
            return cb(err);
          });
      }
    ));

    app.get('/submit', (req, res) => {
        if(req.isAuthenticated()){
            res.render("submit");
        } else {
            res.redirect("/login");
        };
    });
     
    app.post("/submit", function (req, res) {
        console.log(req.user);
        User.findById(req.user)
          .then(foundUser => {
            if (foundUser) {
              foundUser.secret = req.body.secret;
              return foundUser.save();
            }
            return null;
          })
          .then(() => {
            res.redirect("/secrets");
          })
          .catch(err => {
            console.log(err);
          });
    });

// app.get("/",function(req,res){
//     res.render("home");
// });

app.get("/",function(req,res){
  res.sendFile(__dirname + "/index.html");
});

// app.get("/login",function(req,res){
//     res.render("login");
// });

app.get("/login",function(req,res){
  res.sendFile(__dirname + "/login.html");
});

app.get("/secrets",function(req,res){
    User.find({"secret":{$ne:null}})
    .then(function (foundUsers) {
      res.render("secrets",{usersWithSecrets:foundUsers});
      })
    .catch(function (err) {
      console.log(err);
      })
});

app.get("/auth/google",
    passport.authenticate('google',{scope:["profile"]})
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
  });

  app.post("/login",
  passport.authenticate("local", { failureRedirect: "/login" }), function(req, res) {
    res.redirect("/secrets");
  }
);

app.get("/register",function(req,res){
  res.sendFile(__dirname + "/register.html");
});

app.post("/register", async(req,res)=>{
    try {
        const registeredUser = await (User.register({username : req.body.username}, req.body.password));

            passport.authenticate('local')(req,res,function(){
                res.render('secrets');
            })
        }
     catch(err){
        console.log(err);
        res.redirect("/register");
    }
});

app.get('/logout', (req,res, next) => {
    req.logout(function(err){
        if(err){
            return next(err);
        }
        res.redirect('/');
    });
});


app.listen(process.env.PORT || 3000,function(){
    console.log("running on port 3000.")
})

}


