//v1.1.5 2021-04-15
'use strict';

let urlHttpServiceLichess = 'https://lichess.org/api/user/';
let urlHttpServiceChessCom = 'https://api.chess.com/pub/player/';
let intervalID;
let isFirstChessCom = false, inputNode1, inputNode2, tableNode1, tableNode2;
let mapTimeControl = new Map([
  ['player', 0],
  ['bullet', 1],
  ['blitz', 2],
  ['rapid', 3],
  ['puzzle', 4],
  ['rush', 5]
]);
let sortSymbolAtHead = '↑'; //&#8593
let lastSortSelectorLichess = '', lastSortSelectorChessCom = '';
let lastSortTimeControlLichess = '', lastSortTimeControlChessCom = '';
let isMobileDevice = is_mobile_device();
let needRefresh;
let username = '', regtype = '';
let useAJAX = true; //for exchange data between server & client
const DISCONNECTED_TEXT = '  (disconnected)';

inputNode1 = document.querySelector('#InputOrder1');
inputNode2 = document.querySelector('#InputOrder2');
tableNode1 = document.querySelector('#TableOrder1');
tableNode2 = document.querySelector('#TableOrder2');

//MobileStyle
if (isMobileDevice) {
  document.querySelector('#bodyStyle').setAttribute("class", "mobileSyle");
  document.querySelector('.projectName').setAttribute("class", "projectName projectNameDifMobile");
}

// ------------- On-Click ---------------
document.querySelector('.projectName').onclick = () => refresh();

document.querySelector('#buttonLichessRefresh').onclick = () => refreshLichess();
document.querySelector('#buttonChessComRefresh').onclick = () => refreshChessCom();
document.querySelector('#elemCheckLichess').onclick = () => refreshLichess();
document.querySelector('#elemCheckChessCom').onclick = () => refreshChessCom();
document.querySelector('#elemTextLichessOrgPlayerNames').onchange = () => onchangeLichess();
document.querySelector('#elemTextChessComPlayerNames').onchange = () => onchangeChessCom();
document.querySelector('#elemAutoRefreshInterval').onchange = () => onchangeAutoRefreshInterval();

document.querySelector('.THeadPlayerLichess').onclick = () => refreshLichess(); //refresh by click on 1-st Head of Lichess Table
document.querySelector('.THeadPlayerChessCom').onclick = () => refreshChessCom(); //refresh by click on 1-st Head of ChessCom Table

//sort columns in Lichess
document.querySelector('.THeadbulletLichess').onclick = () => sortBulletLichess();
document.querySelector('.THeadblitzLichess').onclick = () => sortBlitzLichess();
document.querySelector('.THeadrapidLichess').onclick = () => sortRapidLichess();
document.querySelector('.THeadpuzzleLichess').onclick = () => sortPuzzleLichess();
document.querySelector('.THeadrushLichess').onclick = () => sortRushLichess();

//sort columns in Chess.com
document.querySelector('.THeadbulletChessCom').onclick = () => sortBulletChessCom();
document.querySelector('.THeadblitzChessCom').onclick = () => sortBlitzChessCom();
document.querySelector('.THeadrapidChessCom').onclick = () => sortRapidChessCom();
document.querySelector('.THeadpuzzleChessCom').onclick = () => sortPuzzleChessCom();
document.querySelector('.THeadrushChessCom').onclick = () => sortRushChessCom();

document.querySelector('#buttonChangeTables').onclick = () => buttonChangeTables();

//settings
document.querySelector('#buttonSettings').onclick = () => goSetMode();
document.querySelector('#elemCheckDarkTheme').onclick = () => onClickSetTheme();
document.querySelector('#buttonClearSettings').onclick = () => clearSettings();
document.querySelector('#buttonReturnToMainFromSettings').onclick = () => goMainModeFromSettings();

//login
document.querySelector('#buttonUser').onclick = () => goUserMode();
document.querySelector('#buttonPostRegistration').onclick = () => postRegistration();
document.querySelector('#buttonPostLogin').onclick = () => postLogin();
document.querySelector('#buttonPostLogout').onclick = () => postLogout();
document.querySelector('#buttonReturnToMainFromUser').onclick = () => goMainModeFromUser();

//hot keys
document.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    refresh();
  }
});

getDataFromStorage();

//set first chess.com
if (isFirstChessCom) {
  changeTablesOrder();
}

setAutoRefresh();

setTheme();

replaceSomeHeads();
window.addEventListener("orientationchange", function () {
  replaceSomeHeads(window.orientation);
}, false);

needRefresh = true;
processUrlParams();

if (needRefresh) {
  refresh();
}

/////////////////// exchange data with server (Login, Logout, Registration, ...) by AJAX /////////////////////////

//fetch 'post registration'
async function postRegistrationAjax() {

  const userPassData = getUserPassDataForPost();
  if (!userPassData) {
    return;
  }
  outputOkMessage('User registration...');

  const response = await fetch('/registrationAJAX', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
    body: userPassData
  });

  if (response.ok) {
    const jsonObj = await response.json();
    console.log('jsonObj: ' + new Date());
    console.log(jsonObj);
    if (jsonObj['errorMsg']) {
      const v = jsonObj['errorMsg']['message'];
      if (v) {
        outputErrorMessage(`Registration error: ${v}`);
      } else {
        outputErrorMessage('Registration unknown error');
      }
      return;
    }
    outputOkMessage('User registered.');

    const user = jsonObj.usernameAfterRegistration;
    if (user) {
      alert('User <' + user + '> registered.'); //delay
      postLoginAjax();
      return;
    } else {
      outputErrorMessage('Impossible to login after registration (username is empty).');
    }
    return;
  }
  outputErrorMessage('Error occured during registration.');
}

