//jshint esversion:6
// jshint esversion:8

//required packages
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const request = require('request');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const _ = require('lodash');
const MongoStore = require('connect-mongo')(session);

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Passport & other sessions

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
    }),
    cookie: { originalMaxAge: 180 * 60 * 1000 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  res.locals.session = req.session;
  next();
});

// Database Connect

mongoose.connect(process.env.MONGODB_ATLAS, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

mongoose.set('useCreateIndex', true);

// Mongoose Schema

const userSchema = new mongoose.Schema({
  fName: String,
  lName: String,
  username: String,
  password: String,
});

const productSchema = new mongoose.Schema({
  name: String,
  imageUrl: String,
  category: String,
  size: String,
  price: Number,
  description: String,
  featured: {
    default: false,
  },
});

const reviewSchema = new mongoose.Schema({
  userName: String,
  productName: String,
  score: Number,
  comment: String,
  date: Date,
});

const orderSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  products: [],
  mobileNumber: String,
  address: String,
  measurement: String,
  amount: Number,
  paymentMethod: {
    paymentMethodName: String,
    bkashNumber: Number,
    bkashTrxID: String,
  },
  date: Date,
  orderStatus: {
    type: String,
    default: 'Pending',
  },
});

// Plugins

userSchema.plugin(passportLocalMongoose);

// Mongoose Models

const User = new mongoose.model('User', userSchema);
const Product = new mongoose.model('Product', productSchema);
const Review = new mongoose.model('Review', reviewSchema);
const Order = new mongoose.model('Order', orderSchema);

// passport strategy

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//home route
app
  .route('/')
  .get(function (req, res) {
    Product.find({ featured: 'true' }, function (err, products) {
      if (err) {
        console.log(err);
      } else {
        res.render('home', { products: products });
      }
    });
  })

  .post(function (req, res) {
    // Newsletter

    const lastName = req.body.name;
    const email = req.body.email;

    const data = {
      members: [
        {
          email_address: email,
          status: 'subscribed',
          merge_fields: {
            LNAME: lastName,
          },
        },
      ],
    };

    const jsonData = JSON.stringify(data);

    const options = {
      url: process.env.MAIL_CHIMP_LIST,
      method: 'POST',
      headers: {
        Authorization: process.env.MAIL_CHIMP_API,
      },
      body: jsonData,
    };

    request(options, function (error, response, body) {
      if (response.statusCode == 200) {
        res.render('success');
      } else if (error) {
        res.render('failed');
      } else {
        res.render('failed');
      }
    });
  });

//about route
app
  .route('/about')

  .get(function (req, res) {
    res.render('about');
  });

//contact route
app
  .route('/contact')

  .get(function (req, res) {
    res.render('contact');
  });

// Admin Route
app.route('/admin').get(function (req, res) {
  if (req.isAuthenticated() && req.user.username === 'admin@admin.com') {
    Order.find({ orderStatus: 'Pending' }, function (err, pendingOrders) {})
      .sort({ date: -1 })
      .exec(function (err, pendingOrders) {
        Order.find({ orderStatus: 'Processing' }, function (
          err,
          processingOrders
        ) {})
          .sort({ date: -1 })
          .exec(function (err, processingOrders) {
            Order.find({ orderStatus: 'Delivered' }, function (
              err,
              deliveredOrders
            ) {})
              .sort({ date: -1 })
              .exec(function (err, deliveredOrders) {
                Order.find({ orderStatus: 'Canceled' }, function (
                  err,
                  canceledOrders
                ) {})
                  .sort({ date: -1 })
                  .exec(function (err, canceledOrders) {
                    Order.aggregate(
                      [
                        {
                          $match: { orderStatus: 'Pending' },
                        },
                        {
                          $group: {
                            _id: null,
                            count: { $sum: 1 },
                            total: { $sum: '$amount' },
                          },
                        },
                      ],
                      function (err, p) {
                        if (err) {
                          console.log(err);
                        } else {
                          Order.aggregate(
                            [
                              {
                                $match: { orderStatus: 'Processing' },
                              },
                              {
                                $group: {
                                  _id: null,
                                  count: { $sum: 1 },
                                  total: { $sum: '$amount' },
                                },
                              },
                            ],
                            function (err, pr) {
                              if (err) {
                                console.log(err);
                              } else {
                                Order.aggregate(
                                  [
                                    {
                                      $match: { orderStatus: 'Delivered' },
                                    },
                                    {
                                      $group: {
                                        _id: null,
                                        count: { $sum: 1 },
                                        total: { $sum: '$amount' },
                                      },
                                    },
                                  ],
                                  function (err, d) {
                                    if (err) {
                                      console.log(err);
                                    } else {
                                      Product.aggregate(
                                        [
                                          {
                                            $match: { category: 't-shirt' },
                                          },
                                          {
                                            $group: {
                                              _id: null,
                                              count: { $sum: 1 },
                                              total: { $sum: '$price' },
                                            },
                                          },
                                        ],
                                        function (err, t) {
                                          Product.aggregate(
                                            [
                                              {
                                                $match: { category: 'shirt' },
                                              },
                                              {
                                                $group: {
                                                  _id: null,
                                                  count: { $sum: 1 },
                                                  total: { $sum: '$price' },
                                                },
                                              },
                                            ],
                                            function (err, s) {
                                              Product.aggregate(
                                                [
                                                  {
                                                    $match: {
                                                      category: 'pant',
                                                    },
                                                  },
                                                  {
                                                    $group: {
                                                      _id: null,
                                                      count: { $sum: 1 },
                                                      total: { $sum: '$price' },
                                                    },
                                                  },
                                                ],
                                                function (err, pa) {
                                                  if (!err) {
                                                    res.render('admin', {
                                                      pendingOrders: pendingOrders,
                                                      processingOrders: processingOrders,
                                                      deliveredOrders: deliveredOrders,
                                                      canceledOrders: canceledOrders,
                                                      penOverview: p[0],
                                                      prOverview: pr[0],
                                                      delOverview: d[0],
                                                      tShirt: t[0],
                                                      shirt: s[0],
                                                      pant: pa[0],
                                                    });
                                                  } else {
                                                    console.log(err);
                                                  }
                                                }
                                              );
                                            }
                                          );
                                        }
                                      );
                                    }
                                  }
                                );
                              }
                            }
                          );
                        }
                      }
                    );
                    if (err) {
                      console.log(err);
                    }
                  });
              });
          });
      });
  } else {
    res.redirect('/login');
  }
});

