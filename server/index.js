//v1.1.7 2021-05-02

//===============================================================================================

/*  EXPRESS SETUP  */

const express = require('express');
const app = express();

const rootDir = __dirname + '/../public';
app.use(express.static(rootDir));

const bodyParser = require('body-parser');

//for saving the session cookie
const expressSession = require('express-session')({
  secret: 'secret 2021',
  resave: false,
  saveUninitialized: false
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressSession);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('App listening on port ' + port));

//===============================================================================================

/*  PASSPORT SETUP  */

const passport = require('passport');

app.use(passport.initialize());
app.use(passport.session());

//===============================================================================================

/* MONGOOSE SETUP */

const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

// const dbConnectString = require('./config/dbConnect').mongoURI;
const dbConnectString = process.env.MongoDBConnectString;
console.log(`dbConnectString = ${dbConnectString}`);
if (dbConnectString === undefined) {
  console.log('It is not defined environment variable "dbConnectString" !');
} else if (!dbConnectString.trim()) {
  console.log('Environment variable "dbConnectString" is empty !');
}

mongoose.connect(dbConnectString,
  { useNewUrlParser: true, useUnifiedTopology: true });

const Schema = mongoose.Schema;
const schemaUserInfo = new Schema({
  username: { type: String, required: true },
  password: { type: String },
  regtype: { type: String, default: 'userpass' },
  createDate: { type: Date, default: Date.now },
  visitCount: { type: Number },
  lastVisitDate: { type: Date },
  CheckLichess: { type: Boolean },
  LichessOrgPlayerNames: { type: String },
  CheckChessCom: { type: Boolean },
  ChessComPlayerNames: { type: String },
  isDarkTheme: { type: Boolean },
  isFirstChessCom: { type: Boolean },
  autoRefreshInterval: { type: String }
});

const schemaUserVisit = new Schema({
  username: { type: String, required: true },
  regtype: { type: String, default: 'userpass' },
  ipAddress: { type: String },
  // userAgent: { type: String },
  isMobileDevice: { type: Boolean },
  visitDate: { type: Date }
});

schemaUserInfo.plugin(passportLocalMongoose);
const objUserInfo = mongoose.model('userInfo', schemaUserInfo, 'userInfo');
const objUserVisit = mongoose.model('userVisit', schemaUserVisit, 'userVisit');

// Make Mongoose use `findOneAndUpdate()`.
// Note that this option is `true` by default, you need to set it to false.
mongoose.set('useFindAndModify', false);

//===============================================================================================

/* PASSPORT-LOCAL AUTHENTICATION */

passport.use(objUserInfo.createStrategy());

//===============================================================================================

/*  PASSPORT-GITHUB AUTHENTICATION  */

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});

const GitHubStrategy = require('passport-github').Strategy;

//from Github
const GITHUB_CLIENT_ID = 'Iv1.45f7cf63babb81e4';
const GITHUB_CLIENT_SECRET = 'ec66574af16042f197cc952f8188c0687e0e6585';

passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: '/auth/github/callback'
},
  function (accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
  }
));

app.get('/auth/github',
  passport.authenticate('github'));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/errorMsgAfterLogin=Error after Github login !' }),
  function (req, res) {
    //fill userVisit for current user: set ipAddress, userAgent, ...
    const usernameLocal = req.user.username.trim() + '@github.com';
    console.log(`${new Date()} \n/auth/github/callback github username: ${usernameLocal}`);
    const visitDateLocal = new Date();
    const regtypeLocal = 'github';
    objUserVisit_create(req, usernameLocal, regtypeLocal, visitDateLocal);

    //fill userInfo for current user: set lastVisitDate and ++visitCount
    objUserInfo_redirectAfterLogin(res, usernameLocal, regtypeLocal, visitDateLocal);
  });

//===============================================================================================

/*  PASSPORT-GOOGLE AUTHENTICATION  */

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

//from Google-OAuth2
const GOOGLE_CLIENT_ID = '727821675635-1ae7t5fqtr2k1fq0993hjpg0jo0e8tq6';
const GOOGLE_CLIENT_SECRET = 'bpMWr7OZY6wEbLVQb0f4MjY5';

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
},
  function (accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
  }
));