//fetch 'post login'
async function postLoginAjax() {

  const userPassData = getUserPassDataForPost();
  if (!userPassData) {
    return;
  }
  outputOkMessage('User login...');

  const response = await fetch('/loginAJAX', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
    },
    body: userPassData
  });

  if (response.ok) {
    const jsonObj = await response.json();
    console.log('jsonObj: ' + new Date());
    console.log(jsonObj);
    if (jsonObj['errorMsg']) {
      const v = jsonObj['errorMsg']['message'];
      if (v) {
        outputErrorMessage(`Login error: ${v}`);
      } else {
        outputErrorMessage('Login unknown error');
      }
      return;
    }
    outputOkMessage('User logged in.');

    let v, v1, v2, v3, v4, v5, v6, v7;

    v = jsonObj.usernameAfterLogin;
    if (v) {
      v1 = jsonObj.regtypeAfterLogin;
      setUsernameAndRegtype(v, v1);
      localStorage.setItem('username', username);
      localStorage.setItem('regtype', regtype);

      //PlayerNamesAfterLogin, isDarkThemeAfterLogin, ...AfterLogin
      v1 = jsonObj.LichessOrgPlayerNamesAfterLogin;
      if (v1) {
        document.getElementById('elemTextLichessOrgPlayerNames').value = v1;
        localStorage.setItem('LichessOrgPlayerNames', v1);
      }

      v2 = jsonObj.ChessComPlayerNamesAfterLogin;
      if (v2) {
        document.getElementById('elemTextChessComPlayerNames').value = v2;
        localStorage.setItem('ChessComPlayerNames', v2);
      }

      v3 = false;
      v = jsonObj.isDarkThemeAfterLogin;
      if (v) {
        v3 = (v === '1' ? true : false);
        document.getElementById('elemCheckDarkTheme').checked = v3;
        localStorage.setItem('DarkThemeChecked', v3 ? '1' : '0');
        setTheme();
      }

      v4 = false;
      v = jsonObj.CheckLichessAfterLogin;
      if (v) {
        v4 = (v === '1' ? true : false);
        document.getElementById('elemCheckLichess').checked = v4;
        localStorage.setItem('LichessChecked', v4 ? '1' : '0');
      }

      v5 = false;
      v = jsonObj.CheckChessComAfterLogin;
      if (v) {
        v5 = (v === '1' ? true : false);
        document.getElementById('elemCheckChessCom').checked = v5;
        localStorage.setItem('ChessComChecked', v5 ? '1' : '0');
      }

      v6 = false;
      v = jsonObj.isFirstChessComAfterLogin;
      if (v) {
        v6 = (v === '1' ? true : false);
        if (v6 !== isFirstChessCom) {
          isFirstChessCom = v6;
          changeTablesOrder();
        }
        localStorage.setItem('isFirstChessCom', v6 ? '1' : '0');
      }

      v7 = jsonObj.autoRefreshIntervalAfterLogin;
      if (v7) {
        document.getElementById('elemAutoRefreshInterval').value = v7;
        localStorage.setItem('AutoRefreshInterval', v7);
      }

      if (v1 || v2 || v3 || v4 || v5 || v6) {
        refresh();
      }
    }

    goMainModeFromUser();
    return;
  }
  outputErrorMessage('Error occured during login.');
}

//fetch 'post logout'
async function postLogoutAjax() {
  outputOkMessage(`${username} logout...`);

  const response = await fetch('/logoutAJAX'); //method GET - by default
  if (response.ok) {
    const jsonObj = await response.json();
    const msg = jsonObj.msg;
    outputOkMessage(`${username} logged out. (${msg})`);

    setUsernameAndRegtype('', '');
    localStorage.setItem('username', '');
    localStorage.setItem('regtype', '');

    goMainModeFromUser();
    return;
  }
  outputErrorMessage('Error occured during logout.');
}

function getUserPassDataForPost() {

  let v;

  //check username
  v = document.querySelector('#username').value.trim();
  if (!v) {
    alert('Fill username !');
    return '';
  } else if (v.toLowerCase() === 'anonym') {
    alert('This username is unacceptable !');
    return '';
  } else if (v.indexOf(' ') >= 0) {
    alert('Username should not contain a space !');
    return '';
  }
  let user = v;

  //check password
  v = document.querySelector('#password').value;
  if (!v) {
    alert('Fill password !');
    return '';
  } else if (v.indexOf(' ') >= 0) {
    alert('Password should not contain a space !');
    return '';
  }
  let pass = v;

  return 'username=' + encodeURIComponent(user) + '&password=' + encodeURIComponent(pass);
}

//send Lichess & Chess.com PlayerNames and other settings to server: AJAX
async function postSettingsAJAX() {
  let usernameLocal = username ? username : 'anonym';
  let data = {
    username: (isUserLogged() ? usernameLocal : ''),
    regtype: regtype,
    LichessOrgPlayerNames: document.getElementById('elemTextLichessOrgPlayerNames').value.trim(),
    ChessComPlayerNames: document.getElementById('elemTextChessComPlayerNames').value.trim(),
    AutoRefreshInterval: document.getElementById('elemAutoRefreshInterval').value.trim(),
    CheckLichess: (document.getElementById('elemCheckLichess').checked ? '1' : '0'),
    CheckChessCom: (document.getElementById('elemCheckChessCom').checked ? '1' : '0'),
    isDarkTheme: (document.getElementById('elemCheckDarkTheme').checked ? '1' : '0'),
    isFirstChessCom: (isFirstChessCom ? '1' : '0')
  };
  try {
    const response = await fetch('/sendUserSettingsToServerAJAX', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(data)
    });
    if (response.ok) {
      const jsonObj = await response.json();
      console.log('jsonObj: ' + new Date());
      console.log(jsonObj);
      if (jsonObj['afterSendUserSettingsToServerAJAX']) {
        return; //ok, send.
      }
      console.log('Error occured during afterSendUserSettingsToServerAJAX.');
      markUserAsDisconnected();
    } else {
      console.log('Error occured during sendUserSettingsToServerAJAX.');
    }
  } catch (err) {
    if (!isUserMarkedAsDisconnected()) {
      //alert('Network/Server error: ' + err.message);
      alert('Network/Server error');
    }
    // console.log('FetchError during sendUserSettingsToServerAJAX:');
    // console.log(err.message);
    markUserAsDisconnected();
  }
}

async function checkAndMarkUserAsDisconnectedAJAX() {
  let data = { username: username };
  const response = await fetch('/isUserLoggedAJAX', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(data)
  });
  if (response.ok) {
    const jsonObj = await response.json();
    console.log('isUserLoggedAJAX: jsonObj: ' + new Date());
    console.log(jsonObj);
    const v = jsonObj['isUserLoggedAJAX'];
    if (v) {
      if (v === '0') {
        markUserAsDisconnected();
      }
      return;
    }
    console.log('Error occured during afterIsUserLoggedAJAX.');
    return;
  }
  console.log('Error occured during isUserLoggedAJAX.');
}

