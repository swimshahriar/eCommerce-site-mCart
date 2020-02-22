//jshint esversion:6

//required packages
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const request = require("request");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Passport session

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Database Connect

mongoose.connect(process.env.MONGODB_ATLAS, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.set("useCreateIndex", true);

// Mongoose Schema

const userSchema = new mongoose.Schema({
  fName: String,
  lName: String,
  username: String,
  address: String,
  password: String
});

// Plugins

userSchema.plugin(passportLocalMongoose);

// Mongoose Models

const User = new mongoose.model("User", userSchema);

// passport strategy

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//home ruote
app
  .route("/")
  .get(function(req, res) {
    res.render("home");
  })

  .post(function(req, res) {
    // Newsletter

    const lastName = req.body.name;
    const email = req.body.email;

    const data = {
      members: [
        {
          email_address: email,
          status: "subscribed",
          merge_fields: {
            LNAME: lastName
          }
        }
      ]
    };

    const jsonData = JSON.stringify(data);

    const options = {
      url: process.env.MAIL_CHIMP_LIST,
      method: "POST",
      headers: {
        Authorization: process.env.MAIL_CHIMP_API
      },
      body: jsonData
    };

    request(options, function(error, response, body) {
      if (response.statusCode == 200) {
        res.render("success");
      } else if (error) {
        res.render("failed");
      } else {
        res.render("failed");
      }
    });
  });

//about route
app
  .route("/about")

  .get(function(req, res) {
    res.render("about");
  });

//contact route
app
  .route("/contact")

  .get(function(req, res) {
    res.render("contact");
  });

// Category Routes

// T-Shirts
app
  .route("/t-shirts")

  .get(function(req, res) {
    res.render("t-shirts");
  });

// Shirts
app
  .route("/shirts")

  .get(function(req, res) {
    res.render("shirts");
  });

// Pants
app
  .route("/pants")

  .get(function(req, res) {
    res.render("pants");
  });

// Register Route
app
  .route("/register")
  .get(function(req, res) {
    if (req.isAuthenticated()) {
      res.redirect("/account");
    } else {
      res.render("register");
    }
  })
  .post(function(req, res) {
    const password = req.body.password;
    if (password.length >= 6 && password === req.body.reTypePass) {
      User.register(
        {
          fName: req.body.fName,
          lName: req.body.lName,
          username: req.body.username,
          address: req.body.address
        },
        password,
        function(err, user) {
          if (err) {
            res.redirect("/register");
          } else {
            passport.authenticate("local")(req, res, function() {
              res.redirect("/account");
            });
          }
        }
      );
    } else {
      res.redirect("/register");
    }
  });

// Login Route
app
  .route("/login")
  .get(function(req, res) {
    if (req.isAuthenticated()) {
      if (req.user.username === "admin@admin.com") {
        res.redirect("/admin");
      } else {
        res.redirect("/account");
      }
    } else {
      res.render("login");
    }
  })

  .post(function(req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });

    req.login(user, function(err) {
      if (err) {
        res.redirect("/login");
      } else {
        passport.authenticate("local")(req, res, function() {
          if (req.user.username === "admin@admin.com") {
            res.redirect("/admin");
          } else {
            res.redirect("/account");
          }
        });
      }
    });
  });

// Account Route
app.route("/account").get(function(req, res) {
  if (req.isAuthenticated()) {
    res.render("account", { fName: req.user.fName, lName: req.user.lName });
  } else {
    res.redirect("/login");
  }
});

// Logout Route
app.route("/logout").get(function(req, res) {
  req.logout();
  res.redirect("/login");
});

// Admin Route
app.route("/admin").get(function(req, res) {
  if (req.isAuthenticated() && req.user.username === "admin@admin.com") {
    res.render("admin");
  } else {
    res.redirect("/login");
  }
});

//server port
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("server started on port " + port);
});
