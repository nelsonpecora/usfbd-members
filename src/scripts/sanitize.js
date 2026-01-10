// When comparing user input, we ignore case and any non-letter characters.
module.exports = (str) => str.toLowerCase().replaceAll(/[^a-z]/g, '');