function outputErrorMessage(msg) {
  document.querySelector('#errorMessage').textContent = msg;
  document.querySelector('#okMessage').textContent = '';
}

function outputOkMessage(msg) {
  document.querySelector('#errorMessage').textContent = '';
  document.querySelector('#okMessage').textContent = msg;
}

function clearMessages() {
  document.querySelector('#errorMessage').textContent = '';
  document.querySelector('#okMessage').textContent = '';
}

/////////////////// exchange data with server (Login, Logout, Registration, ...) by reload page /////////////////////////

function processUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  let v, v1, v2, v3, v4, v5, v6, v7, err;

  v1 = urlParams.get('afterSendUserSettingsToServer');
  if (v1) {
    v = localStorage.getItem('username');
    v1 = localStorage.getItem('regtype');
    if (v) {
      setUsernameAndRegtype(v, v1);
    }
    return;
  }

  //show errorMsgAfterRegistration
  err = urlParams.get('errorMsgAfterRegistration');
  if (err) {
    setUsernameAndRegtype('', '');
    alert('errorMsgAfterRegistration: ' + err);
    return;
  }

  //usernameAfterRegistration
  const user = urlParams.get('usernameAfterRegistration');
  if (user) {
    const pass = urlParams.get('passwordAfterRegistration');
    if (pass) {
      alert('User <' + user + '> registered.'); //delay
      postUserAction('/login', user, pass);
    }
    else {
      alert('Impossible to login after registration (password is empty).');
    }
    return;
  }

  //show errorMsgAfterLogin
  err = urlParams.get('errorMsgAfterLogin');
  if (err) {
    alert('errorMsgAfterLogin: ' + err);
    return;
  }

  //usernameAfterLogin, ...AfterLogin
  v = urlParams.get('usernameAfterLogin');
  if (v) {
    v1 = urlParams.get('regtypeAfterLogin');
    setUsernameAndRegtype(v, v1);
    localStorage.setItem('username', username);
    localStorage.setItem('regtype', regtype);

    //PlayerNamesAfterLogin, isDarkThemeAfterLogin, ...AfterLogin
    v1 = urlParams.get('LichessOrgPlayerNamesAfterLogin');
    if (v1) {
      document.getElementById('elemTextLichessOrgPlayerNames').value = v1;
      localStorage.setItem('LichessOrgPlayerNames', v1);
    }

    v2 = urlParams.get('ChessComPlayerNamesAfterLogin');
    if (v2) {
      document.getElementById('elemTextChessComPlayerNames').value = v2;
      localStorage.setItem('ChessComPlayerNames', v2);
    }

    v3 = false;
    v = urlParams.get('isDarkThemeAfterLogin');
    if (v) {
      v3 = (v === '1' ? true : false);
      document.getElementById('elemCheckDarkTheme').checked = v3;
      localStorage.setItem('DarkThemeChecked', v3 ? '1' : '0');
      setTheme();
    }

    v4 = false;
    v = urlParams.get('CheckLichessAfterLogin');
    if (v) {
      v4 = (v === '1' ? true : false);
      document.getElementById('elemCheckLichess').checked = v4;
      localStorage.setItem('LichessChecked', v4 ? '1' : '0');
    }

    v5 = false;
    v = urlParams.get('CheckChessComAfterLogin');
    if (v) {
      v5 = (v === '1' ? true : false);
      document.getElementById('elemCheckChessCom').checked = v5;
      localStorage.setItem('ChessComChecked', v5 ? '1' : '0');
    }

    v6 = false;
    v = urlParams.get('isFirstChessComAfterLogin');
    if (v) {
      v6 = (v === '1' ? true : false);
      if (v6 !== isFirstChessCom) {
        isFirstChessCom = v6;
        changeTablesOrder();
      }
      localStorage.setItem('isFirstChessCom', v6 ? '1' : '0');
    }

    v7 = urlParams.get('autoRefreshIntervalAfterLogin');
    if (v7) {
      document.getElementById('elemAutoRefreshInterval').value = v7;
      localStorage.setItem('AutoRefreshInterval', v7);
    }

    if (v1 || v2 || v3 || v4 || v5 || v6) {
      refresh();
      needRefresh = false;
    }
    return;
  }

  //usernameAfterLogout
  v = urlParams.get('usernameAfterLogout');
  if (v) {
    setUsernameAndRegtype('', '');
    localStorage.setItem('username', ''); //localSession finished
    localStorage.setItem('regtype', '');
    return;
  }

  // //if username already was in localStorage and PageAlreadyWasVisitedAtSession, then suggest to login
  // v = localStorage.getItem('username');
  // if (v) {
  //   v1 = 'PageAlreadyWasVisitedAtThisBrowserTab';
  //   v2 = sessionStorage.getItem(v1);
  //   v2 ? goUserMode() : sessionStorage.setItem(v1, 1);
  //   return;
  // }

  //if username already was in localStorage, then localSession continue !
  v = localStorage.getItem('username');
  v1 = localStorage.getItem('regtype');
  if (v) {
    setUsernameAndRegtype(v, v1); //as logged!

    v1 = 'PageAlreadyWasVisitedAtThisBrowserTab';
    v2 = sessionStorage.getItem(v1);
    if (!v2) {
      sessionStorage.setItem(v1, 1);
      useAJAX ? checkAndMarkUserAsDisconnectedAJAX() : postSettings();
    }
    return;
  }
}

function postLogin() {
  useAJAX ? postLoginAjax() : postCheckAndAction('/login');
}

function postLogout() {
  useAJAX ? postLogoutAjax() : postUserAction('/logout', '1', '1');
}

function postRegistration() {
  useAJAX ? postRegistrationAjax() : postCheckAndAction('/registration');
}

