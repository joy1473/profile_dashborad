-- Fix: handle_new_user 트리거가 실패해도 auth.users INSERT는 성공하도록 변경
-- "Database error saving new user" 오류 해결
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    ),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(
      NULLIF(EXCLUDED.name, ''),
      profiles.name
    ),
    email = COALESCE(EXCLUDED.email, profiles.email),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 트리거 실패가 유저 생성을 막지 않도록 함
  -- Edge Function에서 프로필을 수동 생성하는 폴백이 있음
  RAISE WARNING 'handle_new_user trigger failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
