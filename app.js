//jshint esversion:6

//required packages
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const request = require("request");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//home ruote
app.get("/", function(req, res) {
  res.render("home");
});

app.post("/", function(req, res) {
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
    url: "https://us4.api.mailchimp.com/3.0/lists/77cd10437e",
    method: "POST",
    headers: {
      Authorization: "Shahriar 11dd83ba0fd441b5cdff6dcf8e2b4ff8-us4"
    },
    body: jsonData
  };

  request(options, function(error, response, body) {
    if (response.statusCode == 200) {
      res.send("<h1>You are successfully SUBSCRIBED to our Newsletter!</h1>");
    } else if (error) {
      res.send("<h1>Failled! :(</h1>");
    } else {
      res.send("<h1>Failled! :(</h1>");
    }
  });
});

//about route
app.get("/about", function(req, res) {
  res.render("about");
});

//contact route
app.get("/contact", function(req, res) {
  res.render("contact");
});

//server port
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("server started on port " + port);
});
