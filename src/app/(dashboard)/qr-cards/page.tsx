"use client";

import { useState, useEffect, useRef } from "react";
import { QrCode, Download, Plus, Trash2, Eye } from "lucide-react";
import QRCode from "qrcode";
import type { CardProfile } from "@/types/card-profile";
import { generateVCard, generateUniqueId } from "@/lib/card-profiles";

// 초기 사용자 데이터
const INITIAL_PROFILES: Omit<CardProfile, "id" | "created_at" | "updated_at">[] = [
  { user_id: "", unique_id: "eunah-jo", name: "조은아", email: "joytec@naver.com", phone: "010-2648-6726" },
  { user_id: "", unique_id: "taejun-park", name: "박태준", email: "eybbye@gmail.com", phone: "010-6261-0970" },
  { user_id: "", unique_id: "insuk-shin", name: "신인숙", email: "ppeanut@naver.com", phone: "010-8653-0836" },
  { user_id: "", unique_id: "sangjin-hong", name: "홍상진", email: "sjhong76@gmail.com", phone: "010-6211-9683" },
];

export default function QrCardsPage() {
  const [profiles, setProfiles] = useState<CardProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<CardProfile | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", company: "", position: "" });
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // localStorage에서 프로필 로드 (Supabase 연동 전 임시)
    const saved = localStorage.getItem("card_profiles");
    if (saved) {
      setProfiles(JSON.parse(saved));
    } else {
      // 초기 데이터 설정
      const initial: CardProfile[] = INITIAL_PROFILES.map((p, i) => ({
        ...p,
        id: String(i + 1),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setProfiles(initial);
      localStorage.setItem("card_profiles", JSON.stringify(initial));
    }
  }, []);

  function saveProfiles(updated: CardProfile[]) {
    setProfiles(updated);
    localStorage.setItem("card_profiles", JSON.stringify(updated));
  }

  async function handleSelectProfile(profile: CardProfile) {
    setSelectedProfile(profile);
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/u/${profile.unique_id}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: "#1e40af", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl("");
    }
  }

  function handleDownloadVCard(profile: CardProfile) {
    const vcard = generateVCard(profile);
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.name}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadQr() {
    if (!qrDataUrl || !selectedProfile) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${selectedProfile.name}.png`;
    a.click();
  }

  function handleAddProfile() {
    if (!formData.name || !formData.email || !formData.phone) return;
    const newProfile: CardProfile = {
      id: String(Date.now()),
      user_id: "",
      unique_id: generateUniqueId(formData.name),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      company: formData.company || undefined,
      position: formData.position || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [newProfile, ...profiles];
    saveProfiles(updated);
    setFormData({ name: "", email: "", phone: "", company: "", position: "" });
    setShowForm(false);
    handleSelectProfile(newProfile);
  }

  function handleDeleteProfile(id: string) {
    if (!confirm("이 명함을 삭제하시겠습니까?")) return;
    const updated = profiles.filter((p) => p.id !== id);
    saveProfiles(updated);
    if (selectedProfile?.id === id) {
      setSelectedProfile(null);
      setQrDataUrl("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">QR 명함</h1>
          <p className="text-sm text-zinc-500 mt-1">QR코드로 명함을 공유하세요</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          명함 추가
        </button>
      </div>

      {/* 명함 추가 폼 */}
      {showForm && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4">새 명함 등록</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="이름 *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <input
              placeholder="이메일 *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <input
              placeholder="핸드폰 *"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <input
              placeholder="회사 (선택)"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <input
              placeholder="직책 (선택)"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddProfile}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              등록
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 명함 리스트 */}
        <div className="lg:col-span-2 space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors ${
                selectedProfile?.id === profile.id
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              }`}
              onClick={() => handleSelectProfile(profile)}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold dark:bg-blue-900 dark:text-blue-300">
                  {profile.name[0]}
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{profile.name}</p>
                  <p className="text-xs text-zinc-500">{profile.email} · {profile.phone}</p>
                  {profile.company && (
                    <p className="text-xs text-zinc-400">{profile.company}{profile.position ? ` · ${profile.position}` : ""}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownloadVCard(profile); }}
                  className="rounded p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                  title="vCard 다운로드"
                >
                  <Download size={16} />
                </button>
                <a
                  href={`/u/${profile.unique_id}`}
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                  title="명함 페이지 보기"
                >
                  <Eye size={16} />
                </a>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id); }}
                  className="rounded p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {profiles.length === 0 && (
            <div className="text-center py-12 text-zinc-400 text-sm">
              등록된 명함이 없습니다. 명함을 추가해주세요.
            </div>
          )}
        </div>

        {/* QR 코드 미리보기 */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
            <QrCode size={18} />
            QR 코드
          </h3>
          {selectedProfile && qrDataUrl ? (
            <div className="text-center space-y-4">
              <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-lg" ref={qrRef as unknown as React.Ref<HTMLImageElement>} />
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{selectedProfile.name}</p>
              <p className="text-xs text-zinc-500 break-all">
                {window.location.origin}/u/{selectedProfile.unique_id}
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleDownloadQr}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700"
                >
                  <Download size={14} />
                  QR 저장
                </button>
                <button
                  onClick={() => handleDownloadVCard(selectedProfile)}
                  className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
                >
                  <Download size={14} />
                  vCard
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400 text-sm">
              왼쪽에서 명함을 선택하면<br />QR 코드가 표시됩니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
