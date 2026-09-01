# +1

GS25 / CU 1+1·2+1 보관상품의 판매자 공급 의향과 가격 수용성을 검증하는 웹 앱입니다.

판매자 신청(`/apply`)과 관리자 콘솔(`/admin`)만 제공합니다.

## 실행

```bash
npm install
cp .env.example .env
npm run dev
```

`.env`에 Supabase 프로젝트 URL과 anon key를 넣습니다.

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## 초기 설정

1. Supabase SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행합니다.
2. Authentication에서 관리자 사용자를 만들고, UID를 등록합니다.

```sql
INSERT INTO public.admin_users (user_id)
VALUES ('<USER-UID>')
ON CONFLICT (user_id) DO NOTHING;
```

## 배포

Vercel에 저장소를 연결한 뒤 위 환경 변수 2개를 등록합니다. SPA 라우팅은 `vercel.json`에 포함되어 있습니다.