function postCheckAndAction(action) {

  let v;

  //check username
  v = document.querySelector('#username').value.trim();
  if (!v) {
    alert('Fill username !');
    return;
  } else if (v.toLowerCase() === 'anonym') {
    alert('This username is unacceptable !');
    return;
  } else if (v.indexOf(' ') >= 0) {
    alert('Username should not contain a space !');
    return;
  }
  user = v;

  //check password
  v = document.querySelector('#password').value.trim();
  if (!v) {
    alert('Fill password !');
    return;
  } else if (v.indexOf(' ') >= 0) {
    alert('Password should not contain a space !');
    return;
  }
  pass = v;

  postUserAction(action, user, pass);
}

//emulate submit post-action for user: '/login' or '/logout' or '/registration'
function postUserAction(action, username, password) {
  let form = document.createElement('form');
  form.action = action;
  form.method = 'POST';
  form.innerHTML = '<input name="username" value="' + username + '">'
    + '<input name="password" value="' + password + '">';
  document.body.append(form);
  form.submit();
  form.remove();
}

//send Lichess & Chess.com PlayerNames and other settings to server
function postSettings() {
  let usernameLocal = (username ? username : 'anonym');
  let form = document.createElement('form');
  form.action = '/sendUserSettingsToServer';
  form.method = 'POST';
  form.innerHTML = '<input name="username" value="' + usernameLocal + '">'
    + '<input name="regtype" value="' + regtype + '">'
    + '<input name="LichessOrgPlayerNames" value="' + document.getElementById('elemTextLichessOrgPlayerNames').value.trim() + '">'
    + '<input name="ChessComPlayerNames" value="' + document.getElementById('elemTextChessComPlayerNames').value.trim() + '">'
    + '<input name="CheckLichess" value="' + (document.getElementById('elemCheckLichess').checked ? '1' : '0') + '">'
    + '<input name="CheckChessCom" value="' + (document.getElementById('elemCheckChessCom').checked ? '1' : '0') + '">'
    + '<input name="AutoRefreshInterval" value="' + document.getElementById('elemAutoRefreshInterval').value.trim() + '">'
    + '<input name="isDarkTheme" value="' + (document.getElementById('elemCheckDarkTheme').checked ? '1' : '0') + '">'
    + '<input name="isFirstChessCom" value="' + (isFirstChessCom ? '1' : '0') + '">'
    ;
  document.body.append(form);
  form.submit();
  form.remove();
}

/////////////////////////////////////////////////////////////////////////////

function setUsernameAndRegtype(user, type) {
  username = (user ? user : '');
  regtype = (type ? type : '');
  regtype = (regtype === 'userpass' ? '' : regtype);
  document.querySelector('.currentUsername').textContent = username;
}

function isUserLogged() {
  const v1 = document.querySelector('.currentUsername').textContent;
  return (username) && (v1.indexOf(DISCONNECTED_TEXT) === -1);
}

function markUserAsDisconnected() {
  document.querySelector('.currentUsername').textContent = username + DISCONNECTED_TEXT;
}

function isUserMarkedAsDisconnected() {
  const v = document.querySelector('.currentUsername').textContent;
  return (v.indexOf(DISCONNECTED_TEXT) >= 0);
}

/////////////////////////////////////////////////////////////////////////////

//trim() for PlayerNames
function onchangeLichess() {
  let v = document.getElementById('elemTextLichessOrgPlayerNames').value;
  v = (v === undefined ? '' : v);
  document.getElementById('elemTextLichessOrgPlayerNames').value = v.trim();
}
function onchangeChessCom() {
  let v = document.getElementById('elemTextChessComPlayerNames').value;
  v = (v === undefined ? '' : v);
  document.getElementById('elemTextChessComPlayerNames').value = v.trim();
}
function onchangeAutoRefreshInterval() {
  let v = document.getElementById('elemAutoRefreshInterval').value;
  v = (v === undefined ? '' : v);
  document.getElementById('elemAutoRefreshInterval').value = v.trim();
  useAJAX ? postSettingsAJAX() : postSettings();
}

function onClickSetTheme() {
  setDataToStorage();
  setTheme();
}

//replace some heads for 'mobile portrait'
function replaceSomeHeads(windowOrientation) {
  let b, p, useLongWords = false;
  if (windowOrientation === undefined) {
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    useLongWords = !isMobileDevice || mediaQuery.matches; //PC or landscape
  } else {
    useLongWords = (windowOrientation === 90 || windowOrientation === -90); //landscape
  }

  if (useLongWords) {
    //for PC or landscape
    b = 'bullet';
    p = 'puzzle';
  } else {
    //for mobile portrait
    b = 'bull';
    p = 'puzl';
  }

  document.querySelector('.THeadbulletLichess').textContent = b;
  document.querySelector('.THeadpuzzleLichess').textContent = p;
  document.querySelector('.THeadbulletChessCom').textContent = b;
  document.querySelector('.THeadpuzzleChessCom').textContent = p;
}

function sortBulletLichess() {
  const thisIsLichess = true;
  const timeControl = 'bullet';
  sortTable(thisIsLichess, timeControl);
}
function sortBlitzLichess() {
  const thisIsLichess = true;
  const timeControl = 'blitz';
  sortTable(thisIsLichess, timeControl);
}
function sortRapidLichess() {
  const thisIsLichess = true;
  const timeControl = 'rapid';
  sortTable(thisIsLichess, timeControl);
}
function sortPuzzleLichess() {
  const thisIsLichess = true;
  const timeControl = 'puzzle';
  sortTable(thisIsLichess, timeControl);
}
function sortRushLichess() {
  const thisIsLichess = true;
  const timeControl = 'rush';
  sortTable(thisIsLichess, timeControl);
}

function sortBulletChessCom() {
  const thisIsLichess = false;
  const timeControl = 'bullet';
  sortTable(thisIsLichess, timeControl);
}
function sortBlitzChessCom() {
  const thisIsLichess = false;
  const timeControl = 'blitz';
  sortTable(thisIsLichess, timeControl);
}
function sortRapidChessCom() {
  const thisIsLichess = false;
  const timeControl = 'rapid';
  sortTable(thisIsLichess, timeControl);
}
function sortPuzzleChessCom() {
  const thisIsLichess = false;
  const timeControl = 'puzzle';
  sortTable(thisIsLichess, timeControl);
}
function sortRushChessCom() {
  const thisIsLichess = false;
  const timeControl = 'rush';
  sortTable(thisIsLichess, timeControl);
}

