const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

module.exports = () => {
  const members = fs.readdirSync(__dirname).filter((filepath) => path.extname(filepath) === '.yml');

  return members.reduce((acc, filepath) => {
    const id = path.basename(filepath, path.extname(filepath));
    const data = yaml.load(fs.readFileSync(path.join(__dirname, filepath)));

    if (id !== `${data.id}`) {
      throw new Error(`Cannot fetch member data for ${id}.yml! Member ID in the data is ${data.id}`);
    }

    acc.push(data);
    return acc;
  }, []);
};
