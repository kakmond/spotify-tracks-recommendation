var express = require('express');
var router = express.Router();

var request = require('request');
var querystring = require('querystring');

var client_id = 'effb4e77d8764a29a23dc735f6f11dfa'; // Your client id
var client_secret = 'ef52e8965b47466e812d2d3ce761e582'; // Your secret
var redirect_uri = 'https://spotify-group.herokuapp.com/callback'; // Your redirect uri
// var redirect_uri = 'http://localhost:3000/callback'; // Your redirect uri

var mysql = require('mysql');
var db = mysql.createConnection({
  host: 'db4free.net',
  user: 'kakmond123',
  password: '13052531',
  database: 'spotifygroup',
});

db.connect();

// create sqlite tables
db.query("CREATE TABLE IF NOT EXISTS user (user_id VARCHAR(36) PRIMARY KEY, country TEXT, access_token TEXT, refresh_token TEXT)");
db.query("CREATE TABLE IF NOT EXISTS track (user_id VARCHAR(36) PRIMARY KEY, track_1 TEXT, track_2 TEXT, track_3 TEXT, track_4 TEXT, track_5 TEXT, track_6 TEXT, track_7 TEXT, track_8 TEXT, track_9 TEXT, track_10 TEXT, FOREIGN KEY (user_id) REFERENCES user (user_id))");
db.query("CREATE TABLE IF NOT EXISTS popularity25 (user_id VARCHAR(36), track_id TEXT, recommendation_id TEXT, popularity INTEGER, FOREIGN KEY (user_id) REFERENCES user (user_id))");
db.query("CREATE TABLE IF NOT EXISTS popularity75 (user_id VARCHAR(36), track_id TEXT, recommendation_id TEXT, popularity INTEGER, FOREIGN KEY (user_id) REFERENCES user (user_id))");
db.query("CREATE TABLE IF NOT EXISTS recommendation (user_id VARCHAR(36), track_id TEXT, recommendation_id TEXT, list INTEGER, know_song INTEGER, know_artist INTEGER, answer_a INTEGER, waiting_a INTEGER, bot0_a INTEGER, bot1_a INTEGER, bot2_a INTEGER, bot3_a INTEGER, answer_b INTEGER, waiting_b INTEGER, bot0_b INTEGER, bot1_b INTEGER, bot2_b INTEGER, bot3_b INTEGER, startTime BIGINT, endTime BIGINT, FOREIGN KEY (user_id) REFERENCES user (user_id))");
db.query("CREATE TABLE IF NOT EXISTS questions (user_id VARCHAR(36), age INTEGER, gender TEXT, home_country TEXT, like_country TEXT, q_1 INTEGER, q_2 INTEGER, q_3 INTEGER, q_4 INTEGER, q_5 INTEGER, q_6 INTEGER, q_7 INTEGER, q_8 INTEGER, q_9 INTEGER, q_10 INTEGER, FOREIGN KEY (user_id) REFERENCES user (user_id))");
db.query("CREATE TABLE IF NOT EXISTS surveys (user_id VARCHAR(36), recommendation_id TEXT, q_1 INTEGER, q_2 INTEGER, q_3 INTEGER, q_4 INTEGER, q_5 INTEGER, q_6 INTEGER, q_7 INTEGER, q_8 INTEGER, q_9 INTEGER, q_10 INTEGER, q_11 INTEGER, q_12 INTEGER, q_13 INTEGER, q_14 INTEGER, q_15 INTEGER, q_16 INTEGER, q_17 INTEGER, q_18 INTEGER, q_19 INTEGER, q_20 INTEGER, q_21 INTEGER, q_22 INTEGER, q_23 INTEGER, q_24 INTEGER, q_25 INTEGER, q_26 INTEGER, q_27 INTEGER, q_28 INTEGER, q_29 INTEGER, q_30 INTEGER, q_31 INTEGER, FOREIGN KEY (user_id) REFERENCES user (user_id))");
db.query("CREATE TABLE IF NOT EXISTS playlist (user_id VARCHAR(36), track_id TEXT, visibility TEXT, track_1 TEXT, track_2 TEXT, track_3 TEXT, track_4 TEXT, track_5 TEXT, track_6 TEXT, track_7 TEXT, track_8 TEXT, track_9 TEXT, track_10 TEXT, FOREIGN KEY (user_id) REFERENCES user (user_id))");
db.query("CREATE TABLE IF NOT EXISTS complete (user_id VARCHAR(36), recommendation_id TEXT, isCompleted BOOLEAN, FOREIGN KEY (user_id) REFERENCES user (user_id))");
db.query("CREATE TABLE IF NOT EXISTS payments (user_id VARCHAR(36), recommendation_id TEXT, code TEXT, FOREIGN KEY (user_id) REFERENCES user (user_id))");
db.query("CREATE TABLE IF NOT EXISTS prolific (profile_id TEXT, link TEXT)");

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
        market: "from_token"
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
  let user_id = req.cookies.user_id;
  const query = `SELECT * FROM payments WHERE user_id = ? AND recommendation_id = ?`
  const values = [user_id, req.params.id]
  db.query(query, values, function (error, payment) {
    if (payment.length > 0) {
      const code = payment[0].code
      res.render('finish', { code });
    }
    else {
      let randomName = ['James', 'Sara', 'Emma', 'Steve']
      let surveys = [
        "I spend a lot of my free time doing music-related activities.",
        "I enjoy writing about music, for example on blogs and forums.",
        "If somebody starts singing a song I don't know, I can usually join in.",
        "I can sing or play music from memory.",
        "I am able to hit the right notes when I sing along with a recording.",
        "I can compare and discuss differences between two performances or versions of the same piece of music.",
        "I have never been complimented for my talents as a musical performer.",
        "I often read or search the internet for things related to music.",
        "Please answer this question with “Disagree“",
        "I am not able to sing in harmony when somebody is singing a familiar tune.",
        "I am able to identify what is special about a given musical piece.",
        "When I sing, I have no idea whether I'm in tune or not.",
        "Music is kind of an addiction for me - I couldn't live without it.",
        "I don’t like singing in public because I’m afraid that I would sing wrong notes.",
        "I would not consider myself a musician.",
        "After hearing a new song two or three times, I can usually sing it by myself.",
        // questions on page 2
        "I am satisfied with the songs that are in the playlist.",
        "The songs in the playlist match my preferences",
        "The songs in the playlist meet my needs.",
        "I do not like the songs in the playlist",
        "I would give the songs in the playlist a high rating.",
        "The playlist could become one of my favorites",
        "I would recommend this playlist to others",
        "Please answer this question with “Agree”",
        "I think I would enjoy listening to the playlist",
        "I am satisfied with the playlist",
        "It was difficult to make a final decision on a song",
        "Working with the group to decide on a song was easy",
        "I had to make a lot of compromises when deciding on a song",
        "The group was similar minded when deciding on a song",
        "Which picture represents your relationship with the group best? The circle around 'X' represents the group, the circle around 'Me' represents you."
      ]
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
                if (popularity25body.tracks[index].preview_url) {
                  db.query("REPLACE INTO popularity25 (user_id, recommendation_id, track_id, popularity) VALUES (?,?,?,?)", [user_id, trackId, popularity25body.tracks[index].id, popularity25body.tracks[index].popularity])
                  randomTracks25.push(popularity25body.tracks[index].id)
                }
              }
            }
          }
          request.get(recommendationOptions(access_token, trackId, 75), function (error, response, popularity75body) {
            // store data in popularity75 table
            if (popularity75body.tracks) {
              for (let index = 0; index < popularity75body.tracks.length; index++) {
                if (popularity75body.tracks[index]) {
                  if (popularity75body.tracks[index].preview_url) {
                    db.query("REPLACE INTO popularity75 (user_id, recommendation_id, track_id, popularity) VALUES (?,?,?,?)", [user_id, trackId, popularity75body.tracks[index].id, popularity75body.tracks[index].popularity])
                    randomTracks75.push(popularity75body.tracks[index].id)
                  }
                }
              }
            }
            res.render('recommendation', { randomTracks25: JSON.stringify(randomTracks25), randomTracks75: JSON.stringify(randomTracks75), users: JSON.stringify(randomName), surveys: JSON.stringify(surveys), recommendation_id: trackId });
          });
        });
      });
    }
  })
});