//sort columns ('bullet', 'blitz', 'rapid', 'puzzle', 'rush') in Table
function sortTable(thisIsLichess, timeControl) {

  if (timeControl === '') {
    return;
  }

  let tableRef = getChessTableRef(thisIsLichess);
  let r, rowCount = tableRef.rows.length;
  let c, cellcount, cells;
  let s, n, selector, lastSymbol;

  if (rowCount === 0) {
    return;
  }

  let a = new Array(rowCount);

  //fill array from table
  for (r = 0; r < rowCount; r++) {
    cells = tableRef.rows[r].cells;
    cellcount = cells.length;
    a[r] = new Array(cellcount);
    for (c = 0; c < cellcount; c++) {
      s = (c === 0) ? cells[c].innerHTML : cells[c].textContent;
      s = s.trim(); //cell value

      //playerName
      if (c === 0) a[r][c] = s;

      //bullet, blitz, rapid, puzzle, rush ---> to number
      else {
        n = 0;
        if (s !== '') {
          n = parseInt(s, 10);
          if (isNaN(n) || !(Number.isInteger(n))) {
            n = 0;
          }
        }
        a[r][c] = n;
      }
    }
  }

  //sort array in column <timeControl>
  a.sort(function (x, y) {
    let i = mapTimeControl.get(timeControl); //i=1: bullet, i=2: blitz, ...
    // return x[i] - y[i]; //asc
    return y[i] - x[i]; //desc
  })

  //delete sortSymbolAtHead from previous sorted column
  delSortSymbolAtHeadFromPreviousSortedColumn(thisIsLichess);

  // <th class='THeadbulletLichess'>Bullet</th>
  // <th class='THeadbulletChessCom'>Bullet</th>
  selector = '.THead' + timeControl + (thisIsLichess ? 'Lichess' : 'ChessCom');

  //to place sortSymbolAtHead after head of sorted column
  s = document.querySelector(selector).textContent;
  lastSymbol = s.slice(-1);
  if (lastSymbol !== sortSymbolAtHead) {
    document.querySelector(selector).textContent += sortSymbolAtHead;
  }

  //set lastSortSelector
  if (thisIsLichess) {
    lastSortSelectorLichess = selector;
    lastSortTimeControlLichess = timeControl;
  } else {
    lastSortSelectorChessCom = selector;
    lastSortTimeControlChessCom = timeControl;
  }

  //fill table from array
  const pref = thisIsLichess ? '.l' : '.c';
  for (r = 0; r < rowCount; r++) {
    const rowNum = r + 1;
    document.querySelector(pref + 'player' + rowNum).innerHTML = a[r][0]; //innerHTML (because 'href')
    document.querySelector(pref + 'bullet' + rowNum).textContent = a[r][1] === 0 ? '' : a[r][1];
    document.querySelector(pref + 'blitz' + rowNum).textContent = a[r][2] === 0 ? '' : a[r][2];
    document.querySelector(pref + 'rapid' + rowNum).textContent = a[r][3] === 0 ? '' : a[r][3];
    document.querySelector(pref + 'puzzle' + rowNum).textContent = (a[r][4] === 0 ? '' : a[r][4]);
    document.querySelector(pref + 'rush' + rowNum).textContent = (a[r][5] === 0 ? '' : a[r][5]);
  }
}

//delete sortSymbolAtHead from previous sorted column
function delSortSymbolAtHeadFromPreviousSortedColumn(thisIsLichess) {
  let selectorPrev = thisIsLichess ? lastSortSelectorLichess : lastSortSelectorChessCom;
  if (selectorPrev !== '') {
    let s = document.querySelector(selectorPrev).textContent;
    let lastSymbol = s.slice(-1);
    if (lastSymbol === sortSymbolAtHead) {
      document.querySelector(selectorPrev).textContent = s.slice(0, -1);
    }
  }
}

function clearLastSort(thisIsLichess) {
  delSortSymbolAtHeadFromPreviousSortedColumn(thisIsLichess);
  if (thisIsLichess) {
    lastSortSelectorLichess = '';
    lastSortTimeControlLichess = '';
  } else {
    lastSortSelectorChessCom = '';
    lastSortTimeControlChessCom = '';
  }
}

/////////////////////////////////////////////////////////////////////////////

//refresh all tables
function refresh() {
  clearAllTables();

  refreshOneTable(true);
  if (lastSortTimeControlLichess !== '') {
    setTimeout(function () { sortTable(true, lastSortTimeControlLichess) }, 1000); //execute in N ms
  }

  refreshOneTable(false);
  if (lastSortTimeControlChessCom !== '') {
    setTimeout(function () { sortTable(false, lastSortTimeControlChessCom) }, 5000); //execute in N ms
  }
  setDataToStorage();
  // setAutoRefresh();
}

function refreshLichess() {
  const thisIsLichess = true;
  refreshOne(thisIsLichess);
}

function refreshChessCom() {
  const thisIsLichess = false;
  refreshOne(thisIsLichess);
}

function refreshOne(thisIsLichess) {
  clearTable(thisIsLichess);
  clearLastSort(thisIsLichess);
  refreshOneTable(thisIsLichess);
  setDataToStorage();
}

function refreshOneTable(thisIsLichess) {
  replaceSomeHeads();

  let selectorTable = thisIsLichess ? '.TableLichess' : '.TableChessCom';
  let selectorCheck = thisIsLichess ? 'elemCheckLichess' : 'elemCheckChessCom';
  let elem = document.querySelector(selectorTable);
  if (document.getElementById(selectorCheck).checked) {
    if (elem.style.display !== 'block') {
      elem.style.display = 'block'; //table is visible
    }
    clearTable(thisIsLichess);
    fillTableFromServer(thisIsLichess);
  } else {
    if (elem.style.display !== 'none') {
      elem.style.display = 'none'; //table is non-visible
    }
  }
}

function clearAllTables() {
  clearTable(true);
  clearTable(false);
}

