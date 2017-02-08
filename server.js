const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require('mongodb');
const assert = require('assert');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const config = require('./config');

let userService;
let rouletteService;

const app = express();

app.set('tokenSecret', config.secret);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


var apiRoutes = express.Router();

// Routes that are not secured by token

app.post("/users/auth", (req, res) => {
  userService
  .auth(req.body.username, req.body.password)
  .then(user => {
    if (user == null){
      res.json('Le nom d\'utilisateur ou le mot de passe est incorrect');
    } else {
      var token = jwt.sign(user, app.get('tokenSecret'), {
        expiresIn : 1440
      });
      res.json(token);
    }
  })
  .catch(err => console.log(err));
});


app.post("/users/signUp", (req, res) => {
  userService
  .checkIfUserExists(req.body.username)
  .then(user =>{
    if (user == null){
      userService.signUp(req.body.username, req.body.password);
      res.json('Votre compte a bien été créé');
    } else {
      res.json('Le nom d\'utilisateur existe déjà');
    }
  })
});


// route middleware to check the token
apiRoutes.use(function(req, res, next) {

  var token = req.headers['x-access-token'];

  if (token) {

    jwt.verify(token, app.get('tokenSecret'), function(err, decoded) {
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return res.status(403).send({
        success: false,
        message: 'No token provided.'
    });
  }
});

// Routes that are secured by token
app.use(apiRoutes);

app.post("/users/deleteAccount", (req, res) => {
  userService
  .auth(req.body.username, req.body.password)
  .then(user => {
    if (user == null){
      res.json('Le nom d\'utilisateur ou le mot de passe est incorrect');
    } else {
      userService.deleteAccount(req.body.username);
    }
  })
});

app.put("/users/setUsername", (req, res) => {
  userService
  .setUsername(req.body.username, req.body.newUsername)
  .then(newUser => res.json(newUser))
  .catch(err => console.log(err));
});


app.put("/users/setPassword", (req, res) => {
  userService.setPassword(req.body.idUser, req.body.newPassword);
});


app.put("/users/setAmount", (req, res) => {
  userService.setAmount(req.body.idUser, req.body.amount);
});


app.post("/users/getAmount", (req, res) => {
  return userService.getAmount(req.body.idUser).then(function(amount){
    return amount;
  });
});


app.post("/roulette/bet", (req, res) => {
  var amount = rouletteService.getAmountFromBet(req.body.stake, req.body.number, req.body.hasWon);
  userService.setAmount(req.body.idUser, amount);
});


// Connection URL
MongoClient
  .connect(config.database)
  .then(db => {
    userService = require('./UserService')(db);
    rouletteService = require('./rouletteService');
    app.listen(8887, () => console.log("Server listening port 8887..."));
    console.log('Connected');
  })
  .catch(err => {
    throw err;
  });