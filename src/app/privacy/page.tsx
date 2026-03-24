export default function PrivacyPage() {
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "The Polestar";
  const representative = process.env.NEXT_PUBLIC_REPRESENTATIVE ?? "대표자";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow dark:bg-zinc-900">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">개인정보처리방침</h1>
        <p className="mb-4 text-xs text-zinc-400">시행일: 2026년 3월 25일</p>

        <div className="space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">제1조 (목적)</h2>
            <p>{company}(이하 &quot;회사&quot;)은 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수하고 있습니다. 본 방침은 회사가 수집하는 개인정보의 항목, 수집 목적, 이용 및 보관 기간 등을 안내합니다.</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">제2조 (수집하는 개인정보)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>카카오 로그인: 카카오 계정 ID, 닉네임, 프로필 이미지</li>
              <li>서비스 이용 기록: 로그인 일시, 활동 로그</li>
              <li>사용자 입력 정보: 일정, 회의, 프로필 역량 정보</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">제3조 (수집 목적)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원 식별 및 서비스 제공</li>
              <li>일정 관리, 화상회의, SW 역량 프로필 기능 제공</li>
              <li>서비스 개선 및 통계 분석</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">제4조 (보유 및 이용 기간)</h2>
            <p>개인정보는 수집 목적 달성 시까지 보유하며, 회원 탈퇴 시 즉시 파기합니다. 단, 관계 법령에 의한 보존 의무가 있는 경우 해당 기간 동안 보관합니다.</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">제5조 (제3자 제공)</h2>
            <p>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 의한 요청이 있는 경우 예외로 합니다.</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">제6조 (위탁)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Supabase (데이터베이스 호스팅)</li>
              <li>Vercel (웹 호스팅)</li>
              <li>Neo4j Aura (그래프 데이터베이스)</li>
              <li>카카오 (소셜 로그인)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">제7조 (이용자의 권리)</h2>
            <p>이용자는 언제든지 본인의 개인정보를 조회, 수정, 삭제할 수 있으며, 개인정보 처리에 대한 동의를 철회할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">제8조 (안전성 확보 조치)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>데이터 암호화 전송 (HTTPS/TLS)</li>
              <li>접근 권한 관리 (Row Level Security)</li>
              <li>보안 헤더 적용 (CSP, X-Frame-Options 등)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">제9조 (개인정보 보호책임자)</h2>
            <p>성명: {representative}</p>
            <p>소속: {company}</p>
          </section>
        </div>

        <div className="mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← 대시보드로 돌아가기</a>
        </div>
      </div>
    </div>
  );
}
