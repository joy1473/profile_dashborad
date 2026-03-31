export interface CardProfile {
  id: string;
  user_id: string;
  unique_id: string;
  name: string;
  company: string;
  job_title: string;    // 직급 (예: 부장, 과장, 대리)
  position: string;     // 직책 (예: 팀장, 실장, 본부장)
  role: string;         // 역할/부서 (예: 개발팀, 사업지원실)
  email: string;
  phone: string;
  websites: string[];
  image?: string; // base64 data URL
  created_at: string;
  updated_at: string;
}
