# TASKS.md

프로젝트의 **현재 작업 위치를 한눈에 확인하기 위한 현황판**이다. 길게 설명하지 않고 항상 최신 상태를 유지한다.

상태 표기: `[ ]` 시작 전 · `[x]` 완료 · `[!]` 막힘

## 현재 작업
**Phase:** QA 완료 → 배포 준비  
**현재 Task:** DEPLOY — Vercel 배포
**목표:** 배포 전 QA를 전부 통과했으므로 Vercel에 배포하고 라이브 환경에서 최종 확인한다.

## 문서
- [x] V2-01 `docs/PRD.md`, `docs/TASKS.md` 최종 V2 기준 반영
- [x] `AGENTS.md` V2 범위·검증·구매 안내 기준 반영
- [x] `docs/DESIGN-SYSTEM.md` 스크린샷/직접입력·직접 금액 입력 기준 반영

## 현재 V2 기준
이미 구현된 3단계 흐름은 최대한 재사용한다. 새 요구사항 때문에 필요한 부분만 수정하며 V1 전체를 다시 만들지 않는다.

- 1단계: 편의점 / 행사 유형
- 2단계: 스크린샷 등록 또는 직접 입력
- 3단계: 판매 희망금액 / 연락처
- 완료: 직접 구매 진행 안내

## V2 Frontend 보완
- [x] V2-02 랜딩의 `어떻게 진행되나요?`를 최종 3단계 흐름과 직접 구매 안내로 수정
- [x] V2-03 1단계 명칭/카피를 `편의점·행사 선택` 기준으로 정리
- [x] V2-04 2단계에 `스크린샷으로 등록 / 직접 입력하기` 방식 선택 추가
- [x] V2-05 스크린샷 방식: 이미지 1장 선택, 미리보기, 교체/삭제 UI 구현
- [x] V2-06 직접 입력 방식: 상품명·실제 결제금액 필수, 유효기간 선택으로 정리
- [x] V2-07 `판매 희망 수량` 입력 UI 제거, 내부 수량 1로 고정
- [x] V2-08 3단계에서 판매 희망금액 + 연락처 입력 후 바로 신청 제출 유지
- [x] V2-09 `가능한 경우 구매/연락` 문구를 제거하고 직접 구매 진행 문구로 변경
- [x] V2-10 완료 화면을 `신청 접수 → 직접 구매 진행 → 연락처로 증빙/QR 안내` 기준으로 수정
- [x] V2-11 관리자 Mock에서 `SCREENSHOT / MANUAL` 등록 방식과 해당 상세정보 확인 가능하게 정리
- [x] V2-12 새 흐름 확인 후 사용하지 않는 V1 가격 선택/재제안/최종 확인 잔여 코드와 문구 정리
- [x] V2-13 Frontend Phase 검증: 핵심 신청 흐름 2종, 관리자 확인, typecheck/build
  - 검증 중 확인된 스크린샷 방식 진행 차단(2단계 '다음' 비활성)을 수정하여 스크린샷 신청이 완료 화면까지 동작하게 보완
  - typecheck 통과 · build 통과 · 테스트 54개 통과 · 브라우저 검증(스크린샷/직접입력 신청, 관리자 목록·상세·상태변경, 모집 상태, 실험 현황, 콘솔 오류 0건)
- [x] V2-14 사용자 V2 Frontend 확인 및 승인
  - 사용자 확인 완료. 스크린샷 신청 제출 오류는 실제 Supabase 모드에서 Backend가 V2 스크린샷 신청을 지원하지 않아 발생하는 것으로 확인 → BP-01에 Backend 해결 항목으로 반영

## 구현 범위 제한
- V2 보완을 위해 기존 3단계 흐름을 전면 재작성하지 않는다.
- 스크린샷에서 상품 정보를 자동 판독하지 않는다.
- Frontend 단계에서 실제 이미지 영구 저장 Backend를 만들지 않는다.
- 새로운 가격 선택/협상 UI를 추가하지 않는다.
- 별도 최종 확인 페이지를 다시 만들지 않는다.
- V2에 필요하지 않은 리팩터링을 함께 진행하지 않는다.

## 이전 코드 정리 원칙
- 새 V2 흐름이 정상 동작하기 전에는 기존 파일을 먼저 삭제하지 않는다.
- 기존 컴포넌트/utility를 재사용할 수 있으면 재사용한다.
- 직접 입력 신청의 참고 분석에 필요한 가격 계산 utility는 유지할 수 있다.
- 0~100% 가격 옵션, 10%p 제안, 최초/제안/최종 가격 상태처럼 새 PRD에서 사라진 로직은 새 흐름 검증 후 제거한다.
- `legacy/`, `old/`, `backup/` 폴더를 만들어 이전 코드를 복사 보관하지 않는다. 이전 버전은 Git의 `v1` 태그/브랜치 이력으로 보존한다.
- 파일 삭제 전 프로젝트 전체 사용처를 확인한다.
- 제거 대상 코드와 테스트는 V2-12에서 한 번에 정리한다.

## Backend 준비
V2-14 승인 완료 — 진행 중.

