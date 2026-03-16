-- admin은 모든 사용자의 프로필(역할/상태) 변경 가능
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
