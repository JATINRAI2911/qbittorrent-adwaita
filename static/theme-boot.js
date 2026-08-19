// Applies the saved light/dark choice and accent before the first paint, so dark-mode users never
// see a flash of the light theme. A classic same-origin script (qBittorrent's CSP blocks inline
// ones). Mirrors loadThemeSettings / applyTheme in src/ui/theme.ts; a unit test keeps them in step.
(function () {
  var ACCENTS = {
    blue: '#3584e4',
    teal: '#2190a4',
    green: '#3a944a',
    yellow: '#c88800',
    orange: '#ed5b00',
    red: '#e62d42',
    pink: '#d56199',
    purple: '#9141ac',
    slate: '#6f8396',
  };
  var preference = 'system';
  var accent = 'blue';
  try {
    var saved = JSON.parse(localStorage.getItem('adw-ui.theme') || 'null');
    if (saved && (saved.preference === 'system' || saved.preference === 'light' || saved.preference === 'dark') && Object.prototype.hasOwnProperty.call(ACCENTS, saved.accent)) {
      preference = saved.preference;
      accent = saved.accent;
    }
  } catch (e) {
    // unreadable storage or corrupt JSON: the defaults
  }
  var dark = preference === 'dark' || (preference === 'system' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var root = document.documentElement;
  root.dataset.scheme = dark ? 'dark' : 'light';
  root.style.setProperty('--accent-bg-color', ACCENTS[accent]);
})();
