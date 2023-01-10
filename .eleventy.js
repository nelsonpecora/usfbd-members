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
      target: ['es6']
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
        case 1: place = 'First place'; break;
        case 2: place = 'Second place'; break;
        case 3: place = 'Third place'; break;
        default: place = '';
      }
      return `<strong>${t.name}:</strong> ${place}`;
    }).join('<br />');
  });

  config.addFilter('isEligibleToTest', isEligibleToTest);

  return {
    dir: {
      input: 'src',
      includes: 'includes',
      data: 'data',
      output: 'build'
    }
  }
};
