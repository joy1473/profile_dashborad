export interface CardProfile {
  id: string;
  user_id: string;
  unique_id: string;
  name: string;
  email: string;
  phone: string;
  websites: string[];
  image?: string; // base64 data URL
  created_at: string;
  updated_at: string;
}
