const esbuild = require('esbuild');
const { parseFuzzyDate, formatFuzzyDate } = require('./utils/date');
const { isEligibleToTest } = require('./utils/testing');

module.exports = (config) => {
  // Compile CSS and JS
  config.on('afterBuild', () => {
    return esbuild.build({
      entryPoints: [
        'src/styles/main.css',
        'src/scripts/main.js'
      ],
      outdir: 'build/assets',
      bundle: true,
      minify: true,
      sourcemap: true,
      format: 'iife',
      target: ['es6'],
      loader: { '.png': 'file' }
    });
  });
  config.addWatchTarget('./src/styles/');
  config.addWatchTarget('./src/scripts/');

  // Add svg embedding
  config.addPassthroughCopy({ 'src/img': 'assets/img' });

  // Hydrate hashes on the client
  config.addFilter('json', (val) => JSON.stringify(val));

  // Parse and format fuzzy dates
  config.addFilter('fuzzydate', (val) => {
    const date = parseFuzzyDate(val);

    return formatFuzzyDate(date);
  });

  config.addFilter('formatTaikai', (val) => {
    return val.map((t) => {
      let place;

      switch (t.place) {
        case 1: place = '1st Place'; break;
        case 2: place = '2nd Place'; break;
        case 3: place = '3rd Place'; break;
        default: place = 'Won';
      }
      return `<strong>${place}:</strong> ${t.name}`;
    }).join('<br />');
  });

  config.addFilter('isEligibleToTest', isEligibleToTest);

  config.addFilter('jpRank', (val) => {
    switch (val) {
      case 'Shodan': return '初段';
      case 'Nidan': return '弐段';
      case 'Sandan': return '参段';
      case 'Yondan': return '四段';
      case 'Godan': return '五段';
      case 'Rokudan': return '六段';
      case 'Nanadan': return '七段';
      case 'Hachidan': return '八段';
      case 'Renshi': return '錬士';
      case 'Kyoshi': return '教士';
      case 'Hanshi': return '範士';
    }
  });

  config.addShortcode('logo', (url) => {
    return `<a class="logo" href="${url}">
  <img src="/assets/img/usfbd_logo.svg" />
</a>`;
  });

  config.addGlobalData('email', 'hi@nelson.codes');

  return {
    dir: {
      input: 'src',
      includes: 'includes',
      data: 'data',
      output: 'build'
    }
  }
};