function clearTable(thisIsLichess) {
  const pref = thisIsLichess ? '.l' : '.c';
  const n = getTableRowsNumber(thisIsLichess);
  for (let step = 0; step < n; step++) {
    const rowNum = step + 1;
    document.querySelector(pref + 'player' + rowNum).innerHTML = ''; //innerHTML (because 'href')
    document.querySelector(pref + 'bullet' + rowNum).textContent = '';
    document.querySelector(pref + 'blitz' + rowNum).textContent = '';
    document.querySelector(pref + 'rapid' + rowNum).textContent = '';
    document.querySelector(pref + 'puzzle' + rowNum).textContent = '';
    document.querySelector(pref + 'rush' + rowNum).textContent = '';
  }
}

//clear all cells at row (exception: Player)
function clearRow(thisIsLichess, rowNum) {
  const pref = thisIsLichess ? '.l' : '.c';
  document.querySelector(pref + 'bullet' + rowNum).textContent = '';
  document.querySelector(pref + 'blitz' + rowNum).textContent = '';
  document.querySelector(pref + 'rapid' + rowNum).textContent = '';
  document.querySelector(pref + 'puzzle' + rowNum).textContent = '';
  document.querySelector(pref + 'rush' + rowNum).textContent = '';
}

function clearRowLichess(rowNum) {
  const thisIsLichess = true;
  clearRow(thisIsLichess, rowNum);
}

function clearRowChessCom(rowNum) {
  const thisIsLichess = false;
  clearRow(thisIsLichess, rowNum);
}

function fillTableFromServer(thisIsLichess) {
  let elem, playerNames, arPlayerNames, rowNum;
  elem = getElementInputPlayers(thisIsLichess);
  playerNames = elem.value.trim(); //delete begin and end spaces
  arPlayerNames = playerNames.split(' '); //get array of Players names
  rowNum = 0;
  for (let step = 0; step < arPlayerNames.length; step++) {
    const playerName = arPlayerNames[step];
    if (playerName !== '') {
      if (++rowNum > getTableRowsNumber(thisIsLichess)) {
        addRowToTable(thisIsLichess, rowNum);
      }
      fetchTable(thisIsLichess, rowNum, playerName);
    }
  }
  //delete unnecessary last rows (if number of players less than number of rows)
  for (let j = 0; j < 100; j++) {
    if (rowNum++ >= getTableRowsNumber(thisIsLichess)) {
      break;
    }
    deleteLastRowFromTable(thisIsLichess);
  }
}

function getElementInputPlayers(thisIsLichess) {
  const elem = thisIsLichess ? document.getElementById('elemTextLichessOrgPlayerNames') :
    document.getElementById('elemTextChessComPlayerNames');
  return elem;
}

function fetchTable(thisIsLichess, rowNum, playerName) {
  thisIsLichess ? fetchGetLichessOrg(rowNum, playerName) :
    fetchGetChessCom(rowNum, playerName);
}

function getTableRowsNumber(thisIsLichess) {
  const tableRef = getChessTableRef(thisIsLichess);
  return tableRef.rows.length;
}

function getChessTableRef(thisIsLichess) {
  const tableName = thisIsLichess ? '.TBodyLichess' : '.TBodyChessCom';
  const tableRef = document.querySelector(tableName);
  return tableRef;
}

function deleteLastRowFromTable(thisIsLichess) {
  const tableRef = getChessTableRef(thisIsLichess);
  tableRef.deleteRow(-1);
}

function addRowToTable(thisIsLichess, rowNum) {

  let atrClass;
  const letter = thisIsLichess ? 'l' : 'c';

  //create DOM-elements
  const tableRef = getChessTableRef(thisIsLichess);
  //const trRef = document.createElement('tr');
  const trRef = tableRef.insertRow();

  //player
  const textPlayerRef = document.createTextNode('player' + rowNum);
  const thRef = document.createElement('th');
  thRef.setAttribute('scope', 'row');
  atrClass = letter + 'player' + rowNum;
  thRef.setAttribute('class', atrClass);

  //bullet
  const tdBulletRef = document.createElement('td');
  atrClass = letter + 'bullet' + rowNum;
  tdBulletRef.setAttribute('class', atrClass);

  //blitz
  const tdBlitzRef = document.createElement('td');
  atrClass = letter + 'blitz' + rowNum;
  tdBlitzRef.setAttribute('class', atrClass);

  //rapid
  const tdRapidRef = document.createElement('td');
  atrClass = letter + 'rapid' + rowNum;
  tdRapidRef.setAttribute('class', atrClass);

  //puzzle
  const tdPuzzleRef = document.createElement('td');
  atrClass = letter + 'puzzle' + rowNum;
  tdPuzzleRef.setAttribute('class', atrClass);

  //rush
  const tdRushRef = document.createElement('td');
  atrClass = letter + 'rush' + rowNum;
  tdRushRef.setAttribute('class', atrClass);

  //new DOM-elements join to elements on HTML-page
  tableRef.appendChild(trRef);
  trRef.appendChild(thRef);
  thRef.appendChild(textPlayerRef);
  trRef.appendChild(tdBulletRef);
  trRef.appendChild(tdBlitzRef);
  trRef.appendChild(tdRapidRef);
  trRef.appendChild(tdPuzzleRef);
  trRef.appendChild(tdRushRef);
}

//------------------------------------------------------
//fill table's row for player on Lichess.org
async function fetchGetLichessOrg(rowNum, playerName) {

  clearRowLichess(rowNum);

  const url = urlHttpServiceLichess + playerName;
  const response = await fetch(url);
  if (response.ok) { // HTTP-state in 200-299
    const jsonObj = await response.json(); // read answer in JSON

    const isOnline = getJsonValue1(playerName, jsonObj, 'online');
    const onlineSymbol = isOnline ? getOnlineSymbol() + ' ' : '';

    //title (GM, IM, FM, ...)
    let title = getJsonValue1(playerName, jsonObj, 'title');
    title = (title === undefined) ? '' : title + ' ';

    //player (href !)
    const playerURL = getJsonValue1(playerName, jsonObj, 'url');
    document.querySelector('.lplayer' + rowNum).innerHTML = '<a href="' + playerURL + '">' + onlineSymbol + title + playerName + '</a>';

    //bullet
    document.querySelector('.lbullet' + rowNum).textContent = getJsonValue3(playerName, jsonObj, 'perfs', 'bullet', 'rating');
    //blitz
    document.querySelector('.lblitz' + rowNum).textContent = getJsonValue3(playerName, jsonObj, 'perfs', 'blitz', 'rating');
    //rapid
    document.querySelector('.lrapid' + rowNum).textContent = getJsonValue3(playerName, jsonObj, 'perfs', 'rapid', 'rating');
    //puzzle
    document.querySelector('.lpuzzle' + rowNum).textContent = getJsonValue3(playerName, jsonObj, 'perfs', 'puzzle', 'rating');
    //rush (max)
    document.querySelector('.lrush' + rowNum).textContent = getJsonValue3(playerName, jsonObj, 'perfs', 'storm', 'score');

  } else {
    console.log(playerName + ' - lichess, response-error: ' + response.status);
    //player not found
    document.querySelector('.lplayer' + rowNum).innerHTML = '? ' + playerName;
  };
}

