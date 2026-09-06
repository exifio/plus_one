module.exports = async function runIntegrationCleanup({ log = false } = {}) {
  try {
    const { createServiceClient } = await import('./clients.js');
    const { cleanupIntegrationTestData } = await import('./cleanupIntegrationTestData.js');
    const serviceClient = createServiceClient();
    const summary = await cleanupIntegrationTestData(serviceClient);

    if (log) {
      console.log(
        `[integration cleanup] sale_requests=${summary.deletedSaleRequests}, sellers=${summary.deletedSellers}, storage=${summary.removedStorageObjects.length}, recruitment=${summary.recruitmentStatus}`,
      );
    }

    return summary;
  } catch (error) {
    if (log) {
      console.warn(`[integration cleanup] skipped: ${error.message}`);
    }
    return null;
  }
};
