'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Play, Download, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Send } from 'lucide-react';
import type { BindingField, BindingResult } from '@/lib/hwp-binder';
import { extractFieldsFromContent, bindFields, simpleReplace } from '@/lib/hwp-binder';

type Step = 'upload' | 'mapping' | 'result';

export function BindingTab() {
  const [step, setStep] = useState<Step>('upload');

  // 파일
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [contentHtml, setContentHtml] = useState<string | null>(null);
  const [contentName, setContentName] = useState('');

  // 매핑
  const [fields, setFields] = useState<BindingField[]>([]);
  const [result, setResult] = useState<BindingResult | null>(null);
  const [showFields, setShowFields] = useState(true);

  // 채팅
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'system'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);

  // ── 템플릿 파일 업로드 (인풋1) ──
  const handleTemplate = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    const htmlFile = files.find(f => /\.html?$/i.test(f.name));
    if (!htmlFile) { alert('HTML 파일을 선택하세요.'); return; }

    let html = await htmlFile.text();

    // CSS 인라인
    for (const f of files.filter(f => f.name.endsWith('.css'))) {
      const css = await f.text();
      const re = new RegExp(`<link[^>]*href=["']${f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi');
      html = re.test(html) ? html.replace(re, `<style>${css}</style>`) : html.replace('</head>', `<style>${css}</style></head>`);
    }

    // 이미지 base64 인라인
    for (const f of files.filter(f => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name))) {
      if (f.size > 5 * 1024 * 1024) continue;
      const buf = await f.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const uri = `data:${f.type || 'image/png'};base64,${btoa(bin)}`;
      html = html.split(f.name).join(uri);
      const enc = encodeURIComponent(f.name);
      if (enc !== f.name) html = html.split(enc).join(uri);
    }

    setTemplateHtml(html);
    setTemplateName(htmlFile.name);
  }, []);

  // ── 내용 파일 업로드 (인풋2) ──
  const handleContent = useCallback(async (fileList: FileList) => {
    const file = Array.from(fileList).find(f => /\.html?$/i.test(f.name));
    if (!file) { alert('HTML 파일을 선택하세요.'); return; }
    const html = await file.text();
    setContentHtml(html);
    setContentName(file.name);

    // 자동 필드 추출
    const extracted = extractFieldsFromContent(html);
    setFields(extracted);
    setChatMessages(prev => [...prev, {
      role: 'system',
      text: `내용 파일에서 ${extracted.length}개 필드를 자동 추출했습니다.`,
    }]);
  }, []);

  // ── 바인딩 실행 ──
  const runBinding = useCallback(() => {
    if (!templateHtml || !contentHtml) return;
    setStep('mapping');

    const bindResult = bindFields(templateHtml, fields);
    setResult(bindResult);
    setStep('result');

    setChatMessages(prev => [...prev, {
      role: 'system',
      text: `바인딩 완료: ${bindResult.stats.bound}건 성공, ${bindResult.stats.skipped}건 스킵, ${bindResult.stats.error}건 실패`,
    }]);

    // iframe에 결과 표시
    setTimeout(() => {
      if (iframeRef.current) {
        const doc = iframeRef.current.contentDocument;
        if (doc) {
          doc.open();
          doc.write(bindResult.html);
          doc.close();
        }
      }
    }, 100);
  }, [templateHtml, contentHtml, fields]);

  // ── 채팅으로 수정 ──
  const handleChat = useCallback(() => {
    if (!chatInput.trim() || !result) return;
    const input = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: input }]);
    setChatInput('');

    // 간단한 교체 명령 파싱: "A → B" 또는 "A를 B로 변경"
    let newHtml = result.html;
    let response = '';

    const arrowMatch = input.match(/(.+?)\s*[→=>]\s*(.+)/);
    const replaceMatch = input.match(/['""]?(.+?)['""]?\s*(?:를|을)\s*['""]?(.+?)['""]?\s*(?:로|으로)\s*(?:변경|교체|수정)/);

    const match = arrowMatch || replaceMatch;
    if (match) {
      const search = match[1].trim();
      const replace = match[2].trim();

      if (newHtml.includes(search)) {
        newHtml = newHtml.replace(search, replace);
        response = `"${search}" → "${replace}" 교체 완료`;
      } else {
        // span 내부에서 검색 시도
        const spanRegex = new RegExp(
          `(<span[^>]*>)([^<]*${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*)(</span>)`,
          'g'
        );
        if (spanRegex.test(newHtml)) {
          newHtml = newHtml.replace(spanRegex, (m, open, text, close) => {
            return open + text.replace(search, replace) + close;
          });
          response = `span 내 "${search}" → "${replace}" 교체 완료`;
        } else {
          response = `"${search}" 텍스트를 찾을 수 없습니다.`;
        }
      }
    } else {
      response = '사용법: "변경 전 텍스트 → 변경 후 텍스트" 또는 "A를 B로 변경"';
    }

    const updatedResult = { ...result, html: newHtml };
    setResult(updatedResult);

    setChatMessages(prev => [...prev, { role: 'system', text: response }]);

    // iframe 갱신
    setTimeout(() => {
      if (iframeRef.current) {
        const doc = iframeRef.current.contentDocument;
        if (doc) { doc.open(); doc.write(newHtml); doc.close(); }
      }
    }, 100);
  }, [chatInput, result]);

  // ── 필드 수정 ──
  const updateField = useCallback((id: string, value: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, value } : f));
  }, []);

  // ── 다운로드 ──
  const downloadResult = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateName.replace(/\.html?$/i, '_바인딩.html');
    a.click();
    URL.revokeObjectURL(url);
  }, [result, templateName]);

  // ── 렌더링 ──
  return (
    <div className="h-full flex flex-col">
      {/* 상단: 파일 업로드 + 실행 */}
      <div className="p-4 border-b bg-white space-y-3">
        <div className="flex gap-4">
          {/* 인풋1: 템플릿 */}
          <div
            className={`flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              templateHtml ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
            }`}
            onClick={() => templateInputRef.current?.click()}
            onDrop={e => { e.preventDefault(); handleTemplate(e.dataTransfer.files); }}
            onDragOver={e => e.preventDefault()}
          >
            <input ref={templateInputRef} type="file" accept=".html,.htm,.css,.png,.jpg,.jpeg,.gif,.svg" multiple onChange={e => e.target.files && handleTemplate(e.target.files)} className="hidden" />
            {templateHtml ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">{templateName}</span>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">인풋1: 원본 양식 (HWP→HTML)</p>
                <p className="text-xs text-gray-500">HTML+CSS+이미지 함께 드래그</p>
              </>
            )}
          </div>

          {/* 인풋2: 내용 */}
          <div
            className={`flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              contentHtml ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
            }`}
            onClick={() => contentInputRef.current?.click()}
            onDrop={e => { e.preventDefault(); handleContent(e.dataTransfer.files); }}
            onDragOver={e => e.preventDefault()}
          >
            <input ref={contentInputRef} type="file" accept=".html,.htm" onChange={e => e.target.files && handleContent(e.target.files)} className="hidden" />
            {contentHtml ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">{contentName}</span>
                <span className="text-xs text-gray-500">({fields.length}개 필드)</span>
              </div>
            ) : (
              <>
                <FileText className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">인풋2: 내용 HTML</p>
                <p className="text-xs text-gray-500">사업계획서 내용 파일</p>
              </>
            )}
          </div>
        </div>

        {/* 실행 버튼 */}
        <div className="flex items-center gap-3">
          <button
            onClick={runBinding}
            disabled={!templateHtml || !contentHtml}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            바인딩 실행
          </button>

          {result && (
            <>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {result.stats.bound}건 성공
                </span>
                <span className="flex items-center gap-1 text-gray-500">
                  <Clock className="w-3.5 h-3.5" /> {result.stats.skipped}건 스킵
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <XCircle className="w-3.5 h-3.5" /> {result.stats.error}건 실패
                </span>
              </div>
              <div className="ml-auto">
                <button
                  onClick={downloadResult}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  결과 다운로드
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 하단: 결과 뷰어 + 사이드패널 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 문서 미리보기 */}
        <div className="flex-1 overflow-hidden bg-gray-100 p-2">
          {result ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full bg-white border rounded shadow-sm"
              title="바인딩 결과"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              두 파일을 업로드하고 &quot;바인딩 실행&quot;을 클릭하세요
            </div>
          )}
        </div>

        {/* 우측: 필드 목록 + 채팅 */}
        <div className="w-96 border-l bg-gray-50 flex flex-col overflow-hidden">
          {/* 필드 목록 */}
          <div className="border-b">
            <button
              onClick={() => setShowFields(!showFields)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <span>매핑 필드 ({fields.length})</span>
              {showFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showFields && (
              <div className="max-h-64 overflow-y-auto px-3 pb-3 space-y-1.5">
                {fields.map(f => (
                  <div key={f.id} className={`flex items-start gap-2 p-2 rounded text-xs border ${
                    f.status === 'bound' ? 'bg-green-50 border-green-200' :
                    f.status === 'error' ? 'bg-red-50 border-red-200' :
                    f.status === 'skipped' ? 'bg-gray-50 border-gray-200' :
                    'bg-white border-gray-200'
                  }`}>
                    <div className="pt-0.5">
                      {f.status === 'bound' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> :
                       f.status === 'error' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> :
                       <Clock className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700 truncate">{f.label}</p>
                      <input
                        type="text"
                        value={f.value}
                        onChange={e => updateField(f.id, e.target.value)}
                        className="w-full mt-1 px-2 py-1 border rounded text-xs bg-white"
                      />
                    </div>
                  </div>
                ))}
                {fields.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">내용 파일 업로드 시 자동 추출됩니다</p>
                )}
              </div>
            )}
          </div>

          {/* 채팅 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 text-sm font-medium text-gray-700 border-b">수정 채팅</div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`text-xs p-2 rounded-lg max-w-[90%] ${
                  msg.role === 'user'
                    ? 'ml-auto bg-blue-600 text-white'
                    : 'bg-white border text-gray-700'
                }`}>
                  {msg.text}
                </div>
              ))}
              {chatMessages.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">
                  바인딩 후 수정이 필요하면<br/>
                  &quot;A → B&quot; 형태로 입력하세요
                </p>
              )}
            </div>
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChat()}
                  placeholder="홍길동 → 홍성민"
                  className="flex-1 px-3 py-2 border rounded-lg text-xs"
                />
                <button
                  onClick={handleChat}
                  disabled={!chatInput.trim() || !result}
                  className="p-2 bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