// Admin Dashboard
// Add Product
app.route('/add').post(function (req, res) {
  const category = req.body.category;
  const productName = req.body.name;

  const product = new Product({
    name: req.body.name,
    imageUrl: req.body.imageUrl,
    category: req.body.category,
    size: req.body.size,
    price: req.body.price,
    description: req.body.description,
  });

  product.save(function (err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect('/category/' + category + '/' + productName);
    }
  });
});

// Delete product
app.route('/delete').post(function (req, res) {
  const productName = req.body.name;

  Product.deleteOne({ name: productName }, function (err) {
    if (!err) {
      res.redirect('/admin');
    } else {
      console.log(err);
    }
  });
});

// Featured Products
app.route('/featured-products').post(function (req, res) {
  const featuredProduct = req.body.featuredProduct;
  const operation = req.body.operation;

  if (operation === 'add') {
    Product.updateOne(
      { name: featuredProduct },
      { featured: 'true' },
      function (err, product) {
        res.redirect('admin');
      }
    );
  } else {
    Product.updateOne(
      { name: featuredProduct },
      { featured: 'false' },
      function (err, product) {
        res.redirect('admin');
      }
    );
  }
});

// Order Management Route
app
  .route('/order/:productId')
  .get(function (req, res) {
    const productId = req.params.productId;

    Order.findOne({ _id: productId }, function (err, orderInfo) {
      if (!err) {
        res.render('orderDetails', { order: orderInfo });
      } else {
        console.log(err);
      }
    });
  })
  .post(function (req, res) {
    const productId = req.params.productId;

    if (req.body.orderStatus === 'Delete') {
      Order.deleteOne({ _id: productId }, function (err) {
        if (!err) {
          res.redirect('/admin');
        } else {
          console.log(err);
        }
      });
    } else {
      Order.updateOne(
        { _id: productId },
        { orderStatus: req.body.orderStatus },
        function (err, product) {
          if (!err) {
            res.redirect('/order/' + productId);
          } else {
            console.log(err);
          }
        }
      );
    }
  });

// Customer Order Details
app
  .route('/customer/order/:productId')
  .get(function (req, res) {
    const productId = req.params.productId;

    Order.findOne({ _id: productId }, function (err, orderInfo) {
      if (!err) {
        res.render('customerOrder', { order: orderInfo });
      } else {
        console.log(err);
      }
    });
  })
  .post(function (req, res) {
    const productId = req.params.productId;
    Order.findOne({ _id: productId }, function (err, orderInfo) {
      if (!err && orderInfo.orderStatus === 'Pending') {
        Order.updateOne(
          { _id: productId },
          { orderStatus: 'Canceled' },
          function (err, product) {
            if (!err) {
              res.redirect('/account');
            } else {
              console.log(err);
            }
          }
        );
      } else {
        if (!err && orderInfo.orderStatus !== 'Pending') {
          res.redirect('/customer/order/' + productId);
        } else {
          console.log(err);
        }
      }
    });
  });

// All Products Route
app.route('/products').get(function (req, res) {
  Product.find(function (err, products) {
    if (err) {
      console.log(err);
    } else {
      res.render('allProduct', {
        category: products.category,
        products: products,
      });
    }
  });
});

