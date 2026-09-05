/** @jest-environment node */

/*
 * 관련 작업: BE-5 — 비공개 증빙 Storage 정책.
 * 작성 이유: 판매자 증빙은 제한적으로 업로드하고, 저장된 이미지와 구매 증빙은 비로그인 사용자에게 숨겨야 하기 때문.
 * 확인 내용: 업로드 범위, 읽기·수정·목록·삭제 차단, 관리자 signed URL.
 */
import { createAnonClient, createServiceClient } from './clients';

const SALE_PATH = 'anonymous/be5-integration.png';
const PURCHASE_PATH = 'admin/be5-integration.png';
const IMAGE_BYTES = new Uint8Array([137, 80, 78, 71]);

describe('비공개 증빙 저장소 접근 권한', () => {
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

  test('anon은 sale-evidence의 anonymous 경로에만 업로드할 수 있다', async () => {
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
  ])('anon은 sale-evidence %s를 할 수 없다', async (_action, request) => {
    const { error } = await request();
    expect(error).not.toBeNull();
  });

  test('anon 목록에는 sale-evidence object가 노출되지 않는다', async () => {
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

  test('anon 삭제 요청은 sale-evidence object를 제거하지 않는다', async () => {
    const { error } = await anonClient.storage.from('sale-evidence').remove([SALE_PATH]);
    expect(error).toBeNull();

    const { error: serviceDownloadError } = await serviceClient.storage
      .from('sale-evidence')
      .download(SALE_PATH);
    expect(serviceDownloadError).toBeNull();
  });

  test('anon은 purchase-evidence에 업로드할 수 없다', async () => {
    const { error } = await anonClient.storage
      .from('purchase-evidence')
      .upload(PURCHASE_PATH, IMAGE_BYTES, { contentType: 'image/png' });

    expect(error).not.toBeNull();
  });

  test('service role은 private sale-evidence signed URL을 만들 수 있다', async () => {
    const { data, error } = await serviceClient.storage
      .from('sale-evidence')
      .createSignedUrl(SALE_PATH, 60);

    expect(error).toBeNull();
    expect(data.signedUrl).toMatch(/^https:\/\//);
  });
});
