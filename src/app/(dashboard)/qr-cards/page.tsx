"use client";

import { useState, useEffect, useRef } from "react";
import { QrCode, Download, Plus, Trash2, Eye, Globe, X } from "lucide-react";
import QRCode from "qrcode";
import type { CardProfile } from "@/types/card-profile";
import { generateVCard, generateUniqueId } from "@/lib/card-profiles";

const INITIAL_PROFILES: Omit<CardProfile, "id" | "created_at" | "updated_at">[] = [
  { user_id: "", unique_id: "eunah-jo", name: "조은아", email: "joytec@naver.com", phone: "010-2648-6726", websites: [] },
  { user_id: "", unique_id: "taejun-park", name: "박태준", email: "eybbye@gmail.com", phone: "010-6261-0970", websites: [] },
  { user_id: "", unique_id: "insuk-shin", name: "신인숙", email: "ppeanut@naver.com", phone: "010-8653-0836", websites: [] },
  { user_id: "", unique_id: "sangjin-hong", name: "홍상진", email: "sjhong76@gmail.com", phone: "010-6211-9683", websites: [] },
];

export default function QrCardsPage() {
  const [profiles, setProfiles] = useState<CardProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<CardProfile | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formWebsites, setFormWebsites] = useState<string[]>([""]);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("card_profiles");
    if (saved) {
      const parsed: CardProfile[] = JSON.parse(saved);
      // 기존 데이터 마이그레이션 (websites 필드 없는 경우)
      const migrated = parsed.map((p) => ({ ...p, websites: p.websites ?? [] }));
      setProfiles(migrated);
    } else {
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
    const url = `${window.location.origin}/u/${profile.unique_id}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 280, margin: 2, color: { dark: "#1e40af", light: "#ffffff" },
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
    if (!formName || !formEmail || !formPhone) return;
    const websites = formWebsites.filter((w) => w.trim() !== "");
    const newProfile: CardProfile = {
      id: String(Date.now()),
      user_id: "",
      unique_id: generateUniqueId(formName),
      name: formName,
      email: formEmail,
      phone: formPhone,
      websites,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [newProfile, ...profiles];
    saveProfiles(updated);
    resetForm();
    handleSelectProfile(newProfile);
  }

  function resetForm() {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormWebsites([""]);
    setShowForm(false);
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

  function updateWebsite(index: number, value: string) {
    const updated = [...formWebsites];
    updated[index] = value;
    setFormWebsites(updated);
  }

  function addWebsiteField() {
    setFormWebsites([...formWebsites, ""]);
  }

  function removeWebsiteField(index: number) {
    if (formWebsites.length <= 1) {
      setFormWebsites([""]);
      return;
    }
    setFormWebsites(formWebsites.filter((_, i) => i !== index));
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              placeholder="이름 *"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <input
              placeholder="이메일 *"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <input
              placeholder="핸드폰 *"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          {/* 홈페이지 N개 입력 */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-zinc-500" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">홈페이지</span>
              <button
                type="button"
                onClick={addWebsiteField}
                className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus size={12} />
                추가
              </button>
            </div>
            <div className="space-y-2">
              {formWebsites.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => updateWebsite(i, e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                  <button
                    type="button"
                    onClick={() => removeWebsiteField(i)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddProfile}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              등록
            </button>
            <button
              onClick={resetForm}
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
                  {profile.websites?.length > 0 && (
                    <p className="text-xs text-blue-500 flex items-center gap-1 mt-0.5">
                      <Globe size={10} />
                      {profile.websites.length}개 홈페이지
                    </p>
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