- [x] BP-01 승인된 V2 Frontend + PRD 기준으로 `docs/BACKEND.md` 갱신 (등록 방식 `SCREENSHOT/MANUAL`, 스크린샷 신청 RPC·Storage 반영)
- [x] BP-02 Supabase Storage 필요 결정 — private `screenshots` 버킷, anon 업로드·관리자 조회 정책 설계
- [x] BP-03 관리자 Auth/RLS 유지 + 신청 데이터 구조(`registration_method`, `screenshot_file_name`, `original_paid_price ≥ 0`) 정의
- [x] BP-04 Experiment Tracker 대조에 등록 방식 매핑 추가 및 관리자 등록 방식별 지표 확인
- [x] BP-05 사용자 Backend 설계 확인 및 승인

## Backend 구현
- [x] B-01 신규 마이그레이션 작성 — `registration_method`·`screenshot_file_name` 컬럼 추가, `original_paid_price` 제약 완화(≥ 0), `submit_application` RPC에 등록 방식·파일명 파라미터 확장 (`supabase/migrations/20260904000001_support_screenshot_registration.sql`)
- [x] B-02 Storage — private `screenshots` 버킷 생성 및 정책(anon 업로드 / 관리자 조회) 마이그레이션에 포함, `supabase/schema.sql` 동기 갱신
- [x] B-03 `applicationService` — RPC에 `p_registration_method`·`p_screenshot_file_name` 전달, `uploadScreenshot`(Storage 업로드)·`buildScreenshotObjectPath` 추가, mock 저장 경로에 파일명 반영
- [x] B-04 신청 화면 연동 — `handleApplySubmit`에서 스크린샷 업로드 후 `screenshotFileName` 전달, 업로드 실패/모집 중단 오류 처리
- [x] B-05 구현 검증 — typecheck 통과 · 테스트 57개 통과(스크린샷 RPC 파라미터·mock 저장·객체 경로 신규 테스트 포함) · build 통과 · mock 모드 브라우저 흐름 검증(스크린샷 신청 완료 화면, 관리자 SCREENSHOT 표시, 콘솔 오류 0건)
- [x] DB-01 원격 Supabase DB에 마이그레이션 적용 (사용자가 Supabase SQL Editor로 실행 완료)
  - 적용 후 실서버 프로브 검증에서 실제 DB에 문서에 없던 `applications_product_name_check` 제약이 확인됨 → 마이그레이션·schema.sql에 조건부 제약(`registration_method = 'SCREENSHOT' OR length(btrim(product_name)) > 0`) 교체 반영, **후속 SQL 2문장 실행 대기**
- [x] INT-01 실제 모드 통합 검증 — 실제 Supabase에서 스크린샷 신청 제출 → 관리자 목록/상세 SCREENSHOT·이미지 signed URL 확인
  - ✅ 실서버 RPC 프로브 200 (제약 수정 확인, 신청 ID 반환)
  - ✅ 실서버 재검증 완료: Storage 업로드 + RPC 모두 정상, 스크린샷 신청 접수 성공
  - 🔍 실서버 재검증 중 신규 오류 특정·해결: "new row violates row-level security policy" = 관리자 로그인 세션이 남은 브라우저에서 Storage 업로드가 authenticated 역할로 수행되는데 INSERT 정책이 anon에만 있었음 → `screenshot_upload_authenticated` 정책 추가(마이그레이션·schema.sql 반영) 후 사용자가 SQL Editor에서 실행 → 정상 접수 확인
  - ✅ 관리자 상세에서 실제 스크린샷 이미지(signed URL) 정상 표시 사용자 확인

## QA (배포 전 점검)
- [x] QA production build/env — `npm run build` 통과, dist 정상 생성
- [x] QA Supabase/Auth/RLS — 익명 SELECT applications 401 차단, 익명 INSERT 401 차단, 익명 UPDATE recruitment_settings 401 차단, 익명 SELECT 모집상태 200 허용
- [x] QA 개인정보 노출 — 연락처(contact_value) 포함 applications 테이블에 익명 접근 완전 차단
- [x] QA 실제 판매 신청 1건 — 스크린샷+직접입력 각각 실서버 접수 성공
- [x] QA 관리자 조회 — 상세에서 스크린샷 원본(signed URL) 정상 표시
- [x] QA 모바일 사용성 — 360px/768px/1280px 전부 렌더링 정상, 가로 오버플로우 없음
- [x] QA 관리자 로그인 페이지 — 정상 렌더링
- [~] QA 모집 일시중지/종료 — 모집상태 API 보호 확인(익명 변경 401 차단), 실제 PAUSED/CLOSED 상태 랜딩 반영은 관리자 로그인 후 사용자 확인 필요
- [x] QA 콘솔 오류 — 전 과정 0건

## 이후 Phase
Backend 통합 검증 완료. 다음은 배포 전 QA(프로덕션 빌드/환경, 모바일 사용성, 개인정보 노출 확인) 후 배포를 진행한다.

Integration Task는 실제 Backend가 만들어진 후 추가한다. 실제 실행환경, Supabase, Vercel 설정이 확정되면 `README.md`를 작성한다.

## AI 갱신 규칙
Task를 완료한 AI는 같은 작업 안에서 이 문서를 반드시 갱신한다.
- 완료: `[x]`
- 다음 Task: `현재 작업` 변경
- 막힘: `[!]` + 한 줄 이유

사용자가 따로 `TASKS.md를 업데이트해`라고 요청할 때까지 기다리지 않는다.