//------------------------------------------------------
//fill table's row for player on Chess.com
async function fetchGetChessCom(rowNum, playerName) {

  let url, response, cell, last_online;
  let playerURL = '', onlineSymbol = '', title = '';

  clearRowChessCom(rowNum);

  //is-online
  url = urlHttpServiceChessCom + playerName + '/is-online';
  try {
    response = await fetch(url);
    if (response.ok) { // HTTP-state in 200-299
      let jsonObj = await response.json(); // read answer in JSON
      let isOnline = getJsonValue1(playerName, jsonObj, 'online');
      onlineSymbol = isOnline ? getOnlineSymbol() + ' ' : '';
    } else {
      console.log(playerName + ' - chess.com, is-online, response-error: ' + response.status);
    };
  } catch (err) {
    console.log(playerName + ' - chess.com, is-online, fetch-error: ' + err);
  }

  //player, playerURL
  url = urlHttpServiceChessCom + playerName;
  try {
    response = await fetch(url);
    if (response.ok) { // HTTP-state in 200-299
      let jsonObj = await response.json(); // read answer in JSON
      playerURL = getJsonValue1(playerName, jsonObj, 'url');
      //title (GM, IM, FM, ...)
      title = getJsonValue1(playerName, jsonObj, 'title');
      title = (title === undefined) ? '' : title + ' ';
    } else {
      console.log(playerName + ' - chess.com, playerURL, response-error: ' + response.status);
    };
  } catch (err) {
    console.log(playerName + ' - chess.com, playerURL, fetch-error: ' + err);
  } finally {
    //player
    cell = document.querySelector('.cplayer' + rowNum);
    if (playerURL === ''
      || playerURL === undefined) {
      cell.innerHTML = '? ' + playerName; //player not found
    }
    else {
      cell.innerHTML = '<a href="' + playerURL + '">' + onlineSymbol + title + playerName + '</a>';
    }
  }

  //blitz, bullet, rapid, puzzle, rush
  url = urlHttpServiceChessCom + playerName + '/stats';
  response = await fetch(url);
  if (response.ok) { // HTTP-state in 200-299
    let jsonObj = await response.json(); // read answer in JSON
    //bullet
    document.querySelector('.cbullet' + rowNum).textContent = getJsonValue3(playerName, jsonObj, 'chess_bullet', 'last', 'rating');
    //blitz
    document.querySelector('.cblitz' + rowNum).textContent = getJsonValue3(playerName, jsonObj, 'chess_blitz', 'last', 'rating');
    //rapid
    document.querySelector('.crapid' + rowNum).textContent = getJsonValue3(playerName, jsonObj, 'chess_rapid', 'last', 'rating');
    //puzzle (max)
    document.querySelector('.cpuzzle' + rowNum).textContent = getJsonValue3(playerName, jsonObj, 'tactics', 'highest', 'rating');
    //rush
    document.querySelector('.crush' + rowNum).textContent = getJsonValue3(playerName, jsonObj, 'puzzle_rush', 'best', 'score');
  } else {
    console.log(playerName + ' - chess.com, bullet...rush, fetch-error: ' + response.status);
  };
}

function getJsonValue1(playerName, jsonObj, field1) {
  let value = '';
  try {
    value = jsonObj[field1];
  }
  catch (err) {
    console.log('Error in getJsonValue1(): playerName=' + playerName + ' ' + field1 + ': ' + err);
  }
  return value;
}

function getJsonValue3(playerName, jsonObj, field1, field2, field3) {
  let value = '';
  try {
    value = jsonObj[field1][field2][field3];
  }
  catch (err) {
    console.log('Error in getJsonValue3(): playerName=' + playerName + ' ' + field1 + '.' + field2 + '.' + field3 + ': ' + err);
  }
  return value;
}

function getOnlineSymbol() {
  return '&#10004;'; //check
}

///////////////////////////////////////////////////////////

function goUserMode() {

  clearMessages();

  setElementNonVisible('main');
  setElementNonVisible('#buttonUser');
  setElementVisible('.sectionLoginArea');

  let regtypeLocal = localStorage.getItem('regtype');
  regtypeLocal = regtypeLocal ? regtypeLocal : '';
  if (regtype === 'github' || regtype === 'google' || regtype === 'lichess'
    || regtypeLocal === 'github' || regtypeLocal === 'google' || regtypeLocal === 'lichess') {
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
  } else {
    const v = localStorage.getItem('username');
    document.getElementById('username').value = v ? v : '';
  }

  if (isUserLogged()) {
    document.getElementById('username').setAttribute("disabled", true);
    document.getElementById('password').setAttribute("disabled", true);
    setElementVisible('#buttonPostLogout');
    setElementNonVisible('#buttonPostLogin');
    setElementNonVisible('#buttonPostRegistration');
    setElementNonVisible('.referToGithub');
    setElementNonVisible('.referToGoogle');
    setElementNonVisible('.referToLichess');
  } else {
    document.getElementById('username').removeAttribute("disabled");
    document.getElementById('password').removeAttribute("disabled");
    setElementNonVisible('#buttonPostLogout');
    setElementVisible('#buttonPostLogin');
    setElementVisible('#buttonPostRegistration');
    setElementVisible('.referToGithub');
    setElementVisible('.referToGoogle');
    setElementVisible('.referToLichess');
  }
}

function goMainModeFromUser() {
  setElementNonVisible('.sectionLoginArea');
  setElementVisible('main');
  setElementVisible('#buttonUser');
}

