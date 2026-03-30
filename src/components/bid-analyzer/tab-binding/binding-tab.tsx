'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, Download, Send, CheckCircle2, XCircle, RotateCcw, Trash2 } from 'lucide-react';
import { parseChatInput, executeCommands, summarizeTemplate } from '@/lib/hwp-binder';

interface ChatMsg {
  role: 'user' | 'system';
  text: string;
}

export function BindingTab() {
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [currentHtml, setCurrentHtml] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [totalStats, setTotalStats] = useState({ success: 0, fail: 0 });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 채팅 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // iframe 갱신
  const updateIframe = useCallback((html: string) => {
    setTimeout(() => {
      if (iframeRef.current) {
        const doc = iframeRef.current.contentDocument;
        if (doc) { doc.open(); doc.write(html); doc.close(); }
      }
    }, 50);
  }, []);

  // ── 템플릿 업로드 ──
  const handleTemplate = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    const htmlFile = files.find(f => /\.html?$/i.test(f.name));
    if (!htmlFile) { alert('HTML 파일을 선택하세요.'); return; }

    let html = await htmlFile.text();

    // CSS 인라인
    for (const f of files.filter(f => f.name.endsWith('.css'))) {
      const css = await f.text();
      const re = new RegExp(`<link[^>]*href=["']${f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi');
      html = re.test(html)
        ? html.replace(re, `<style>${css}</style>`)
        : html.replace('</head>', `<style>${css}</style></head>`);
    }

    // 이미지 base64 인라인
    for (const f of files.filter(f => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name))) {
      if (f.size > 5 * 1024 * 1024) continue;
      const buf = await f.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const uri = `data:${f.type || 'image/png'};base64,${btoa(bin)}`;
      html = html.split(f.name).join(uri);
      const enc = encodeURIComponent(f.name);
      if (enc !== f.name) html = html.split(enc).join(uri);
    }

    setTemplateHtml(html);
    setCurrentHtml(html);
    setTemplateName(htmlFile.name);
    setTotalStats({ success: 0, fail: 0 });
    updateIframe(html);

    // 문서 요약
    const summary = summarizeTemplate(html);
    setChatMessages([{ role: 'system', text: summary }]);
  }, [updateIframe]);

  // ── 채팅 전송 ──
  const handleChat = useCallback(() => {
    const input = chatInput.trim();
    if (!input || !currentHtml) return;

    setChatMessages(prev => [...prev, { role: 'user', text: input }]);
    setChatInput('');

    // 명령 파싱 + 실행
    const commands = parseChatInput(input);

    if (commands.length === 0) {
      setChatMessages(prev => [...prev, {
        role: 'system',
        text: '인식할 수 없는 입력입니다.\n\n사용법:\n• 과제명 : ㅇㅇㅇ\n• 참여기관 기관명 : (주)천강\n• A → B\n• @표 위치 + key|value\n• @서술 위치 + 텍스트',
      }]);
      return;
    }

    const result = executeCommands(currentHtml, commands);
    setCurrentHtml(result.html);
    updateIframe(result.html);

    setTotalStats(prev => ({
      success: prev.success + result.stats.success,
      fail: prev.fail + result.stats.fail,
    }));

    setChatMessages(prev => [...prev, {
      role: 'system',
      text: result.log.join('\n'),
    }]);
  }, [chatInput, currentHtml, updateIframe]);

  // ── 키보드 ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChat();
    }
  }, [handleChat]);

  // ── 초기화 ──
  const handleReset = useCallback(() => {
    if (!templateHtml) return;
    setCurrentHtml(templateHtml);
    updateIframe(templateHtml);
    setTotalStats({ success: 0, fail: 0 });
    setChatMessages(prev => [...prev, { role: 'system', text: '🔄 원본으로 초기화되었습니다.' }]);
  }, [templateHtml, updateIframe]);

  // ── 다운로드 ──
  const handleDownload = useCallback(() => {
    if (!currentHtml) return;
    const blob = new Blob([currentHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateName.replace(/\.html?$/i, '_바인딩.html');
    a.click();
    URL.revokeObjectURL(url);
  }, [currentHtml, templateName]);

  // textarea 자동 높이
  const adjustTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* 상단 바 */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white">
        <div
          className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            templateHtml ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
          }`}
          onClick={() => templateInputRef.current?.click()}
          onDrop={e => { e.preventDefault(); handleTemplate(e.dataTransfer.files); }}
          onDragOver={e => e.preventDefault()}
        >
          <input
            ref={templateInputRef}
            type="file"
            accept=".html,.htm,.css,.png,.jpg,.jpeg,.gif,.svg"
            multiple
            onChange={e => e.target.files && handleTemplate(e.target.files)}
            className="hidden"
          />
          {templateHtml ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">{templateName}</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">HWP→HTML 파일 업로드</span>
            </>
          )}
        </div>

        {templateHtml && (
          <>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> {totalStats.success}건
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="w-3.5 h-3.5" /> {totalStats.fail}건
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button onClick={handleReset} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200">
                <RotateCcw className="w-3.5 h-3.5" /> 초기화
              </button>
              <button onClick={handleDownload} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-900">
                <Download className="w-3.5 h-3.5" /> 다운로드
              </button>
            </div>
          </>
        )}
      </div>

      {/* 메인: 미리보기 + 채팅 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 문서 미리보기 */}
        <div className="flex-1 overflow-hidden bg-gray-100 p-2">
          {currentHtml ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full bg-white border rounded shadow-sm"
              title="바인딩 결과"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
              <FileText className="w-12 h-12" />
              <p className="text-sm">HWP→HTML 파일을 업로드하세요</p>
              <p className="text-xs">HTML + CSS + 이미지 파일을 함께 드래그</p>
            </div>
          )}
        </div>

        {/* 우측: 채팅 */}
        <div className="w-[420px] border-l bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b bg-gray-50">
            <p className="text-sm font-medium text-gray-800">바인딩 채팅</p>
            <p className="text-xs text-gray-500 mt-0.5">값을 입력하면 문서에 자동 매핑됩니다</p>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {chatMessages.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <p className="text-sm text-gray-400">파일 업로드 후 채팅으로 값을 입력하세요</p>
                <div className="text-left mx-4 space-y-2">
                  {[
                    { label: '값 대입', example: '과제명 : AI 인력양성 사업' },
                    { label: '컨텍스트', example: '참여기관 기관명 : (주)천강' },
                    { label: '여러 줄', example: '참여기관 대표자 : 김희정\n참여기관 사업자등록번호 : 185-81-01221' },
                    { label: '교체', example: '홍길동 → 이상일' },
                  ].map(({ label, example }) => (
                    <button
                      key={label}
                      onClick={() => { setChatInput(example); adjustTextarea(); }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <span className="text-xs font-medium text-blue-600">{label}</span>
                      <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{example}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} className={`max-w-[90%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                <div className={`text-xs p-3 rounded-xl whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-700 rounded-bl-sm border'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="p-3 border-t bg-gray-50">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={chatInput}
                onChange={e => { setChatInput(e.target.value); adjustTextarea(); }}
                onKeyDown={handleKeyDown}
                placeholder="참여기관 기관명 : (주)천강"
                rows={1}
                className="flex-1 px-3 py-2 border rounded-xl text-xs resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-300"
                style={{ minHeight: '36px', maxHeight: '120px' }}
              />
              <button
                onClick={handleChat}
                disabled={!chatInput.trim() || !currentHtml}
                className="p-2 bg-blue-600 text-white rounded-xl disabled:opacity-40 hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 px-1">
              Enter 전송 · Shift+Enter 줄바꿈 · 여러 항목은 줄바꿈으로 구분
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
