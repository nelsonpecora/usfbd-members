const hash = require('./hash');

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

  const auth = window.sessionStorage.getItem('auth');
  const pageId = window.location.pathname.replace(/\/(.*)\.html/, '$1');

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
  checkCurrentPage();
}

function login (e) {
  e.preventDefault();

  const data = new window.FormData(document.querySelector('#login-form'));
  const id = data.get('id');
  const lastName = data.get('name').toLowerCase().replaceAll(/[^a-z]/g, '');
  const hashed = hash(`${id}${lastName}`);
  const attempts = document.querySelector('.login-attempts');
  const error1 = document.querySelector('.error1');
  const error2 = document.querySelector('.error2');

  attempts.value++;

  // Check to see if this is a real member
  if (!window.hashes[id] || window.hashes[id] !== hashed) {
    error1.classList.add('show');

    if (attempts.value > 1) {
      const link = error2.querySelector('a');

      link.href = link.href.replace('$1', id).replace('$2', lastName);
      error2.classList.add('show');
    }
  } else {
    error1.classList.remove('show');
    error2.classList.remove('show');
    window.sessionStorage.setItem('auth', hashed);
    // Redirect member to their page
    window.location.href = `/${id}.html`;
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
    memberLink.href = `/${memberId}.html`;
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