router.get('/', checkToken, function (req, res) {
  let access_token = req.cookies.access_token;
  let refresh_token = req.cookies.refresh_token;

  // retrive profile information
  request.get(profileOptions(access_token), function (error, response, body) {
    // store data in user table
    db.query("INSERT INTO user (user_id, country, access_token, refresh_token) VALUE (?,?,?,?) ON DUPLICATE KEY UPDATE country = ?, access_token = ?, refresh_token = ?",
      [body.id, body.country, access_token, refresh_token, body.country, access_token, refresh_token], function (err, result) {
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

router.get('/tracks', [checkToken, hasAnsweredQuestions], function (req, res) {
  let access_token = req.cookies.access_token;
  let user_id = req.cookies.user_id;
  // retrive top tracks
  request.get(getTopTracksOptions(access_token), function (error, response, tracks) {
    let trackSQL = tracks.items.map((track) => track.id); // construct an array of ids
    for (let index = 0; index < 11; index++) {
      if (!trackSQL[index]) {
        trackSQL[index] = null
      }
    }
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
  let scope = 'user-read-private user-read-email user-top-read playlist-modify-public playlist-modify-private';
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
  let startTime = recommendationObject.startTime
  let endTime = recommendationObject.endTime
  let recommendation_id = recommendationObject.recommendation_id
  db.query("INSERT INTO recommendation (user_id, track_id, recommendation_id, list, know_song, know_artist, answer_a, waiting_a, bot0_a, bot1_a, bot2_a, bot3_a, answer_b, waiting_b, bot0_b, bot1_b, bot2_b, bot3_b, startTime, endTime) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [user_id, track_id, recommendation_id, list, know_song, know_artist, answer_a, waiting_a, bot0_a, bot1_a, bot2_a, bot3_a, answer_b, waiting_b, bot0_b, bot1_b, bot2_b, bot3_b, startTime, endTime])
}
);

function checkToken(req, res, next) {
  let token = req.cookies.access_token;
  if (token) {
    // try to retrive profile information
    request.get(profileOptions(token), function (error, response, body) {
      if (error || body.error) {
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

router.post('/questions/', checkToken, function (req, res) {
  let questionObject = req.body
  let user_id = req.cookies.user_id;
  let age = questionObject.age
  let gender = questionObject.gender
  let home_country = questionObject.home_country
  let like_country = questionObject.like_country
  let q_1 = questionObject.q_1
  let q_2 = questionObject.q_2
  let q_3 = questionObject.q_3
  let q_4 = questionObject.q_4
  let q_5 = questionObject.q_5
  let q_6 = questionObject.q_6
  let q_7 = questionObject.q_7
  let q_8 = questionObject.q_8
  let q_9 = questionObject.q_9
  let q_10 = questionObject.q_10
  db.query("INSERT INTO questions (user_id, age, gender, home_country, like_country, q_1, q_2, q_3, q_4, q_5, q_6, q_7, q_8, q_9, q_10) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [user_id, age, gender, home_country, like_country, q_1, q_2, q_3, q_4, q_5, q_6, q_7, q_8, q_9, q_10])
  res.redirect('/tracks')
}
);

router.get('/surveys/:id', function (req, res) {
  res.redirect('/recommendation/' + req.params.id);
})

router.post('/surveys/:id', checkToken, function (req, res) {
  let user_id = req.cookies.user_id;
  let questionObject = req.body
  let recommendation_id = req.params.id
  let q_1 = questionObject.q_1
  let q_2 = questionObject.q_2
  let q_3 = questionObject.q_3
  let q_4 = questionObject.q_4
  let q_5 = questionObject.q_5
  let q_6 = questionObject.q_6
  let q_7 = questionObject.q_7
  let q_8 = questionObject.q_8
  let q_9 = questionObject.q_9
  let q_10 = questionObject.q_10
  let q_11 = questionObject.q_11
  let q_12 = questionObject.q_12
  let q_13 = questionObject.q_13
  let q_14 = questionObject.q_14
  let q_15 = questionObject.q_15
  let q_16 = questionObject.q_16
  let q_17 = questionObject.q_17
  let q_18 = questionObject.q_18
  let q_19 = questionObject.q_19
  let q_20 = questionObject.q_20
  let q_21 = questionObject.q_21
  let q_22 = questionObject.q_22
  let q_23 = questionObject.q_23
  let q_24 = questionObject.q_24
  let q_25 = questionObject.q_25
  let q_26 = questionObject.q_26
  let q_27 = questionObject.q_27
  let q_28 = questionObject.q_28
  let q_29 = questionObject.q_29
  let q_30 = questionObject.q_30
  let q_31 = questionObject.q_31
  let code = uid(8)
  db.query("INSERT INTO payments (user_id, recommendation_id, code) VALUES (?,?,?)", [user_id, recommendation_id, code])
  db.query("INSERT INTO surveys (user_id, recommendation_id, q_1, q_2, q_3, q_4, q_5, q_6, q_7, q_8, q_9, q_10, q_11, q_12, q_13, q_14, q_15, q_16, q_17, q_18, q_19, q_20, q_21, q_22, q_23, q_24, q_25, q_26, q_27, q_28, q_29, q_30, q_31) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [user_id, recommendation_id, q_1, q_2, q_3, q_4, q_5, q_6, q_7, q_8, q_9, q_10, q_11, q_12, q_13, q_14, q_15, q_16, q_17, q_18, q_19, q_20, q_21, q_22, q_23, q_24, q_25, q_26, q_27, q_28, q_29, q_30, q_31])
  res.render('finish', { code })
}
);

router.post('/finish', function (req, res) {
  let code = req.body.prolific
  let link = "https://app.prolific.co/submissions/complete?cc=" + code
  db.query("INSERT INTO prolific (profile_id, link) VALUES (?,?)", [code, link])
  res.render('finish2', { link })
})

// router.get('/finish', function (req, res) {
//   let code = req.body.prolific
//   res.render('finish', { code })
// })

function uid(len) {
  var buf = [],
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    charlen = chars.length,
    length = len;

  for (var i = 0; i < length; i++) {
    buf[i] = chars.charAt(Math.floor(Math.random() * charlen));
  }
  return buf.join('');
}

function hasAnsweredQuestions(req, res, next) {
  let user_id = req.cookies.user_id;
  const query = `SELECT * FROM questions WHERE user_id = ?`
  const values = [user_id]
  db.query(query, values, function (error, question) {
    if (question.length > 0) {
      next()
    } else {
      let questions = [
        "Extraverted, enthusiastic.",
        "Critical, quarrelsome.",
        "Dependable, self-disciplined.",
        "Anxious, easily upset.",
        "Open to new experiences, complex.",
        "Reserved, quiet.",
        "Sympathetic, warm.",
        "Disorganized, careless.",
        "Calm, emotionally stable.",
        "Conventional, uncreative."
      ]
      res.render('questions', {
        questions
      });
    }
  })
}

router.post('/playlist/', checkToken, function (req, res) {
  let user_id = req.cookies.user_id;
  let playlistObject = req.body
  let track_id = playlistObject.track_id
  let visibility = playlistObject.visibility
  let track_1 = playlistObject.track_1
  let track_2 = playlistObject.track_2
  let track_3 = playlistObject.track_3
  let track_4 = playlistObject.track_4
  let track_5 = playlistObject.track_5
  let track_6 = playlistObject.track_6
  let track_7 = playlistObject.track_7
  let track_8 = playlistObject.track_8
  let track_9 = playlistObject.track_9
  let track_10 = playlistObject.track_10
  db.query("INSERT INTO playlist (user_id, track_id, visibility, track_1, track_2, track_3, track_4, track_5, track_6, track_7, track_8, track_9, track_10) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [user_id, track_id, visibility, track_1, track_2, track_3, track_4, track_5, track_6, track_7, track_8, track_9, track_10])
}
);

router.post('/complete/', checkToken, function (req, res) {
  let user_id = req.cookies.user_id;
  let completeObject = req.body
  let recommendation_id = completeObject.recommendation_id
  let isCompleted = completeObject.isCompleted
  db.query("INSERT INTO complete (user_id, recommendation_id, isCompleted) VALUES (?,?,?)",
    [user_id, recommendation_id, isCompleted])
}
);


module.exports = router;