app.get('/auth/google',
  passport.authenticate('google',
    {
      scope:
        ['https://www.googleapis.com/auth/plus.login',  //displayName, id
          'https://www.googleapis.com/auth/userinfo.email' //_json.email
        ]
    })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/errorMsgAfterLogin=Error after Google login !' }),
  function (req, res) {
    const usernameLocal = req.user._json.email.trim();
    console.log(`${new Date()} \n/auth/google/callback google username: ${usernameLocal}`);
    const visitDateLocal = new Date();
    const regtypeLocal = 'google';
    //fill userVisit for current user: set ipAddress, userAgent, ...
    objUserVisit_create(req, usernameLocal, regtypeLocal, visitDateLocal);
    //fill userInfo for current user: set lastVisitDate and ++visitCount
    objUserInfo_redirectAfterLogin(res, usernameLocal, regtypeLocal, visitDateLocal);
  });

//===============================================================================================

/*  PASSPORT-LICHESS AUTHENTICATION  */

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});

const LichessStrategy = require('passport-lichess').Strategy;

//BOVLichessAppLocal:
// const LICHESS_CLIENT_ID = 'Y3QCYxTU2PduhgGw';
// const LICHESS_CLIENT_SECRET = '4b5Vm7MS1agzSsuv2gBwAGE7sGlUPh0P';

//BOVLichessAppGlitch:
// const LICHESS_CLIENT_ID = 'yLGGu8y7DlLYJnbT';
// const LICHESS_CLIENT_SECRET = 'NK7W9IsCi99xBkUbJhi7CD6nAEiL9UBq';

//BOVLichessAppHeroku:
const LICHESS_CLIENT_ID = 'tLZgJi7QYxpHLscz';
const LICHESS_CLIENT_SECRET = 'JgmiL8LU8y1LdNMLlEbpLPeX9iSwHRVI';

passport.use(new LichessStrategy({
  clientID: LICHESS_CLIENT_ID,
  clientSecret: LICHESS_CLIENT_SECRET,
  callbackURL: '/auth/lichess/callback'
},
  function (accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
    // User.findOrCreate({ lichessId: profile.id }, function (err, user) {
    //   return cb(err, user);
  }
));

app.get('/auth/lichess',
  passport.authenticate('lichess'));

app.get('/auth/lichess/callback',
  passport.authenticate('lichess', { failureRedirect: '/errorMsgAfterLogin=Error after Lichess login !' }),
  function (req, res) {
    //fill userVisit for current user: set ipAddress, userAgent, ...
    const usernameLocal = req.user.username.trim() + '@lichess.org';
    console.log(`${new Date()} \n/auth/lichess/callback lichess username: ${usernameLocal}`);
    const visitDateLocal = new Date();
    const regtypeLocal = 'lichess';
    objUserVisit_create(req, usernameLocal, regtypeLocal, visitDateLocal);

    //fill userInfo for current user: set lastVisitDate and ++visitCount
    objUserInfo_redirectAfterLogin(res, usernameLocal, regtypeLocal, visitDateLocal);
  });

//===============================================================================================

/* ROUTES */

const connectEnsureLogin = require('connect-ensure-login');

app.post('/registration', (req, res, next) => {
  passport.authenticate('local',
    (err, user, info) => {
      if (err) {
        console.log('/registration: err:');
        console.log(err);
        return next(err);
      }
      if (user) {
        return res.redirect('/?errorMsgAfterRegistration=This account already exist !');
      }
      objUserInfo.register({ username: req.body.username, active: false }, req.body.password); //+fill createDate
      return res.redirect('/?usernameAfterRegistration=' + encodeURIComponent(req.body.username)
        + '&passwordAfterRegistration=' + encodeURIComponent(req.body.password));
    })(req, res, next);
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local',
    (err, user, info) => {
      if (err) {
        console.log('/login1: err:');
        console.log(err);
        return next(err);
      }
      if (!user) {
        return res.redirect('/?errorMsgAfterLogin=' + info);
      }
      req.logIn(user, function (err) {
        if (err) {
          console.log('/login2: err:');
          console.log(err);
          return next(err);
        }
        //fill userVisit for current user: set ipAddress, userAgent, ...
        const usernameLocal = user.username;
        const visitDateLocal = (user.lastVisitDate === undefined ? user.createDate : new Date());
        const regtypeLocal = 'userpass';
        objUserVisit_create(req, usernameLocal, regtypeLocal, visitDateLocal);

        //fill userInfo for current user: set lastVisitDate and ++visitCount
        objUserInfo_redirectAfterLogin(res, usernameLocal, regtypeLocal, visitDateLocal);
      });
    })(req, res, next);
});

