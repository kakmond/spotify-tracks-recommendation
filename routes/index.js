var express = require('express');
var router = express.Router();

var request = require('request');
var querystring = require('querystring');

var client_id = 'effb4e77d8764a29a23dc735f6f11dfa'; // Your client id
var client_secret = 'ef52e8965b47466e812d2d3ce761e582'; // Your secret
var redirect_uri = 'https://spotify-group.herokuapp.com/callback'; // Your redirect uri
// var redirect_uri = 'http://localhost:3000/callback'; // Your redirect uri
// var redirect_uri = 'https://spotify-group2.herokuapp.com/callback'; // Your redirect uri

var mysql = require('mysql');
var db = mysql.createConnection({
  host: 'sql7.freemysqlhosting.net',
  user: 'sql7306616',
  password: 'Hw9KNIRAgs',
  database: 'sql7306616'
});

db.connect();

// create sqlite tables
db.query("CREATE TABLE IF NOT EXISTS user (user_id INTEGER PRIMARY KEY, country TEXT, access_token TEXT, refresh_token TEXT)");
db.query("CREATE TABLE IF NOT EXISTS track (user_id INTEGER PRIMARY KEY, track_1 TEXT, track_2 TEXT, track_3 TEXT, track_4 TEXT, track_5 TEXT, track_6 TEXT, track_7 TEXT, track_8 TEXT, track_9 TEXT, track_10 TEXT, FOREIGN KEY (user_id) REFERENCES user (user_id))");
db.query("CREATE TABLE IF NOT EXISTS popularity25 (user_id INTEGER, track_id TEXT, recommendation_id TEXT, popularity INTEGER, FOREIGN KEY (user_id) REFERENCES user (user_id))");
db.query("CREATE TABLE IF NOT EXISTS popularity75 (user_id INTEGER, track_id TEXT, recommendation_id TEXT, popularity INTEGER, FOREIGN KEY (user_id) REFERENCES user (user_id))");
db.query("CREATE TABLE IF NOT EXISTS recommendation (user_id INTEGER, track_id TEXT, list INTEGER, know_song INTEGER, know_artist INTEGER, answer_a INTEGER, waiting_a INTEGER, bot0_a INTEGER, bot1_a INTEGER, bot2_a INTEGER, bot3_a INTEGER, answer_b INTEGER, waiting_b INTEGER, bot0_b INTEGER, bot1_b INTEGER, bot2_b INTEGER, bot3_b INTEGER, FOREIGN KEY (user_id) REFERENCES user (user_id))");

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

