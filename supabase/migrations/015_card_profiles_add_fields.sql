-- 명함에 직급, 직책, 역할(부서) 필드 추가
ALTER TABLE card_profiles ADD COLUMN IF NOT EXISTS company TEXT DEFAULT '';
ALTER TABLE card_profiles ADD COLUMN IF NOT EXISTS job_title TEXT DEFAULT '';
ALTER TABLE card_profiles ADD COLUMN IF NOT EXISTS position TEXT DEFAULT '';
ALTER TABLE card_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT '';