app.post('/logout', function (req, res) {
  req.logout();
  res.redirect('/?usernameAfterLogout=1');
});

//save user settings in userInfo
app.post('/sendUserSettingsToServer',
  connectEnsureLogin.ensureLoggedIn(), //only if user logged in
  (req, res) => {
    console.log(new Date()
      + '\n/sendUserSettingsToServer ' + req.body.username);
    console.log(req.body);
    const usernameLocal = req.body.username ? req.body.username : 'anonym';
    const visitDateLocal = new Date();
    const regtypeLocal = req.body.regtype ? req.body.regtype : 'userpass';
    objUserVisit_create(req, usernameLocal, regtypeLocal, visitDateLocal);

    objUserInfo.updateOne({ username: usernameLocal },
      {
        regtype: regtypeLocal,
        LichessOrgPlayerNames: req.body.LichessOrgPlayerNames,
        ChessComPlayerNames: req.body.ChessComPlayerNames,
        autoRefreshInterval: req.body.AutoRefreshInterval,
        CheckLichess: req.body.CheckLichess === '1' ? true : false,
        CheckChessCom: req.body.CheckChessCom === '1' ? true : false,
        isDarkTheme: req.body.isDarkTheme === '1' ? true : false,
        isFirstChessCom: req.body.isFirstChessCom === '1' ? true : false,
        lastVisitDate: visitDateLocal
      },
      function (err, result) {
        if (err) {
          console.log('/sendUserSettingsToServer: err:');
          console.log(err);
        }
      });
    res.redirect('/?afterSendUserSettingsToServer=1');
  });

app.post('/registrationAJAX', (req, res, next) => {
  passport.authenticate('local',
    (err, user, info) => {
      if (err) {
        console.log('/registrationAJAX: err:');
        console.log(err);
        return next(err);
      }
      if (user) {
        res.send({ errorMsg: 'This account (${req.body.username}) already exist !' });
        return;
      }
      objUserInfo.register({ username: req.body.username, active: false }, req.body.password); //+fill createDate
      res.send({
        usernameAfterRegistration: req.body.username
      });
    })(req, res, next);
});

app.post('/loginAJAX', (req, res, next) => {
  passport.authenticate('local',
    (err, user, info) => {
      if (err) {
        console.log('/loginAJAX1: err:');
        console.log(err);
        return next(err);
      }
      if (!user) {
        res.send({ errorMsg: info });
        return;
      }
      req.logIn(user, function (err) {
        if (err) {
          console.log('/loginAJAX2: err:');
          console.log(err);
          return next(err);
        }
        //fill userVisit for current user: set ipAddress, userAgent, ...
        const usernameLocal = user.username;
        const visitDateLocal = (user.lastVisitDate === undefined ? user.createDate : new Date());
        const regtypeLocal = 'userpass';
        objUserVisit_create(req, usernameLocal, regtypeLocal, visitDateLocal);

        //fill userInfo for current user: set lastVisitDate and ++visitCount
        objUserInfo_AfterLogin_AJAX(res, usernameLocal, regtypeLocal, visitDateLocal);
      });
    })(req, res, next);
});

app.get('/logoutAJAX', function (req, res) {
  console.log(new Date() + '\n/logoutAJAX');
  req.logout();
  res.send({ msg: 'Server: logout executed.' });
});

