-- card_profiles 테이블: QR 명함 데이터를 DB에 저장
CREATE TABLE card_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unique_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  websites TEXT[] DEFAULT '{}',
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_card_profiles_unique_id ON card_profiles(unique_id);

-- RLS
ALTER TABLE card_profiles ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (QR 스캔 시 누구나 명함 조회 가능)
CREATE POLICY "card_profiles_public_select" ON card_profiles
  FOR SELECT USING (true);

-- 인증된 사용자만 생성
CREATE POLICY "card_profiles_insert" ON card_profiles
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 본인 또는 admin만 수정
CREATE POLICY "card_profiles_update" ON card_profiles
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 본인 또는 admin만 삭제
CREATE POLICY "card_profiles_delete" ON card_profiles
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 기본 명함 4개 삽입 (기존 하드코딩 데이터)
INSERT INTO card_profiles (unique_id, name, email, phone, websites) VALUES
  ('eunah-jo', '조은아', 'joytec@naver.com', '010-2648-6726', '{}'),
  ('taejun-park', '박태준', 'eybbye@gmail.com', '010-6261-0970', '{}'),
  ('insuk-shin', '신인숙', 'ppeanut@naver.com', '010-8653-0836', '{}'),
  ('sangjin-hong', '홍상진', 'sjhong76@gmail.com', '010-6211-9683', '{}');