// All products filter route
app.route('/products/price/:min/:max').get(function (req, res) {
  const min = req.params.min;
  const max = req.params.max;

  Product.find({ price: { $gte: min, $lt: max } }, function (err, products) {
    if (err) {
      console.log(err);
    } else {
      res.render('allProduct', {
        category: products.category,
        products: products,
      });
    }
  });
});

// Category Routes

app.route('/category/:categoryRoute').get(function (req, res) {
  const categoryRoute = req.params.categoryRoute;
  const categoryLower = _.lowerFirst(categoryRoute);
  Product.find({ category: categoryRoute }, function (err, products) {
    if (err) {
      console.log(err);
    } else {
      res.render('category', {
        category: _.upperFirst(categoryRoute),
        categoryLower: categoryLower,
        products: products,
      });
    }
  });
});

// Filter Route
app
  .route('/category/:categoryRoute/price/:min/:max')
  .get(function (req, res) {
    const categoryRoute = _.lowerFirst(req.params.categoryRoute);
    const min = req.params.min;
    const max = req.params.max;
    console.log(categoryRoute);

    Product.find(
      { category: categoryRoute, price: { $gte: min, $lt: max } },
      function (err, products) {
        if (err) {
          console.log(err);
        } else {
          res.render('category', {
            category: _.upperFirst(categoryRoute),
            categoryLower: categoryRoute,
            products: products,
          });
        }
      }
    );
  })
  .post(function (req, res) {});

