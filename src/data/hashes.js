const hash = require('../scripts/hash');
const members = require('./members')();

module.exports = () => {
  return members.reduce((acc, member) => {
    const id = member.id;
    const lastName = member.lastName.toLowerCase().replaceAll(/[^a-z]/g, '');

    acc[id] = hash(`${id}${lastName}`);
    return acc;
  }, {});
};
