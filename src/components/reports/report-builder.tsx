"use client";

import { useState, useCallback } from "react";
import { Save, Edit3, Trash2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { IssuePicker } from "./issue-picker";
import { TemplatePicker } from "./template-picker";
import { QaForm } from "./qa-form";
import { DynamicChart } from "./dynamic-chart";
import { DataTable } from "./data-table";
import { ReportHistoryList } from "./report-history";
import { parseAttachmentFile } from "@/lib/csv-parser";
import { matchFields, remapData } from "@/lib/field-matcher";
import { REPORT_TEMPLATES } from "@/lib/report-templates";
import {
  createReport,
  updateReport,
  deleteReport,
  fetchReportsByIssueId,
  fetchReportHistories,
} from "@/lib/reports";
import type { Issue } from "@/types/issue";
import type { Attachment } from "@/types/attachment";
import type {
  ReportTemplate,
  ParsedData,
  FieldMatchResult,
  QaResponse,
  Report,
  ReportHistory,
  ChartDef,
} from "@/types/report";

export function ReportBuilder() {
  // Issue & file
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parsing, setParsing] = useState(false);

  // Template & matching
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [matchResult, setMatchResult] = useState<FieldMatchResult | null>(null);
  const [showQa, setShowQa] = useState(false);

  // Report data
  const [reportData, setReportData] = useState<Record<string, string | number>[]>([]);
  const [chartConfigs, setChartConfigs] = useState<ChartDef[]>([]);
  const [qaResponses, setQaResponses] = useState<QaResponse[]>([]);

  // Saved report
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [savedReports, setSavedReports] = useState<Report[]>([]);
  const [histories, setHistories] = useState<ReportHistory[]>([]);

  // Custom chart config
  const [customXKey, setCustomXKey] = useState("");
  const [customYKeys, setCustomYKeys] = useState<string[]>([]);
  const [customChartType, setCustomChartType] = useState<ChartDef["type"]>("bar");

  const { showToast } = useToast();

  // ── Handlers ──

  const handleSelectIssue = useCallback(async (issue: Issue) => {
    setSelectedIssue(issue);
    setParsedData(null);
    setReportData([]);
    setChartConfigs([]);
    setMatchResult(null);
    setShowQa(false);
    setCurrentReport(null);
    setHistories([]);

    const reports = await fetchReportsByIssueId(issue.id);
    setSavedReports(reports);
  }, []);

  const handleSelectFile = useCallback(async (attachment: Attachment) => {
    setParsing(true);
    try {
      const result = await parseAttachmentFile(
        attachment.file_path,
        attachment.file_name,
        attachment.content_type,
      );
      const parsed = result.data;
      setParsedData(parsed);

      if (result.warning?.type === "empty") {
        showToast(result.warning.message);
        return;
      }
      if (result.warning?.type === "truncated") {
        showToast(result.warning.message);
      } else {
        showToast(`${parsed.rows.length}행 파싱 완료`, "success");
      }

      // 템플릿이 선택되어 있으면 자동 매칭
      if (selectedTemplate && selectedTemplate.id !== "custom") {
        applyTemplate(selectedTemplate, parsed);
      }
    } catch {
      showToast("파일 파싱에 실패했습니다");
    } finally {
      setParsing(false);
    }
  }, [selectedTemplate, showToast]);

  function applyTemplate(template: ReportTemplate, data: ParsedData) {
    if (template.id === "custom") {
      // 커스텀: 헤더 그대로 사용
      setReportData(data.rows);
      setChartConfigs([]);
      setMatchResult(null);
      setShowQa(false);
      setCustomXKey(data.headers[0] ?? "");
      setCustomYKeys(data.headers.slice(1, 3));
      return;
    }

    const result = matchFields(template, data);
    setMatchResult(result);

    const remapped = remapData(data, result);
    setReportData(remapped);
    setChartConfigs(template.charts);

    if (result.missing.length > 0) {
      setShowQa(true);
    } else {
      setShowQa(false);
    }
  }

  function handleSelectTemplate(template: ReportTemplate) {
    setSelectedTemplate(template);
    if (parsedData) {
      applyTemplate(template, parsedData);
    }
  }

  function handleQaSubmit(responses: QaResponse[]) {
    setQaResponses((prev) => [...prev, ...responses]);

    // Q&A 응답을 데이터에 병합 (각 응답의 값을 줄바꿈으로 분리하여 행에 분배)
    const updatedData = [...reportData];
    for (const resp of responses) {
      const values = resp.answer.split("\n").filter((v) => v.trim() !== "");
      values.forEach((val, i) => {
        if (updatedData[i]) {
          const numVal = Number(val.replace(/,/g, ""));
          updatedData[i] = {
            ...updatedData[i],
            [resp.fieldKey]: isNaN(numVal) ? val.trim() : numVal,
          };
        }
      });
    }
    setReportData(updatedData);
    setShowQa(false);
    showToast("데이터가 반영되었습니다", "success");
  }

  function handleQaSkip() {
    setShowQa(false);
  }

  function handleApplyCustomChart() {
    if (!customXKey || customYKeys.length === 0) return;
    const config: ChartDef = {
      type: customChartType,
      xKey: customXKey,
      yKeys: customYKeys,
      title: `${customXKey} 기준 분석`,
    };
    setChartConfigs([config]);
  }

  async function handleSave() {
    if (reportData.length === 0) return;

    const title = selectedTemplate
      ? `${selectedTemplate.name} - ${selectedIssue?.title ?? "리포트"}`
      : selectedIssue?.title ?? "리포트";

    try {
      if (currentReport) {
        const updated = await updateReport(currentReport.id, {
          data: reportData,
          chart_config: chartConfigs,
          qa_responses: qaResponses,
          change_note: "데이터 수정",
        });
        setCurrentReport(updated);
        const hist = await fetchReportHistories(updated.id);
        setHistories(hist);
        showToast(`v${updated.version} 저장 완료`, "success");
      } else {
        const created = await createReport({
          issue_id: selectedIssue?.id ?? null,
          template_id: selectedTemplate?.id ?? "custom",
          title,
          data: reportData,
          chart_config: chartConfigs,
          qa_responses: qaResponses,
        });
        setCurrentReport(created);
        setSavedReports((prev) => [created, ...prev]);
        showToast("리포트가 저장되었습니다", "success");
      }
    } catch {
      showToast("저장에 실패했습니다");
    }
  }

  async function handleDelete(reportId: string) {
    if (!confirm("이 리포트를 삭제하시겠습니까?")) return;
    try {
      await deleteReport(reportId);
      setSavedReports((prev) => prev.filter((r) => r.id !== reportId));
      if (currentReport?.id === reportId) {
        setCurrentReport(null);
        setReportData([]);
        setChartConfigs([]);
        setHistories([]);
      }
      showToast("리포트가 삭제되었습니다", "success");
    } catch {
      showToast("삭제에 실패했습니다");
    }
  }

  async function handleLoadReport(report: Report) {
    setCurrentReport(report);
    setReportData(report.data);
    setChartConfigs(report.chart_config);
    setQaResponses(report.qa_responses);
    const tmpl = REPORT_TEMPLATES.find((t) => t.id === report.template_id) ?? null;
    setSelectedTemplate(tmpl);

    const hist = await fetchReportHistories(report.id);
    setHistories(hist);
  }

  function handlePreviewHistory(history: ReportHistory) {
    setReportData(history.data);
    setChartConfigs(history.chart_config);
    showToast(`v${history.version} 미리보기`, "success");
  }

  // ── Render ──

  const hasOutput = reportData.length > 0 && chartConfigs.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 좌측 패널 */}
      <div className="lg:col-span-1 space-y-5">
        <IssuePicker
          onSelectFile={handleSelectFile}
          selectedIssueId={selectedIssue?.id ?? null}
          onSelectIssue={handleSelectIssue}
        />

        {parsedData && (
          <div className="text-xs text-zinc-500">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{parsedData.fileName}</span>
            {" "}: {parsedData.rows.length}행, {parsedData.headers.length}열
          </div>
        )}

        <TemplatePicker
          selectedId={selectedTemplate?.id ?? null}
          onSelect={handleSelectTemplate}
        />

        {/* 저장된 리포트 */}
        {savedReports.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              저장된 리포트
            </h4>
            <div className="space-y-1">
              {savedReports.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer transition-colors ${
                    currentReport?.id === r.id
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                  onClick={() => handleLoadReport(r)}
                >
                  <span className="truncate">{r.title} (v{r.version})</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                    className="rounded p-1 text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 이력 */}
        {currentReport && (
          <ReportHistoryList
            histories={histories}
            currentVersion={currentReport.version}
            onPreview={handlePreviewHistory}
          />
        )}
      </div>

      {/* 우측 출력 영역 */}
      <div className="lg:col-span-3 space-y-6">
        {parsing && (
          <div className="text-center py-12 text-sm text-zinc-400">
            파일 파싱 중...
          </div>
        )}

        {/* Q&A 폼 */}
        {showQa && matchResult && (
          <QaForm
            missingFields={matchResult.missing}
            onSubmit={handleQaSubmit}
            onSkip={handleQaSkip}
          />
        )}

        {/* 커스텀 차트 설정 */}
        {selectedTemplate?.id === "custom" && parsedData && (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h4 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">차트 설정</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">차트 타입</label>
                <select
                  value={customChartType}
                  onChange={(e) => setCustomChartType(e.target.value as ChartDef["type"])}
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value="bar">바 차트</option>
                  <option value="line">라인 차트</option>
                  <option value="area">에어리어 차트</option>
                  <option value="pie">파이 차트</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">X축</label>
                <select
                  value={customXKey}
                  onChange={(e) => setCustomXKey(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {parsedData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Y축 (복수 선택)</label>
                <select
                  multiple
                  value={customYKeys}
                  onChange={(e) => setCustomYKeys(Array.from(e.target.selectedOptions, (o) => o.value))}
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  size={Math.min(parsedData.headers.length, 4)}
                >
                  {parsedData.headers.filter((h) => h !== customXKey).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleApplyCustomChart}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 차트 출력 */}
        {hasOutput && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chartConfigs.map((chart, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <h4 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">{chart.title}</h4>
                <DynamicChart chartDef={chart} data={reportData} />
              </div>
            ))}
          </div>
        )}

        {/* 데이터 테이블 */}
        {reportData.length > 0 && (
          <DataTable
            columns={selectedTemplate?.tableColumns ?? []}
            data={reportData}
          />
        )}

        {/* 저장/수정 버튼 */}
        {reportData.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {currentReport ? <Edit3 size={14} /> : <Save size={14} />}
              {currentReport ? `수정 저장 (v${currentReport.version + 1})` : "리포트 저장"}
            </button>
            {matchResult && matchResult.missing.length > 0 && !showQa && (
              <button
                onClick={() => setShowQa(true)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
              >
                <Plus size={14} />
                데이터 추가 입력
              </button>
            )}
          </div>
        )}

        {/* 빈 상태 */}
        {!parsing && reportData.length === 0 && !showQa && (
          <div className="text-center py-16 text-zinc-400 text-sm">
            {!selectedIssue
              ? "왼쪽에서 Board 이슈를 선택하세요"
              : !parsedData
              ? "이슈의 첨부 파일(CSV/JSON)을 선택하세요"
              : "템플릿을 선택하면 출력물이 생성됩니다"}
          </div>
        )}
      </div>
    </div>
  );
}
