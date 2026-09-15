# Supabase 설정

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `schema.sql` 전체를 실행합니다.
3. Authentication에서 사용할 로그인 방식을 활성화합니다.
4. 프런트엔드에는 프로젝트 URL과 publishable key만 등록합니다.
5. secret/service-role key는 브라우저나 Git 저장소에 넣지 않습니다.

## 테이블

- `profiles`: 닉네임과 기본 캐릭터
- `budget_plans`: 월별 월급, 고정지출, 저축 목표
- `expenses`: 개별 소비 기록
- `companion_states`: 월별 캐릭터와 방 상태
- `monthly_summaries`: 월말 결과 카드용 요약

모든 사용자 데이터 테이블은 RLS가 활성화되며, 로그인한 사용자는 자신의 행만
조회하고 변경할 수 있습니다.
