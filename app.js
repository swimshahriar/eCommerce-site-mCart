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
const _ = require("lodash");

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
  useUnifiedTopology: true,
  useFindAndModify: false
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

const productSchema = new mongoose.Schema({
  name: String,
  imageUrl: String,
  category: String,
  price: Number,
  description: String,
  featured: {
    default: false
  }
});

const reviewSchema = new mongoose.Schema({
  userName: String,
  productName: String,
  score: Number,
  comment: String,
  date: Date
});

// Plugins

userSchema.plugin(passportLocalMongoose);

// Mongoose Models

const User = new mongoose.model("User", userSchema);
const Product = new mongoose.model("Product", productSchema);
const Review = new mongoose.model("Review", reviewSchema);

// passport strategy

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//home ruote
app
  .route("/")
  .get(function(req, res) {
    Product.find({ featured: "true" }, function(err, products) {
      if (err) {
        console.log(err);
      } else {
        res.render("home", { products: products });
      }
    });
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

// Admin Dashboard
// Add Product
app.route("/add").post(function(req, res) {
  const product = new Product({
    name: req.body.name,
    imageUrl: req.body.imageUrl,
    category: req.body.category,
    price: req.body.price,
    description: req.body.description
  });

  product.save(function(err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/admin");
    }
  });
});

// Delete product
app.route("/delete").post(function(req, res) {
  const productName = req.body.name;

  Product.deleteOne({ name: productName }, function(err) {
    if (!err) {
      res.redirect("/admin");
    } else {
      console.log(err);
    }
  });
});

// Featured Products
app.route("/featured-products").post(function(req, res) {
  const featuredProduct = req.body.featuredProduct;
  const operation = req.body.operation;

  if (operation === "add") {
    Product.updateOne({ name: featuredProduct }, { featured: "true" }, function(
      err,
      product
    ) {
      res.redirect("admin");
    });
  } else {
    Product.updateOne(
      { name: featuredProduct },
      { featured: "false" },
      function(err, product) {
        res.redirect("admin");
      }
    );
  }
});

// All Products Route
app.route("/products").get(function(req, res) {
  Product.find(function(err, products) {
    if (err) {
      console.log(err);
    } else {
      res.render("allProduct", {
        category: products.category,
        products: products
      });
    }
  });
});

// Category Routes

app.route("/category/:categoryRoute").get(function(req, res) {
  const categoryRoute = req.params.categoryRoute;
  Product.find({ category: categoryRoute }, function(err, products) {
    if (err) {
      console.log(err);
    } else {
      res.render("category", {
        category: _.upperFirst(categoryRoute),
        products: products
      });
    }
  });
});

// Filter Route
app
  .route("/category/:categoryRoute/price?min=:min?max=:max")
  .get(function(req, res) {
    
  })
  .post(function(req, res) {});

// Products Page
app.route("/category/:categoryName/:productName").get(function(req, res) {
  const categoryName = req.params.categoryName;
  const productName = req.params.productName;

  Product.findOne({ name: productName }, function(err, product) {
    if (err) {
      console.log(err);
    } else {
      Review.find({ productName: product.name }, function(err, review) {
        if (err) {
          console.log(err);
        } else {
          Review.aggregate(
            [
              {
                $match: { productName: product.name }
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  total: { $sum: "$score" }
                }
              }
            ],
            function(err, found) {
              if (!err) {
                console.log(found[0]);
                if (found[0] != undefined) {
                  res.render("product", {
                    imageUrl: product.imageUrl,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    reviewer: review,
                    rating: found[0].total / found[0].count,
                    numOfReviewer: found[0].count
                  });
                } else {
                  res.render("product", {
                    imageUrl: product.imageUrl,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    reviewer: review,
                    rating: 0,
                    numOfReviewer: 0
                  });
                }
              } else {
                console.log(err);
              }
            }
          );
        }
      });
    }
  });
});

// Review Route
app.route("/review").post(function(req, res) {
  const score = req.body.score;
  const comment = req.body.comment;

  if (req.isAuthenticated()) {
    const review = new Review({
      userName: req.user.fName,
      productName: req.body.productName,
      score: score,
      comment: comment,
      date: new Date()
    });

    console.log(review, req.body.productName);
    review.save(function(err) {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/products");
      }
    });
  } else {
    res.redirect("/login");
  }
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
              res.redirect("/products");
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
        res.redirect("/products");
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
            res.redirect("/products");
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
