# +1 (남은 1+1 보관상품 판매자 공급 검증 MVP)

GS25 / CU 편의점 1+1·2+1 보관상품의 판매자 공급 의향 및 가격 수용성을 검증하기 위한 React + Supabase MVP 웹 애플리케이션입니다.

---

## 1. 아키텍처
- **Frontend**: React 19 + TypeScript + Vite (SPA)
- **Backend**: Supabase (PostgreSQL + Auth + RLS + RPC)
- **Hosting**: Vercel (또는 Sites)
- **보안/접근 제어**: RLS 기반 비로그인 조회 차단, SECURITY DEFINER RPC(`submit_application`) 기반 판매 접수, `admin_users` 테이블 기반 관리자 인증

---

## 2. 빠른 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (Mock 동작 시 생략 가능)
cp .env.example .env

# 3. 개발 서버 실행
npm run dev

# 4. 검증 (Typecheck, 단위 테스트, 프로덕션 빌드)
npm run typecheck
npm test
npm run build
```

---

## 3. Supabase 백엔드 구축 및 연동 절차 (I-02 가이드)

### 3.1 Supabase Dashboard 작업
1. [Supabase](https://supabase.com)에 로그인하고 사용할 프로젝트를 엽니다.
2. **Project Settings > API**에서 다음 값을 복사합니다:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **Project API Keys > anon / public** (`sb_publishable_...` 또는 `eyJ...`)
3. **SQL Editor**로 이동하여 [supabase/schema.sql](supabase/schema.sql)의 전체 내용을 붙여넣고 실행(`Run`)합니다.
   - 기존 신청 데이터를 삭제하지 않고 필요한 테이블, 트리거, RLS 정책, RPC 권한을 적용합니다.
   - 모집 singleton은 숫자형 `id = 1`을 사용합니다.
   - 관리자 지표는 보호된 신청 목록을 앱에서 집계하므로 공개 metrics view를 만들지 않습니다.

> `service_role` 또는 Secret key는 복사하지 않습니다. 브라우저와 Vercel에는 Publishable/anon key만 사용합니다.

### 3.2 관리자 계정 생성 및 등록
1. **Authentication > Users**에서 `Add User` > `Create User`로 관리자 이메일/비밀번호를 생성합니다.
2. 생성된 사용자의 **User UID**를 복사합니다.
3. **SQL Editor**에서 아래 쿼리를 실행하여 관리자 권한을 부여합니다:
   ```sql
   INSERT INTO public.admin_users (user_id)
   VALUES ('<복사한-USER-UID>')
   ON CONFLICT (user_id) DO NOTHING;
   ```

관리자 등록 여부는 SQL Editor에서 다음 쿼리로 확인할 수 있습니다:
```sql
SELECT user_id, created_at
FROM public.admin_users
WHERE user_id = '<복사한-USER-UID>';
```

### 3.3 로컬 환경 변수 설정
프로젝트 루트의 `.env` 파일에 발급받은 키를 설정합니다:
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

`.env`를 바꾼 뒤 실행 중인 Vite 서버를 재시작합니다. 환경 변수가 모두 설정되면 앱은 오류를 Mock 성공으로 대체하지 않습니다.

---

## 4. 통합 검증 체크리스트 (I-02)

### [1] 판매자 신청 흐름 검증
- [ ] 브라우저에서 `/apply` 접속
- [ ] 편의점(GS25) > 행사(1+1) > 상품명('테스트 상품') > 결제금액(3,000원) 입력
- [ ] 가격 선택 (예: 70% 1,100원 선택) 및 연락처 입력 후 **판매 신청 완료하기** 클릭
- [ ] 완료 화면에 신청 접수 및 신청번호 확인
- [ ] Supabase Table Editor의 `public.applications`에 신규 레코드 생성 확인

### [2] 관리자 대시보드 검증
- [ ] 브라우저에서 `/admin` 접속
- [ ] 방금 제출한 신청 건이 목록 최상단에 정상 노출되는지 확인
- [ ] 해당 행을 클릭하여 `/admin/applications/:id` 상세 화면 진입
- [ ] 상태를 `CONTACTED`(연락 완료) 또는 `EVIDENCE_VERIFIED`(증빙 확인)로 변경 후 저장
- [ ] `public.applications`의 `status` 및 `updated_at`이 갱신되었는지 확인

### [3] 모집 상태 제어 검증
- [ ] `/admin/recruitment`에서 상태를 `PAUSED`(일시중지)로 변경
- [ ] 판매자 홈(`/`) 및 신청 페이지(`/apply`)에서 접수 중단 안내 배너 노출 확인
- [ ] 상태를 다시 `OPEN`으로 원복

신청 접수 전 모집 상태는 다음 쿼리로 확인할 수 있습니다:
```sql
SELECT id, status, updated_at
FROM public.recruitment_settings
WHERE id = 1;
```

---

## 5. Vercel 배포 가이드

1. GitHub 저장소를 Vercel에 연결하고 새 프로젝트를 생성합니다.
2. **Settings > Environment Variables**에 다음 환경 변수를 등록합니다:
   - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon/publishable 키
3. `vercel.json`의 SPA 라우팅 rewrite 설정이 포함되어 있으므로 빌드 및 배포(`Deploy`)를 진행합니다.
4. 배포된 Vercel 도메인으로 접속하여 판매자 신청 및 관리자 대시보드가 정상 동작하는지 확인합니다.
