const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  // This ensures that Chrome is installed in a predictable location on Render
  // and can be found by the runtime.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
