-- 기존 Supabase 프로젝트에 소비 유형 9종을 추가합니다.
-- SQL Editor에서 한 번 실행하세요. 기존 데이터는 변경하지 않습니다.

alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses add constraint expenses_category_check check (
  category in (
    'coffee','delivery','dining','transport','shopping','game','subscription','living',
    'groceries','housing','health','beauty','education','leisure','travel','social','pet','other'
  )
);

alter table public.monthly_summaries drop constraint if exists monthly_summaries_top_category_check;
alter table public.monthly_summaries add constraint monthly_summaries_top_category_check check (
  top_category is null or top_category in (
    'coffee','delivery','dining','transport','shopping','game','subscription','living',
    'groceries','housing','health','beauty','education','leisure','travel','social','pet','other'
  )
);

alter table public.mate_shared_expenses drop constraint if exists mate_shared_expenses_category_check;
alter table public.mate_shared_expenses add constraint mate_shared_expenses_category_check check (
  category in (
    'coffee','delivery','dining','transport','shopping','game','subscription','living',
    'groceries','housing','health','beauty','education','leisure','travel','social','pet','other'
  )
);
