// functions/ testlerinin vitest yapılandırması.
// Kök vitest.config.js'in include desenini (src/__tests__) ezer.
const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    include: ["test/**/*.test.js"]
  }
});
