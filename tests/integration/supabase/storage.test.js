/** @jest-environment node */

/*
 * 관련 작업: BE-5 — 비공개 증빙 Storage 정책.
 * 작성 이유: 판매자 증빙은 제한적으로 업로드하고, 저장된 이미지와 구매 증빙은 비로그인 사용자에게 숨겨야 하기 때문.
 * 확인 내용: 업로드 범위, 읽기·수정·목록·삭제 차단, 관리자 signed URL.
 */
import { createAnonClient, createServiceClient } from './clients';
import { TEST_STORAGE_FILES } from './testFixtures';

const SALE_PATH = TEST_STORAGE_FILES['sale-evidence'][0];
const PURCHASE_PATH = TEST_STORAGE_FILES['purchase-evidence'][0];
const IMAGE_BYTES = new Uint8Array([137, 80, 78, 71]);

describe('판매 사진과 구매 증빙이 함부로 보이지 않는지', () => {
  let anonClient;
  let serviceClient;

  beforeAll(async () => {
    anonClient = createAnonClient();
    serviceClient = createServiceClient();
    await serviceClient.storage.from('sale-evidence').remove([SALE_PATH]);
    await serviceClient.storage.from('purchase-evidence').remove([PURCHASE_PATH]);
  });

  afterAll(async () => {
    await serviceClient.storage.from('sale-evidence').remove([SALE_PATH]);
    await serviceClient.storage.from('purchase-evidence').remove([PURCHASE_PATH]);
  });

  test('로그인하지 않은 사용자는 판매 사진을 정해진 경로에만 올릴 수 있다', async () => {
    const { data, error } = await anonClient.storage
      .from('sale-evidence')
      .upload(SALE_PATH, IMAGE_BYTES, { contentType: 'image/png' });

    expect(error).toBeNull();
    expect(data.path).toBe(SALE_PATH);
  });

  test.each([
    ['다운로드', () => anonClient.storage.from('sale-evidence').download(SALE_PATH)],
    [
      '수정',
      () => anonClient.storage.from('sale-evidence').update(SALE_PATH, IMAGE_BYTES),
    ],
  ])('로그인하지 않은 사용자는 판매 사진을 %s할 수 없다', async (_action, request) => {
    const { error } = await request();
    expect(error).not.toBeNull();
  });

  test('로그인하지 않은 사용자는 판매 사진 목록을 볼 수 없다', async () => {
    const { data, error } = await anonClient.storage
      .from('sale-evidence')
      .list('anonymous');

    expect(error).toBeNull();
    expect(data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: expect.stringContaining('be5-integration.png') }),
      ]),
    );
  });

  test('로그인하지 않은 사용자는 판매 사진을 지울 수 없다', async () => {
    const { error } = await anonClient.storage.from('sale-evidence').remove([SALE_PATH]);
    expect(error).toBeNull();

    const { error: serviceDownloadError } = await serviceClient.storage
      .from('sale-evidence')
      .download(SALE_PATH);
    expect(serviceDownloadError).toBeNull();
  });

  test('로그인하지 않은 사용자는 구매 증빙을 올릴 수 없다', async () => {
    const { error } = await anonClient.storage
      .from('purchase-evidence')
      .upload(PURCHASE_PATH, IMAGE_BYTES, { contentType: 'image/png' });

    expect(error).not.toBeNull();
  });

  test('운영자 권한은 비공개 판매 사진을 잠시 열어 볼 주소를 만들 수 있다', async () => {
    const { data, error } = await serviceClient.storage
      .from('sale-evidence')
      .createSignedUrl(SALE_PATH, 60);

    expect(error).toBeNull();
    expect(data.signedUrl).toMatch(/^https:\/\//);
  });
});
