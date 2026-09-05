// FE-1 테스트 공통 설정: 한국 날짜와 React Router가 필요한 전역 값을 준비한다.
process.env.TZ = 'Asia/Seoul';

import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

// react-router(최신 v7)가 일부 환경에서 전역 TextEncoder/TextDecoder를 요구한다.
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
