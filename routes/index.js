var express = require('express');
var router = express.Router();


// spotify
var request = require('request'); // "Request" library
var querystring = require('querystring');

var client_id = 'b950e64dfc1948b6a6ce2018a9d154e8'; // Your client id
var client_secret = '2d595745a2f543cd9bc00a67e4d87e5c'; // Your secret
var redirect_uri = 'http://localhost:3000/callback'; // Your redirect uri
var sqlite3 = require('sqlite3');
var db = new sqlite3.Database("spotifyDb");
// create sqlite table
db.run("CREATE TABLE IF NOT EXISTS user (user_id INTEGER PRIMARY KEY, country TEXT, access_token TEXT, refresh_token TEXT)");
db.run("CREATE TABLE IF NOT EXISTS track (user_id INTEGER PRIMARY KEY, track_1 TEXT, track_2 TEXT, track_3 TEXT, track_4 TEXT, track_5 TEXT, track_6 TEXT, track_7 TEXT, track_8 TEXT, track_9 TEXT, track_10 TEXT, FOREIGN KEY (user_id) REFERENCES user (user_id))");

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

router.get('/song/:id', checkToken, function (req, res) {
  let access_token = req.cookies.access_token;
  console.log(req.params.id)
  let trackOptions = {
    url: 'https://api.spotify.com/v1/tracks/' + req.params.id,
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };
  // Get track's detail
  request.get(trackOptions, function (error, response, body) {
    res.render('song', {
      track: body
    });
  });
})

router.get('/', checkToken, function (req, res) {
  let access_token = req.cookies.access_token;
  let refresh_token = req.cookies.refresh_token;

  let profileOptions = {
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  // retrive profile information
  request.get(profileOptions, function (error, response, body) {
    // store data in user table
    db.run("INSERT or REPLACE INTO user (user_id, country, access_token, refresh_token) VALUES (?,?,?,?)", body.id, body.country, access_token, refresh_token);
    res.render('index', {
      display_name: body.display_name, country: body.country,
      email: body.email, id: body.id, href: body.href, external_urls: body.external_urls,
      images: body.images
    });
  });
});

router.get('/callback', function (req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  let code = req.query.code || null;
  let state = req.query.state || null;
  let storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/');
  } else {
    res.clearCookie(stateKey);
    let authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {

        let access_token = body.access_token
        let refresh_token = body.refresh_token

        res.cookie('access_token', access_token);
        res.cookie('refresh_token', refresh_token);
      } else {
        // handle error
      }
      res.redirect('/');
    });
  }
});

router.get('/refresh_token', function (req, res) {

  // requesting access token from refresh token
  let refresh_token = req.query.refresh_token;
  let authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

router.get('/tracks', checkToken, function (req, res) {
  let access_token = req.cookies.access_token;

  let trackOptions = {
    url: 'https://api.spotify.com/v1/me/top/tracks?limit=10',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  let profileOptions = {
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  // retrive current user's id
  request.get(profileOptions, function (error, response, body) {
    // retrive top tracks
    request.get(trackOptions, function (error, response, tracks) {
      let trackSQL = tracks.items.map((track) => track.id); // construct an array of ids
      trackSQL.unshift(body.id) // add user's id at the beginning of an array
      db.run("INSERT or REPLACE INTO track (user_id, track_1, track_2, track_3, track_4, track_5, track_6, track_7, track_8, track_9, track_10) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", trackSQL);
      res.render('tracks', {
        tracks: tracks.items
      });
    });
  });
}
)

router.get('/logout', function (req, res) {
  let logoutOptions = {
    url: 'https://accounts.spotify.com/en/logout',
  };
  request.get(logoutOptions, function (error, response, body) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.redirect('/')
  })
}
)

router.get('/login', function (req, res) {
  let state = generateRandomString(16);
  res.cookie(stateKey, state);

  let scope = 'user-read-private user-read-email user-top-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
})

function checkToken(req, res, next) {
  let token = req.cookies.access_token;
  if (token) {
    next();
  } else {
    res.render('login')
  }
}

module.exports = router;
