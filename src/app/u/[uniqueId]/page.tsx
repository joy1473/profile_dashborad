"use client";

import { useState, useEffect, use } from "react";
import { Download, Mail, Phone, Globe } from "lucide-react";
import QRCode from "qrcode";
import type { CardProfile } from "@/types/card-profile";
import { generateVCard, fetchCardProfileByUniqueId } from "@/lib/card-profiles";

export default function PublicProfilePage({ params }: { params: Promise<{ uniqueId: string }> }) {
  const { uniqueId } = use(params);
  const [profile, setProfile] = useState<CardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    async function load() {
      const found = await fetchCardProfileByUniqueId(uniqueId);
      setProfile(found);

      if (found) {
        const dataUrl = await QRCode.toDataURL(window.location.href, {
          width: 200, margin: 2, color: { dark: "#1e40af", light: "#ffffff" },
        });
        setQrDataUrl(dataUrl);
      }
      setLoading(false);
    }
    load();
  }, [uniqueId]);

  function handleDownloadVCard() {
    if (!profile) return;
    const vcard = generateVCard(profile);
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.name}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-zinc-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-zinc-700 mb-2">명함을 찾을 수 없습니다</p>
          <p className="text-zinc-500">유효하지 않은 링크입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
          {/* 상단 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8 text-center text-white">
            {profile.image ? (
              <img src={profile.image} alt={profile.name} className="mx-auto mb-3 h-20 w-20 rounded-full object-cover border-3 border-white/30" />
            ) : (
              <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">
                {profile.name[0]}
              </div>
            )}
            <h1 className="text-2xl font-bold">{profile.name}</h1>
          </div>

          {/* 연락처 정보 */}
          <div className="px-6 py-5 space-y-3">
            <a
              href={`mailto:${profile.email}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Mail size={18} className="text-blue-600 shrink-0" />
              <span>{profile.email}</span>
            </a>
            <a
              href={`tel:${profile.phone}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Phone size={18} className="text-blue-600 shrink-0" />
              <span>{profile.phone}</span>
            </a>
            {(profile.websites ?? []).map((url, i) => (
              <a
                key={i}
                href={url.startsWith("http") ? url : `https://${url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Globe size={18} className="text-blue-600 shrink-0" />
                <span className="truncate">{url}</span>
              </a>
            ))}
          </div>

          {/* QR 코드 */}
          {qrDataUrl && (
            <div className="px-6 pb-4 text-center">
              <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-lg w-32 h-32" />
            </div>
          )}

          {/* vCard 다운로드 */}
          <div className="px-6 pb-6">
            <button
              onClick={handleDownloadVCard}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Download size={18} />
              연락처 저장
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-4">
          SaaS Dashboard QR 명함
        </p>
      </div>
    </div>
  );
}