//save user settings in userInfo
app.post('/sendUserSettingsToServerAJAX',
  connectEnsureLogin.ensureLoggedIn(), //only if user logged in
  (req, res) => {
    console.log(new Date()
      + '\n/sendUserSettingsToServerAJAX ' + req.body.username);
    console.log(req.body);
    const usernameLocal = req.body.username ? req.body.username : 'anonym';
    const visitDateLocal = new Date();
    const regtypeLocal = req.body.regtype ? req.body.regtype : 'userpass';
    objUserVisit_create(req, usernameLocal, regtypeLocal, visitDateLocal);

    objUserInfo.updateOne({ username: usernameLocal },
      {
        regtype: regtypeLocal,
        LichessOrgPlayerNames: req.body.LichessOrgPlayerNames,
        ChessComPlayerNames: req.body.ChessComPlayerNames,
        autoRefreshInterval: req.body.AutoRefreshInterval,
        CheckLichess: req.body.CheckLichess === '1' ? true : false,
        CheckChessCom: req.body.CheckChessCom === '1' ? true : false,
        isDarkTheme: req.body.isDarkTheme === '1' ? true : false,
        isFirstChessCom: req.body.isFirstChessCom === '1' ? true : false,
        lastVisitDate: visitDateLocal
      },
      function (err, result) {
        if (err) {
          console.log('/sendUserSettingsToServerAJAX: err:');
          console.log(err);
        }
      }
    );

    res.send({ afterSendUserSettingsToServerAJAX: '1' });
  });

//check by POST: if user logged in
app.post('/isUserLoggedAJAX',
  (req, res) => {
    const usernameLocal = req.body.username;
    let isUserLogged = (req.isAuthenticated && req.isAuthenticated() && req['user'] && req.user.username === usernameLocal);
    console.log(`${new Date()} \n/isUserLoggedAJAX for ${usernameLocal}: ${isUserLogged}`);
    res.send({ isUserLoggedAJAX: (isUserLogged ? '1' : '0') });
  });

app.get('/',
  (req, res) => { res.sendFile('html/index.html', { root: rootDir }) }
);

//===============================================================================================

//===============================================================================================

//fill userVisit for current user: set ipAddress, userAgent, ...
function objUserVisit_create(req, usernameLocal, regtypeLocal, visitDateLocal) {
  const ipAddressLocal = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgentLocal = req.headers['user-agent'];
  objUserVisit.create(
    {
      username: usernameLocal,
      regtype: regtypeLocal,
      ipAddress: ipAddressLocal,
      // userAgent: userAgentLocal,
      isMobileDevice: isMobileDevice(userAgentLocal),
      visitDate: visitDateLocal
    });
}

//AJAX: fill userInfo for current user: set lastVisitDate and ++visitCount
function objUserInfo_AfterLogin_AJAX(res, usernameLocal, regtypeLocal, lastVisitDateLocal) {
  objUserInfo.findOneAndUpdate({ username: usernameLocal, regtype: regtypeLocal },
    { lastVisitDate: lastVisitDateLocal, $inc: { visitCount: 1 } },
    { new: true, upsert: true },
    function (err, doc) {
      if (err) {
        console.log(new Date());
        console.log('error in objUserInfo_AfterLogin_AJAX:');
        console.log(err);
      } else {
        doc.save(); //fill createDate
        let LichessOrgPlayerNamesLocal = doc.LichessOrgPlayerNames === undefined ? '' : doc.LichessOrgPlayerNames;
        let ChessComPlayerNamesLocal = doc.ChessComPlayerNames === undefined ? '' : doc.ChessComPlayerNames;
        let autoRefreshIntervalLocal = doc.autoRefreshInterval === undefined ? '' : doc.autoRefreshInterval;
        let CheckLichessLocal = (doc.CheckLichess === true ? true : false);
        let CheckChessComLocal = (doc.CheckChessCom === true ? true : false);
        let isDarkThemeLocal = (doc.isDarkTheme === true ? true : false);
        let isFirstChessComLocal = (doc.isFirstChessCom === true ? true : false);
        console.log(new Date()
          + '\n/loginAJAX ' + usernameLocal
          + '\n  regtype = ' + regtypeLocal
          + '\n  LichessOrgPlayerNames = ' + LichessOrgPlayerNamesLocal
          + '\n  ChessComPlayerNames = ' + ChessComPlayerNamesLocal
          + '\n  autoRefreshInterval = ' + autoRefreshIntervalLocal
          + '\n  CheckLichess = ' + CheckLichessLocal
          + '\n  CheckChessCom = ' + CheckChessComLocal
          + '\n  isDarkTheme = ' + isDarkThemeLocal
          + '\n  isFirstChessCom = ' + isFirstChessComLocal
        );
        res.send({
          usernameAfterLogin: usernameLocal,
          regtypeAfterLogin: regtypeLocal,
          autoRefreshIntervalAfterLogin: autoRefreshIntervalLocal,
          LichessOrgPlayerNamesAfterLogin: LichessOrgPlayerNamesLocal,
          ChessComPlayerNamesAfterLogin: ChessComPlayerNamesLocal,
          CheckLichessAfterLogin: (CheckLichessLocal ? '1' : '0'),
          CheckChessComAfterLogin: (CheckChessComLocal ? '1' : '0'),
          isDarkThemeAfterLogin: (isDarkThemeLocal ? '1' : '0'),
          isFirstChessComAfterLogin: (isFirstChessComLocal ? '1' : '0')
        }
        );
      }
    });
  //q.then((err, result) => { //this 'then' isn't a promise: mongoosejs.com/docs/queries.html#queries-are-not-promises
}

