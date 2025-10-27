/**
 * PostCSS Configuration
 * 
 * PostCSS is a tool for transforming CSS with JavaScript plugins.
 * We use it to process Tailwind CSS and add vendor prefixes.
 * 
 * Plugins:
 * - tailwindcss: Processes Tailwind utility classes
 * - autoprefixer: Adds vendor prefixes for browser compatibility
 */

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

