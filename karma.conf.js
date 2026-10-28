// Karma configuration file for Angular unit tests.
// Uses a no-sandbox Chrome launcher in CI to avoid Ubuntu namespace sandbox issues.
function FailureSummaryReporter(formatError) {
  let failures = [];

  this.onRunStart = () => { failures = []; };
  this.onSpecComplete = (browser, result) => {
    if (!result.success && !result.skipped) {
      failures.push({ browser, result });
    }
  };
  this.onRunComplete = () => {
    if (failures.length === 0) return;

    process.stdout.write('\nFailed tests:\n');
    failures.forEach(({ browser, result }, index) => {
      const name = result.fullName || [...result.suite, result.description].join(' ');
      process.stdout.write(`${index + 1}) ${name} (${browser})\n`);
      result.log.forEach(log => process.stdout.write(formatError(log, '   ')));
    });
  };
}
FailureSummaryReporter.$inject = ['formatError'];

module.exports = function (config) {
  const isCI = !!process.env.CI;

  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
      { 'reporter:failure-summary': ['type', FailureSummaryReporter] },
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/bae-frontend'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: isCI ? ['dots', 'failure-summary'] : ['progress'],
    browserConsoleLogOptions: {
      level: isCI ? 'error' : 'debug',
      terminal: true,
    },
    port: 9876,
    colors: !isCI,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: [isCI ? 'ChromeHeadlessNoSandbox' : 'ChromeHeadless'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      },
    },
    singleRun: false,
    restartOnFileChange: true,
  });
};