// Products Page
app.route('/category/:categoryName/:productName').get(function (req, res) {
  const categoryName = req.params.categoryName;
  const productName = req.params.productName;

  Product.findOne({ name: productName }, function (err, product) {
    if (err) {
      console.log(err);
    } else {
      Review.find({ productName: product.name }, function (err, review) {
        if (err) {
          console.log(err);
        } else {
          Review.aggregate(
            [
              {
                $match: { productName: product.name },
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  total: { $sum: '$score' },
                },
              },
            ],
            function (err, found) {
              if (!err) {
                console.log(found[0]);
                if (found[0] != undefined) {
                  res.render('product', {
                    imageUrl: product.imageUrl,
                    name: product.name,
                    description: product.description,
                    size: product.size,
                    price: product.price,
                    category: categoryName,
                    reviewer: review,
                    rating: found[0].total / found[0].count,
                    numOfReviewer: found[0].count,
                  });
                } else {
                  res.render('product', {
                    imageUrl: product.imageUrl,
                    name: product.name,
                    description: product.description,
                    size: product.size,
                    price: product.price,
                    category: categoryName,
                    reviewer: review,
                    rating: 0,
                    numOfReviewer: 0,
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
app.route('/review/:category/:productName').post(function (req, res) {
  const score = req.body.score;
  const comment = req.body.comment;
  const category = req.params.category;
  const product = req.params.productName;

  if (req.isAuthenticated()) {
    const review = new Review({
      userName: req.user.fName + ' ' + req.user.lName,
      productName: req.body.productName,
      score: score,
      comment: comment,
      date: new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });

    console.log(review, req.body.productName);
    review.save(function (err) {
      if (err) {
        console.log(err);
      } else {
        res.redirect('/category/' + category + '/' + product);
      }
    });
  } else {
    res.redirect('/login');
  }
});

// Register Route
app
  .route('/register')
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      res.redirect('/account');
    } else {
      res.render('register');
    }
  })
  .post(function (req, res) {
    const password = req.body.password;
    if (password.length >= 6 && password === req.body.reTypePass) {
      User.register(
        {
          fName: req.body.fName,
          lName: req.body.lName,
          username: req.body.username,
        },
        password,
        function (err, user) {
          if (err) {
            res.redirect('/register');
          } else {
            passport.authenticate('local')(req, res, function () {
              res.redirect('/products');
            });
          }
        }
      );
    } else {
      res.redirect('/register');
    }
  });

// Login Route
app
  .route('/login')
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      if (req.user.username === 'admin@admin.com') {
        res.redirect('/admin');
      } else {
        res.redirect('/account');
      }
    } else {
      res.render('login');
    }
  })

  .post(function (req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });

    req.login(user, function (err) {
      if (err) {
        res.redirect('/login');
      } else {
        passport.authenticate('local')(req, res, function () {
          if (req.user.username === 'admin@admin.com') {
            res.redirect('/admin');
          } else {
            res.redirect('/products');
          }
        });
      }
    });
  });

// Account Route
app.route('/account').get(function (req, res) {
  if (req.isAuthenticated()) {
    Order.find({ userId: req.user._id }, function (err, orders) {})
      .sort({ date: -1 })
      .exec(function (err, orders) {
        if (!err) {
          res.render('account', {
            fName: req.user.fName,
            lName: req.user.lName,
            orders: orders,
          });
        } else {
          console.log(err);
        }
      });
  } else {
    res.redirect('/login');
  }
});

// Logout Route
app.route('/logout').get(function (req, res) {
  req.logout();
  res.redirect('/login');
});

// Cart Function
function Cart(oldCart) {
  this.items = oldCart.items || {};
  this.quantity = oldCart.quantity || 0;
  this.totalItems = oldCart.totalItems || 0;
  this.totalPrice = oldCart.totalPrice || 0;

  this.add = function (item, name, size) {
    let cartItem = this.items[name];
    if (!cartItem) {
      cartItem = this.items[name] = {
        item: item,
        quantity: 0,
        price: 0,
        size: size,
      };
    }
    cartItem.quantity++;
    cartItem.price = cartItem.item.price * cartItem.quantity;
    this.totalItems++;
    this.totalPrice += cartItem.item.price;
  };

  this.reduceByOne = function (name) {
    this.items[name].quantity--;
    this.items[name].price -= this.items[name].item.price;
    this.totalItems--;
    this.totalPrice -= this.items[name].item.price;

    if (this.items[name].quantity <= 0) {
      delete this.items[name];
    }
  };

  this.increaseByOne = function (name) {
    this.items[name].quantity++;
    this.items[name].price += this.items[name].item.price;
    this.totalItems++;
    this.totalPrice += this.items[name].item.price;
  };

  this.removeItem = function (name) {
    this.totalItems -= this.items[name].quantity;
    this.totalPrice -= this.items[name].price;

    delete this.items[name];
  };

  this.generateArray = function () {
    const arr = [];
    for (var name in this.items) {
      arr.push(this.items[name]);
    }
    return arr;
  };
}

// Cart Route
app.route('/add-to-cart/:name').get(function (req, res) {
  const name = req.params.name;
  const cart = new Cart(req.session.cart ? req.session.cart : {});

  Product.findOne({ name: name }, function (err, product) {
    if (err) {
      console.log(err);
    } else {
      cart.add(product, product.name, product.size);
      req.session.cart = cart;
      console.log(req.session.cart);
      res.redirect('/cart');
    }
  });
});

// IncreaseByOne
app.route('/increase/:name').get(function (req, res) {
  const name = req.params.name;
  const cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.increaseByOne(name);
  req.session.cart = cart;
  res.redirect('/cart');
});

// ReduceByOne
app.route('/reduce/:name').get(function (req, res) {
  const name = req.params.name;
  const cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.reduceByOne(name);
  req.session.cart = cart;
  res.redirect('/cart');
});

// RemoveItems
app.route('/removeItem/:name').get(function (req, res) {
  const name = req.params.name;
  const cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.removeItem(name);
  req.session.cart = cart;
  res.redirect('/cart');
});

// Cart Route
app.route('/cart').get(function (req, res) {
  if (!req.session.cart) {
    res.render('cart', { products: null });
  } else {
    const cart = new Cart(req.session.cart);

    res.render('cart', {
      products: cart.generateArray(),
      totalPrice: cart.totalPrice,
      totalItems: cart.totalItems,
    });
  }
});

// Checkout Route
app
  .route('/checkout')
  .get(function (req, res) {
    if (!req.session.cart) {
      res.redirect('/cart');
    } else {
      const cart = new Cart(req.session.cart);

      res.render('checkout', { total: cart.totalPrice });
    }
  })
  .post(function (req, res) {
    const cart = new Cart(req.session.cart);
    const mobileNumber = req.body.mobileNumber;
    const address = req.body.address;
    const measurement = req.body.measurement;
    const bkashNumber = req.body.bkashNumber;
    const bkashTrxID = req.body.bkashTrxID;
    const amount = cart.totalPrice;
    const paymentMethod = req.body.paymentMethod;
    const products = cart.generateArray();

    if (req.isAuthenticated()) {
      const order = new Order({
        userId: req.user._id,
        userName: req.user.fName + ' ' + req.user.lName,
        mobileNumber: mobileNumber,
        products: products,
        address: address,
        measurement: measurement,
        amount: amount,
        paymentMethod: {
          paymentMethodName: paymentMethod,
          bkashNumber: bkashNumber,
          bkashTrxID: bkashTrxID,
        },
        date: new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      });

      order.save(function (err) {
        if (err) {
          console.log(err);
        } else {
          req.session.cart = null;
          res.redirect('/success');
        }
      });
    } else {
      res.redirect('/login');
    }
  });

// Order Success
app.route('/success').get(function (req, res) {
  res.render('orderSuccess');
});

//server port
let port = process.env.PORT;
if (port == null || port == '') {
  port = 3000;
}
app.listen(port, function () {
  console.log('server started on port ' + port);
});