//fill userInfo for current user: set lastVisitDate and ++visitCount
function objUserInfo_redirectAfterLogin(res, usernameLocal, regtypeLocal, lastVisitDateLocal) {
  objUserInfo.findOneAndUpdate({ username: usernameLocal, regtype: regtypeLocal },
    { lastVisitDate: lastVisitDateLocal, $inc: { visitCount: 1 } },
    { new: true, upsert: true },
    function (err, doc) {
      if (err) {
        console.log(new Date());
        console.log('error in objUserInfo_redirectAfterLogin:');
        console.log(err);
      } else {
        let LichessOrgPlayerNamesLocal = doc.LichessOrgPlayerNames === undefined ? '' : doc.LichessOrgPlayerNames;
        let ChessComPlayerNamesLocal = doc.ChessComPlayerNames === undefined ? '' : doc.ChessComPlayerNames;
        let autoRefreshIntervalLocal = doc.autoRefreshInterval === undefined ? '' : doc.autoRefreshInterval;
        let CheckLichessLocal = (doc.CheckLichess === true ? true : false);
        let CheckChessComLocal = (doc.CheckChessCom === true ? true : false);
        let isDarkThemeLocal = (doc.isDarkTheme === true ? true : false);
        let isFirstChessComLocal = (doc.isFirstChessCom === true ? true : false);
        console.log(new Date()
          + '\n/login ' + usernameLocal
          + '\n  regtype = ' + regtypeLocal
          + '\n  LichessOrgPlayerNames = ' + LichessOrgPlayerNamesLocal
          + '\n  ChessComPlayerNames = ' + ChessComPlayerNamesLocal
          + '\n  autoRefreshInterval = ' + autoRefreshIntervalLocal
          + '\n  CheckLichess = ' + CheckLichessLocal
          + '\n  CheckChessCom = ' + CheckChessComLocal
          + '\n  isDarkTheme = ' + isDarkThemeLocal
          + '\n  isFirstChessCom = ' + isFirstChessComLocal
        );
        res.redirect('/?usernameAfterLogin=' + encodeURIComponent(usernameLocal)
          + '&regtypeAfterLogin=' + encodeURIComponent(regtypeLocal)
          + '&LichessOrgPlayerNamesAfterLogin=' + encodeURIComponent(LichessOrgPlayerNamesLocal)
          + '&ChessComPlayerNamesAfterLogin=' + encodeURIComponent(ChessComPlayerNamesLocal)
          + '&autoRefreshIntervalAfterLogin=' + encodeURIComponent(autoRefreshIntervalLocal)
          + '&CheckLichessAfterLogin=' + (CheckLichessLocal ? '1' : '0')
          + '&CheckChessComAfterLogin=' + (CheckChessComLocal ? '1' : '0')
          + '&isDarkThemeAfterLogin=' + (isDarkThemeLocal ? '1' : '0')
          + '&isFirstChessComAfterLogin=' + (isFirstChessComLocal ? '1' : '0')
        );
        doc.save(); //fill createDate
      }
    });
  //q.then((err, rezult) => { //this 'then' isn't a promise: mongoosejs.com/docs/queries.html#queries-are-not-promises
}

//===============================================================================================

function isMobileDevice(userAgent) {
  const s = 'ipad|iphone|android|pocket|palm|windows ce|windowsce|cellphone|opera mobi|'
    + 'ipod|small|sharp|sonyericsson|symbian|opera mini|nokia|htc_|samsung|motorola|smartphone|'
    + 'blackberry|playstation portable|tablet browser|webOS|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk';
  const devices = new RegExp(s, "i");
  return devices.test(userAgent) ? true : false;
}
