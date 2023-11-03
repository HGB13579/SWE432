const express = require('express');
const app = express();
const path = require('path');

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// producer home page
app.get('/', function(req, res) {
  var producer = { firstName: 'Bruno', lastName: 'Mars' };
  res.render('producerHome', {
    producer: producer,
  });
});

// producer profiles page
app.get('/producerProfile', function(req, res) {
  res.render('producerProfile');
});

// producer settings page
app.get('/producerSettings', function(req, res) {
  res.render('producerSettings');
});

// playlists page
app.get('/playlists', function(req, res) {
  res.render('playlists');
});

app.listen(8080);
console.log('Server is listening on port 8080');
