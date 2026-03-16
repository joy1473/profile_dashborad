-- Fix: handle_new_user 트리거 개선
-- 1) full_name 메타데이터 키 매칭 (Edge Function과 일치)
-- 2) ON CONFLICT 처리로 중복 INSERT 방지 ("Database error creating user" 해결)
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
      EXCLUDED.name,
      profiles.name
    ),
    email = COALESCE(EXCLUDED.email, profiles.email),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
