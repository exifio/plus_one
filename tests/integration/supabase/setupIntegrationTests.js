import { createServiceClient } from './clients.js';
import { cleanupIntegrationTestData } from './cleanupIntegrationTestData.js';

async function cleanupIntegrationTestArtifacts() {
  try {
    const serviceClient = createServiceClient();
    await cleanupIntegrationTestData(serviceClient);
  } catch {
    // .env.test.local이 없으면 integration test 본문에서 실패한다.
  }
}

beforeAll(cleanupIntegrationTestArtifacts);
afterAll(cleanupIntegrationTestArtifacts);
