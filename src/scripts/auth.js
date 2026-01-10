const hash = require('./hash');
const sanitize = require('./sanitize');

function getCurrentPage () {
  const path = window.location.pathname;

  if (path === '/') {
    return 'home';
  } else if (path === '404.html') {
    return '404';
  } else {
    return 'member';
  }
}

function checkAuthMemberPage () {
  // Fetch auth from session storage.
  const loading = document.querySelector('.loading');
  const loggedOut = document.querySelector('.logged-out');
  const loggedIn = document.querySelector('.logged-in');
  const logoutBtn = document.querySelector('#logout-btn');

  logoutBtn.addEventListener('click', logout);

  const auth = window.sessionStorage.getItem('auth');
  const pageId = window.location.pathname.replace(/\/member\/(.*)\.html/, '$1');

  if (!auth || parseInt(auth) !== window.hashes[pageId]) {
    loading.classList.remove('show');
    loggedOut.classList.add('show');
  } else {
    loading.classList.remove('show');
    loggedIn.classList.add('show');
  }
}

function logout () {
  window.sessionStorage.removeItem('auth');
  window.location.href = '/';
}

function login (e) {
  e.preventDefault();

  const data = new window.FormData(document.querySelector('#login-form'));
  const id = data.get('id');
  const firstName = sanitize(data.get('firstName'));
  const lastName = sanitize(data.get('lastName'));
  const attempts = document.querySelector('.login-attempts');
  const error1 = document.querySelector('.error1');
  const error2 = document.querySelector('.error2');

  const hashed = hash(`${firstName}${lastName}`);
  const loginType = id ? 'id' : 'name';

  attempts.value++;

  // When logging in by ID only, we don't match the hashed name.
  if (loginType === 'id') {
    if (!window.hashes[id]) {
      error1.classList.add('show');

      if (attempts.value > 1) {
        error2.classList.add('show');
      }
      return;
    } else {
      error1.classList.remove('show');
      error2.classList.remove('show');
      window.sessionStorage.setItem('auth', window.hashes[id]);
      // Redirect member to their page
      window.location.href = `/member/${id}.html`;
      return;
    }
  }

  // When logging in by name, we hash it and match against the stored hashes.
  const foundId = getIdFromAuth(hashed);

  // Check to see if this is a real member
  if (!foundId || !window.hashes[foundId]) {
    error1.classList.add('show');

    if (attempts.value > 1) {
      error2.classList.add('show');
    }
  } else {
    error1.classList.remove('show');
    error2.classList.remove('show');
    window.sessionStorage.setItem('auth', hashed);
    // Redirect member to their page
    window.location.href = `/member/${foundId}.html`;
  }
}

function getIdFromAuth (auth) {
  return Object.keys(window.hashes).find((key) => {
    return window.hashes[key] === parseInt(auth);
  });
}

function checkAuthIndexPage () {
  // Fetch auth from session storage.
  const loggedOut = document.querySelector('.logged-out');
  const loggedIn = document.querySelector('.logged-in');
  const memberLink = document.querySelector('.logged-in a');
  const logoutBtn = document.querySelector('.logout-btn');

  const auth = window.sessionStorage.getItem('auth');
  const memberId = auth && getIdFromAuth(auth);

  if (memberId) {
    loggedOut.classList.remove('show');
    memberLink.href = `/member/${memberId}.html`;
    logoutBtn.addEventListener('click', logout);
    loggedIn.classList.add('show');
  } else {
    loggedIn.classList.remove('show');
    loggedOut.addEventListener('submit', login);
    loggedOut.classList.add('show');
  }
}

function checkCurrentPage () {
  const page = getCurrentPage();

  if (page === 'home') {
    checkAuthIndexPage();
  }

  if (page === 'member') {
    checkAuthMemberPage();
  }
}

module.exports.checkCurrentPage = checkCurrentPage;