function authOptions(code) {
  return {
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
}

function trackOptions(trackId, access_token) {
  return {
    url: 'https://api.spotify.com/v1/tracks/' + trackId + '?market=SE',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  }
};

function getTopTracksOptions(access_token) {
  return {
    url: 'https://api.spotify.com/v1/me/top/tracks?limit=10',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true,
  }
}


function recommendationOptions(access_token, trackId, popularity) {
  return {
    url: 'https://api.spotify.com/v1/recommendations?' +
      querystring.stringify({
        seed_tracks: trackId,
        target_popularity: popularity,
        market: 'SE'
      }),
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  }
};

function profileOptions(access_token) {
  return {
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  }
};

router.get('/song/:id', checkToken, function (req, res) {
  let access_token = req.cookies.access_token;
  let user_id = req.cookies.user_id;
  // get track's detail
  request.get(trackOptions(req.params.id, access_token), function (error, response, trackBody) {
    res.render('song', {
      track: trackBody
    });
  });
})

router.get('/recommendation/:id', checkToken, function (req, res) {
  let randomName = ['James', 'Sathira', 'Micky', 'Steve']
  let access_token = req.cookies.access_token;
  let user_id = req.cookies.user_id;
  // get track's detail
  request.get(trackOptions(req.params.id, access_token), function (error, response, trackBody) {
    let trackId = trackBody.id
    // delete old popularity records if exist
    db.query("DELETE FROM popularity25 WHERE track_id = ? ", [trackId]);
    db.query("DELETE FROM popularity75 WHERE track_id = ? ", [trackId]);
    // get recommendations based on popularity of 25 and 75
    request.get(recommendationOptions(access_token, trackId, 25), function (error, response, popularity25body) {
      randomTracks25 = []
      randomTracks75 = []
      // store data in popularity25 table
      if (popularity25body.tracks) {
        for (let index = 0; index < popularity25body.tracks.length; index++) {
          if (popularity25body.tracks[index]) {
            db.query("REPLACE INTO popularity25 (user_id, track_id, recommendation_id, popularity) VALUES (?,?,?,?)", [user_id, trackId, popularity25body.tracks[index].id, popularity25body.tracks[index].popularity])
            randomTracks25.push(popularity25body.tracks[index].id)
          }
        }
      }
      request.get(recommendationOptions(access_token, trackId, 75), function (error, response, popularity75body) {
        // store data in popularity75 table
        if (popularity75body.tracks) {
          for (let index = 0; index < popularity75body.tracks.length; index++) {
            if (popularity75body.tracks[index]) {
              db.query("REPLACE INTO popularity75 (user_id, track_id, recommendation_id, popularity) VALUES (?,?,?,?)", [user_id, trackId, popularity75body.tracks[index].id, popularity75body.tracks[index].popularity])
              randomTracks75.push(popularity75body.tracks[index].id)
            }
          }
        }
        res.render('recommendation', { randomTracks25: JSON.stringify(randomTracks25), randomTracks75: JSON.stringify(randomTracks75), users: JSON.stringify(randomName) });
      });
    });
  });

});

router.get('/', checkToken, function (req, res) {
  let access_token = req.cookies.access_token;
  let refresh_token = req.cookies.refresh_token;

  // retrive profile information
  request.get(profileOptions(access_token), function (error, response, body) {
    // store data in user table
    db.query("REPLACE INTO user (user_id, country, access_token, refresh_token) VALUES (?,?,?,?)", [body.id, body.country, access_token, refresh_token], function (err, result) {
      console.log(err)
      res.render('index', {
        display_name: body.display_name, country: body.country,
        email: body.email, id: body.id, href: body.href, external_urls: body.external_urls,
        images: body.images
      });
    })

  });
});

router.get('/callback', function (req, res) {
  let code = req.query.code || null;
  let state = req.query.state || null;
  let storedState = req.cookies ? req.cookies[stateKey] : null;
  if (state === null || state !== storedState) {
    res.redirect('/');
  } else {
    res.clearCookie(stateKey);
    request.post(authOptions(code), function (error, response, body) {
      if (!error && response.statusCode === 200) {
        let access_token = body.access_token
        let refresh_token = body.refresh_token
        res.cookie('access_token', access_token);
        res.cookie('refresh_token', refresh_token);
        // retrive current user's id
        request.get(profileOptions(access_token), function (error, response, body) {
          res.cookie('user_id', body.id);
          res.redirect('/');
        });
      } else {
        // handle error
        res.redirect('/');
      }
    });
  }
});

router.get('/tracks', checkToken, function (req, res) {
  let access_token = req.cookies.access_token;
  let user_id = req.cookies.user_id;
  // retrive top tracks
  request.get(getTopTracksOptions(access_token), function (error, response, tracks) {
    let trackSQL = tracks.items.map((track) => track.id); // construct an array of ids
    trackSQL.unshift(user_id) // add user's id at the beginning of an array
    db.query("REPLACE INTO track (user_id, track_1, track_2, track_3, track_4, track_5, track_6, track_7, track_8, track_9, track_10) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", trackSQL);
    res.render('tracks', {
      tracks: tracks.items
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

router.post('/recommendation/', checkToken, function (req, res) {
  let recommendationObject = req.body
  let user_id = recommendationObject.user_id
  let track_id = recommendationObject.track_id
  let list = recommendationObject.list
  let know_song = recommendationObject.know_song
  let know_artist = recommendationObject.know_artist
  let answer_a = recommendationObject.answer_a
  let waiting_a = recommendationObject.waiting_a
  let bot0_a = recommendationObject.bot0_a
  let bot1_a = recommendationObject.bot1_a
  let bot2_a = recommendationObject.bot2_a
  let bot3_a = recommendationObject.bot3_a
  let answer_b = recommendationObject.answer_b
  let waiting_b = recommendationObject.waiting_b
  let bot0_b = recommendationObject.bot0_b
  let bot1_b = recommendationObject.bot1_b
  let bot2_b = recommendationObject.bot2_b
  let bot3_b = recommendationObject.bot3_b
  db.query("INSERT INTO recommendation (user_id, track_id, list, know_song, know_artist, answer_a, waiting_a, bot0_a, bot1_a, bot2_a, bot3_a, answer_b, waiting_b, bot0_b, bot1_b, bot2_b, bot3_b) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [user_id, track_id, list, know_song, know_artist, answer_a, waiting_a, bot0_a, bot1_a, bot2_a, bot3_a, answer_b, waiting_b, bot0_b, bot1_b, bot2_b, bot3_b])
}
);

function checkToken(req, res, next) {
  let token = req.cookies.access_token;
  if (token) {
    // try to retrive profile information
    request.get(profileOptions(token), function (error, response, body) {
      if (body.error) {
        res.render('login')
      }
      else {
        next();
      }
    });
  } else {
    res.render('login')
  }
}

module.exports = router;
