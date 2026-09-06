const runIntegrationCleanup = require('./runIntegrationCleanup.cjs');

module.exports = async () => {
  await runIntegrationCleanup({ log: true });
};
