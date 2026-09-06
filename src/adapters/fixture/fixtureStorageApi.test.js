/*
 * 관련 작업: FE-5 — 프론트엔드 단계의 저장소 fixture 어댑터.
 * 작성 이유: 실제 Storage 없이도 이미지 경로 반환과 잘못된 입력 처리를 확인해야 하기 때문.
 * 확인 내용: 문자열 경로, File 이름, 이미지가 아닌 값의 처리.
 */
import { createFixtureStorageApi } from './fixtureStorageApi';

describe('로컬 연습용 사진 올리기', () => {
  test('이미 있는 사진 경로는 그대로 저장 경로로 쓴다', async () => {
    const api = createFixtureStorageApi();

    await expect(api.uploadEvidence('evidence/sale/screen.png')).resolves.toBe(
      'evidence/sale/screen.png',
    );
  });

  test('새로 고른 사진은 파일 이름을 저장 경로로 쓴다', async () => {
    const api = createFixtureStorageApi();
    const file = new File(['image'], 'evidence.png', { type: 'image/png' });

    await expect(api.uploadEvidence(file)).resolves.toBe('evidence.png');
  });

  test('사진이 아니면 올리지 않는다', async () => {
    const api = createFixtureStorageApi();

    await expect(api.uploadEvidence(null)).rejects.toThrow();
  });
});