function goSetMode() {
  setElementNonVisible('#buttonUser');
  setElementNonVisible('main');
  setElementVisible('.sectionSettingsArea');
}

function goMainModeFromSettings() {

  //AutoRefreshInterval is correct ?
  let s = document.getElementById('elemAutoRefreshInterval').value.trim();
  if (s !== '') {
    let n = parseInt(s, 10);
    if (isNaN(n) || !(Number.isInteger(n) && n >= 0 && n <= 9999)) {
      alert('Interval must be between 0 and 9999 !');
      return;
    }
    s = n.toString(10);
  }
  document.getElementById('elemAutoRefreshInterval').value = s; //correct
  localStorage.setItem('AutoRefreshInterval', s);
  setAutoRefresh();

  setElementNonVisible('.sectionSettingsArea');
  setElementVisible('main');
  setElementVisible('#buttonUser');
}

function buttonChangeTables() {
  changeTablesOrder();
  setFirstChessComToStorage();
}
function setElementVisible(elem) {
  document.querySelector(elem).style.display = 'block';
}

function setElementNonVisible(elem) {
  document.querySelector(elem).style.display = 'none';
}

//////////////////////////////////////////////////////////

function getDataFromStorage() {
  let v = localStorage.getItem('LichessOrgPlayerNames');
  if (v !== '') {
    document.getElementById('elemTextLichessOrgPlayerNames').value = v;
  }

  v = localStorage.getItem('ChessComPlayerNames');
  if (v !== '') {
    document.getElementById('elemTextChessComPlayerNames').value = v;
  }

  v = localStorage.getItem('LichessChecked');
  document.getElementById('elemCheckLichess').checked = (v === '1' ? true : false);

  v = localStorage.getItem('ChessComChecked');
  document.getElementById('elemCheckChessCom').checked = (v === '1' ? true : false);

  v = localStorage.getItem('isFirstChessCom');
  isFirstChessCom = (v === '1' ? true : false);

  v = localStorage.getItem('AutoRefreshInterval');
  document.getElementById('elemAutoRefreshInterval').value = v;

  v = localStorage.getItem('DarkThemeChecked');
  document.getElementById('elemCheckDarkTheme').checked = (v === '1' ? true : false);
}

function setDataToStorage() {
  let v, isDiff, vs;

  v = document.getElementById('elemTextLichessOrgPlayerNames').value;
  vs = localStorage.getItem('LichessOrgPlayerNames');
  vs = (vs === null ? "" : vs);
  isDiff = (v.trim() !== vs.trim());
  localStorage.setItem('LichessOrgPlayerNames', v);

  v = document.getElementById('elemTextChessComPlayerNames').value;
  vs = localStorage.getItem('ChessComPlayerNames');
  vs = (vs === null ? "" : vs);
  isDiff = isDiff || (v.trim() !== vs.trim());
  localStorage.setItem('ChessComPlayerNames', v);

  v = document.getElementById('elemCheckLichess').checked ? '1' : '0';
  isDiff = isDiff || (v !== localStorage.getItem('LichessChecked'));
  localStorage.setItem('LichessChecked', v);

  v = document.getElementById('elemCheckChessCom').checked ? '1' : '0';
  isDiff = isDiff || (v !== localStorage.getItem('ChessComChecked'));
  localStorage.setItem('ChessComChecked', v);

  v = document.getElementById('elemCheckDarkTheme').checked ? '1' : '0';
  isDiff = isDiff || (v !== localStorage.getItem('DarkThemeChecked'));
  localStorage.setItem('DarkThemeChecked', v);

  if (isDiff /*&& isUserLogged()*/) {
    useAJAX ? postSettingsAJAX() : postSettings();
  }
}

function setFirstChessComToStorage() {
  isFirstChessCom = !isFirstChessCom;
  const v = (isFirstChessCom ? '1' : '');
  localStorage.setItem('isFirstChessCom', v);
  useAJAX ? postSettingsAJAX() : postSettings();
}

function clearSettings() {
  localStorage.clear();

  document.getElementById('elemAutoRefreshInterval').value = '';
  document.getElementById('elemCheckDarkTheme').checked = false;
  document.getElementById('elemTextLichessOrgPlayerNames').value = '';
  document.getElementById('elemTextChessComPlayerNames').value = '';

  if (isFirstChessCom) {
    isFirstChessCom = false;
    changeTablesOrder();
  }

  refresh();
  setAutoRefresh();
  setTheme();

  alert('All settings are cleared.');
}

///////////////////////////////////////////////////////////

function setAutoRefresh() {
  clearInterval(intervalID);
  let s = document.getElementById('elemAutoRefreshInterval').value.trim();
  if (s !== '') {
    let n = parseInt(s, 10);
    if (n !== 0) {
      let milliSeconds = n * 60 * 1000;
      intervalID = setInterval(refresh, milliSeconds);
    }
  } else {
    intervalID = undefined;
  }
}

function changeTablesOrder() {
  let t;

  inputNode2.parentNode.insertBefore(inputNode2, inputNode1);
  t = inputNode1;
  inputNode1 = inputNode2;
  inputNode2 = t;

  tableNode2.parentNode.insertBefore(tableNode2, tableNode1);
  t = tableNode1;
  tableNode1 = tableNode2;
  tableNode2 = t;
}

///////////////////////////////////////////////////////////

function setTheme() {
  const isDarkTheme = document.getElementById('elemCheckDarkTheme').checked;

  const black = 'black';
  const white = 'white';
  if (isDarkTheme) {
    document.body.style.backgroundColor = black;
    document.body.style.color = white;
  } else {
    document.body.style.backgroundColor = white;
    document.body.style.color = black;
  }

  const v = isDarkTheme ? '1' : '0';
  localStorage.setItem('DarkThemeChecked', v);
}

function is_mobile_device() {
  const s = 'ipad|iphone|android|pocket|palm|windows ce|windowsce|cellphone|opera mobi|'
    + 'ipod|small|sharp|sonyericsson|symbian|opera mini|nokia|htc_|samsung|motorola|smartphone|'
    + 'blackberry|playstation portable|tablet browser|webOS|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk';
  const devices = new RegExp(s, "i");
  return devices.test(navigator.userAgent) ? true : false;
}
