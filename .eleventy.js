const esbuild = require('esbuild');

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

  // Hydrate hashes on the client
  config.addFilter('json', (val) => JSON.stringify(val));

  return {
    dir: {
      input: 'src',
      includes: 'includes',
      data: 'data',
      output: 'build'
    }
  }
};
