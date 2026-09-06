#!/usr/bin/env node

import { createServiceClient } from '../tests/integration/supabase/clients.js';
import { cleanupIntegrationTestData } from '../tests/integration/supabase/cleanupIntegrationTestData.js';

try {
  const serviceClient = createServiceClient();
  const summary = await cleanupIntegrationTestData(serviceClient);

  console.log('Integration test data cleanup complete.');
  console.log(`- deleted sale_requests: ${summary.deletedSaleRequests}`);
  console.log(`- deleted sellers: ${summary.deletedSellers}`);
  console.log(`- removed storage objects: ${summary.removedStorageObjects.length}`);
  console.log(`- recruitment status: ${summary.recruitmentStatus}`);

  if (summary.removedStorageObjects.length > 0) {
    for (const objectPath of summary.removedStorageObjects) {
      console.log(`  - ${objectPath}`);
    }
  }
} catch (error) {
  console.error(`Cleanup failed: ${error.message}`);
  process.exit(1);
}
