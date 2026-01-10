const hash = require('../scripts/hash');
const sanitize = require('../scripts/sanitize');
const members = require('./members')();

module.exports = () => {
  return members.reduce((acc, member) => {
    const id = member.id;
    const firstName = sanitize(member.firstName);
    const lastName = sanitize(member.lastName);

    acc[id] = hash(`${firstName}${lastName}`);
    return acc;
  }, {});
};
