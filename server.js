const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/swe432pa1', { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use express-session
app.use(session({
  secret: 'mysecretkey',
  resave: false,
  saveUninitialized: true
}));

var songSchema = new Schema({
  title: String,
  artist: String,
  album: String,
  duration: Number
});

var playlistSchema = new Schema({
  name: String,
  description: String,
  songs: [songSchema], // Array of embedded song documents
});

var userSchema = new Schema({
  username: String,
  password: String,
  workingPlaylists: [playlistSchema],
});

const DJSchema = new Schema({
  name: String,
});

const User = mongoose.model('user', userSchema);
const Song = mongoose.model('song', songSchema);
const Playlist = mongoose.model('playlist', playlistSchema);
const DJ = mongoose.model('DJ', DJSchema);

const createDefaultAdmin = async () => {
  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    await User.create({ username: 'admin', password: 'password' });
  }
};
createDefaultAdmin();

const addSongs = async () => {
  try {
    // Create songs if they don't exist
    const song1 = await Song.findOne({ title: 'Happy' });
    if (!song1) {
      await Song.create({
        id_song: 1,
        title: 'Happy',
        artist: 'PHarrell',
        album: 'Album 1',
        duration: 180
      });
    }

    const song2 = await Song.findOne({ title: 'Heartless' });
    if (!song2) {
      await Song.create({
        id_song: 2,
        title: 'Heartless',
        artist: 'Kanye',
        album: 'Album 2',
        duration: 180
      });
    }

    const song3 = await Song.findOne({ title: 'One Dance' });
    if (!song3) {
      await Song.create({
        id_song: 3,
        title: 'One Dance',
        artist: 'Drake',
        album: 'Album 3',
        duration: 180
      });
    }

  } catch (err) {
    console.error('Error adding songs:', err);
  }
};

addSongs();

// Home page (login)
app.get('/', async function(req, res) {
  try {
    const songs = await Song.aggregate([{ $sample: { size: 5 } }]);

    if (req.session.username) {
      res.render('producerHome', { username: req.session.username, songs: songs });
    } else {
      res.render('login');
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server Error');
  }
});
app.get('/logout', function(req, res) {
  req.session.destroy(function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Server Error');
    }
    // Redirect the user to the login page after logout
    res.render('login');
  });
});

// Login route - Handle POST request for login
app.post('/login', async function(req, res) {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.render('login', { errorMessage: 'Invalid username or password' });
    }
    if (user.password === password) {
      req.session.username = user.username; // Set the username in the session
      return res.redirect('/');
    } else {
      return res.render('login', { errorMessage: 'Invalid username or password' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server Error');
  }
});



// producer profiles page
app.get('/producerProfile', async function(req, res) {
  try {
    const songs = await Song.aggregate([{ $sample: { size: 5 } }]);

    res.render('producerProfile', { username: req.session.username, songs: songs });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server Error');
  }
});

// producer settings page
app.get('/producerSettings', async function(req, res) {
  try {
    const songs = await Song.aggregate([{ $sample: { size: 5 } }]);

    res.render('producerSettings', { username: req.session.username, songs: songs });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server Error');
  }
});

// playlists page
app.get('/playlists', async function(req, res) {
  try {
    const songs = await Song.aggregate([{ $sample: { size: 5 } }]);

    res.render('playlists', { username: req.session.username, songs: songs });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server Error');
  }
});

app.post('/changePassword', async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // Check if the old password matches the user's current password (you may need to modify this based on your authentication logic)
  const user = await User.findOne({ username: req.session.username, password: oldPassword }).exec();

  if (user) {
      // Update the user's password
      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password changed successfully.' });
  }
  else {
      res.status(401).json({ message: 'Incorrect old password.' });
  }
});

app.get('/search', async (req, res) => {
  const searchTerm = req.query.term;

  if (!searchTerm) {
      return res.status(400).json({ error: 'Please provide a search term' });
  }

  try {
      const result = await Song.findOne({ name: new RegExp(searchTerm, 'i') });

      if (result) {
          res.json(result);
      }
      else {
          res.json({ message: 'Song not found' });
      }
  }
  catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/getRandomSong', async (req, res) => {
  try {
      const result = await Song.aggregate([{ $sample: { size: 1 } }]);
      const randomSong = result[0];

      // Include the song ID in the session
      req.session.currentSongId = randomSong._id;

      // Include the song details in the response
      res.json({
          name: randomSong.title,
          artist: randomSong.artist,
          album: randomSong.album || '',
          _id: randomSong._id, // Include the song ID
      });
  }
  catch (error) {
      console.error('Error fetching random song:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/getRandomDJ', async (req, res) => {
  try {
      const count = await DJ.countDocuments();
      const randomIndex = Math.floor(Math.random() * count);

      const randomDJ = await DJ.findOne().skip(randomIndex);

      res.json({ name: randomDJ.name }); // Adjust the response format
  }
  catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/getAllDJs', async (req, res) => {
  try {
      const djs = await DJ.find();
      res.json(djs);
  }
  catch (error) {
      console.error('Error fetching DJs:', error); // Add this line for logging
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/addToQueue', async (req, res) => {
  try {
      const username = req.session.username;
      const user = await User.findOne({ username }).exec();

      if (!user) {
          return res.status(404).json({ message: 'User not found.' });
      }

      const songId = req.body.songId;
      console.log('Received request body:', req.body.songId);

      if (user.preferences.includes(songId)) {
          return res.status(400).json({ message: 'Song is already in Queue.' });
      }
      else {
          user.preferences.push(songId);
      }
      await user.save();

      res.json({ message: 'Song added to Queue.' });
  }
  catch (error) {
      console.error('Error adding song to Queue:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/removeFromQueue', async (req, res) => {
  try {
      const username = req.session.username;
      const user = await User.findOne({ username }).exec();

      if (!user) {
          return res.status(404).json({ message: 'User not found.' });
      }

      const songId = req.body.songId;

      // Check if the song is in the user's preferences
      const songIndex = user.preferences.indexOf(songId);
      if (songIndex !== -1) {
          // Remove the song from preferences
          user.preferences.splice(songIndex, 1);
          await user.save();

          res.json({ message: 'Song removed from Queue.' });
      } 
      else {
          res.status(400).json({ message: 'Song is not in Queue.' });
      }
  } 
  catch (error) {
      console.error('Error removing song from Queue:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(8080);
console.log('Server is listening on port 8080');