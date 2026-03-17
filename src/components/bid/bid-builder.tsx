"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Receipt, ChevronLeft, ChevronRight, Save, Plus, Trash2 } from "lucide-react";
import type { Issue } from "@/types/issue";
import type { Report, ReportHistory } from "@/types/report";
import type { ProposalData, EstimateData, BidTemplateId } from "@/types/bid";
import { PROPOSAL_STEPS, ESTIMATE_STEPS, EMPTY_PROPOSAL, EMPTY_ESTIMATE } from "@/lib/bid-templates";
import { fetchIssues } from "@/lib/issues";
import { fetchReportsByIssueId, createReport, updateReport, deleteReport, fetchReportHistories } from "@/lib/reports";
import { StepNavigator } from "./step-navigator";
import { AttachmentViewer } from "./attachment-viewer";
import { DocumentHistory } from "./document-history";

// Proposal steps
import { StepBasic } from "./proposal/step-basic";
import { StepCompany } from "./proposal/step-company";
import { StepTech } from "./proposal/step-tech";
import { StepSchedule } from "./proposal/step-schedule";
import { StepTeam } from "./proposal/step-team";
import { StepCost } from "./proposal/step-cost";
import { ProposalPreview } from "./proposal/proposal-preview";

// Estimate steps
import { EstStepBasic } from "./estimate/step-basic";
import { EstStepItems } from "./estimate/step-items";
import { EstStepTerms } from "./estimate/step-terms";
import { EstimatePreview } from "./estimate/estimate-preview";

export function BidBuilder() {
  // Issue selection
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Template & wizard
  const [templateId, setTemplateId] = useState<BidTemplateId | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Form data
  const [proposalData, setProposalData] = useState<ProposalData>({ ...EMPTY_PROPOSAL });
  const [estimateData, setEstimateData] = useState<EstimateData>({ ...EMPTY_ESTIMATE });

  // Saved docs
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [savedDocs, setSavedDocs] = useState<Report[]>([]);
  const [histories, setHistories] = useState<ReportHistory[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);

  // Load issues
  useEffect(() => {
    fetchIssues().then(setIssues).catch(() => {});
  }, []);

  // Load saved docs when issue changes
  const loadSavedDocs = useCallback(async (issueId: string) => {
    const docs = await fetchReportsByIssueId(issueId);
    setSavedDocs(docs);
  }, []);

  useEffect(() => {
    if (selectedIssue) {
      loadSavedDocs(selectedIssue.id);
    } else {
      setSavedDocs([]);
    }
  }, [selectedIssue, loadSavedDocs]);

  // Load histories when report changes
  useEffect(() => {
    if (currentReport) {
      fetchReportHistories(currentReport.id).then(setHistories);
    } else {
      setHistories([]);
    }
  }, [currentReport]);

  const steps = templateId === "proposal" ? PROPOSAL_STEPS : templateId === "estimate" ? ESTIMATE_STEPS : [];
  const maxStep = steps.length;

  function selectTemplate(tid: BidTemplateId) {
    setTemplateId(tid);
    setCurrentStep(1);
    setCurrentReport(null);
    if (tid === "proposal") setProposalData({ ...EMPTY_PROPOSAL });
    else setEstimateData({ ...EMPTY_ESTIMATE });
  }

  function loadDocument(doc: Report) {
    setTemplateId(doc.template_id as BidTemplateId);
    setCurrentStep(1);
    setCurrentReport(doc);
    if (doc.template_id === "proposal") {
      setProposalData(doc.data as unknown as ProposalData);
    } else {
      setEstimateData(doc.data as unknown as EstimateData);
    }
    fetchReportHistories(doc.id).then(setHistories);
  }

  function handleRestore(history: ReportHistory) {
    if (templateId === "proposal") {
      setProposalData(history.data as unknown as ProposalData);
    } else {
      setEstimateData(history.data as unknown as EstimateData);
    }
    setCurrentStep(1);
  }

  async function handleSave() {
    if (!templateId || !selectedIssue) return;
    setSaving(true);
    try {
      const formData = templateId === "proposal" ? proposalData : estimateData;
      const title =
        templateId === "proposal"
          ? proposalData.projectName || "제안서"
          : estimateData.title || "견적서";

      if (currentReport) {
        const updated = await updateReport(currentReport.id, {
          data: formData as unknown as Record<string, string | number>[],
          title,
          change_note: "위자드 수정",
        });
        setCurrentReport(updated);
        fetchReportHistories(updated.id).then(setHistories);
      } else {
        const created = await createReport({
          issue_id: selectedIssue.id,
          template_id: templateId,
          title,
          data: formData as unknown as Record<string, string | number>[],
          chart_config: [],
        });
        setCurrentReport(created);
      }
      await loadSavedDocs(selectedIssue.id);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(doc: Report) {
    await deleteReport(doc.id);
    if (currentReport?.id === doc.id) {
      setCurrentReport(null);
      setTemplateId(null);
    }
    if (selectedIssue) loadSavedDocs(selectedIssue.id);
  }

  // Render current step content
  function renderStep() {
    if (templateId === "proposal") {
      switch (currentStep) {
        case 1: return <StepBasic data={proposalData} onChange={setProposalData} />;
        case 2: return <StepCompany data={proposalData} onChange={setProposalData} />;
        case 3: return <StepTech data={proposalData} onChange={setProposalData} />;
        case 4: return <StepSchedule data={proposalData} onChange={setProposalData} />;
        case 5: return <StepTeam data={proposalData} onChange={setProposalData} />;
        case 6: return <StepCost data={proposalData} onChange={setProposalData} />;
        case 7: return <ProposalPreview data={proposalData} />;
      }
    }
    if (templateId === "estimate") {
      switch (currentStep) {
        case 1: return <EstStepBasic data={estimateData} onChange={setEstimateData} />;
        case 2: return <EstStepItems data={estimateData} onChange={setEstimateData} />;
        case 3: return <EstStepTerms data={estimateData} onChange={setEstimateData} />;
        case 4: return <EstimatePreview data={estimateData} />;
      }
    }
    return null;
  }

  return (
    <div className="flex gap-6">
      {/* Left sidebar — issue picker + saved docs + attachments */}
      <div className="w-64 shrink-0 space-y-4 no-print">
        {/* Issue list */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">이슈 선택</h4>
          <div className="max-h-[200px] space-y-1 overflow-y-auto">
            {issues.map((issue) => (
              <button
                key={issue.id}
                onClick={() => {
                  setSelectedIssue(issue);
                  setTemplateId(null);
                  setCurrentReport(null);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                  selectedIssue?.id === issue.id
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="line-clamp-1 font-medium">{issue.title}</span>
                <span className="mt-0.5 block text-zinc-400">{issue.status}</span>
              </button>
            ))}
            {issues.length === 0 && (
              <p className="px-3 py-2 text-xs text-zinc-400">이슈가 없습니다</p>
            )}
          </div>
        </div>

        {/* Saved documents */}
        {selectedIssue && savedDocs.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">저장된 문서</h4>
            <div className="space-y-1">
              {savedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs ${
                    currentReport?.id === doc.id
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  <button onClick={() => loadDocument(doc)} className="flex-1 text-left truncate">
                    {doc.template_id === "proposal" ? "제안서" : "견적서"}: {doc.title}
                    <span className="ml-1 text-zinc-400">v{doc.version}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="shrink-0 rounded p-0.5 text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        <AttachmentViewer issueId={selectedIssue?.id ?? null} />

        {/* History */}
        {currentReport && (
          <DocumentHistory
            histories={histories}
            currentVersion={currentReport.version}
            onRestore={handleRestore}
          />
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {!selectedIssue ? (
          <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
            좌측에서 이슈를 선택하세요
          </div>
        ) : !templateId ? (
          /* Template selector */
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">문서 유형 선택</h3>
            <p className="text-sm text-zinc-500">
              <strong>{selectedIssue.title}</strong>에 대한 문서를 작성합니다.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => selectTemplate("proposal")}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-zinc-200 p-6 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
              >
                <FileText size={32} className="text-blue-600" />
                <span className="text-sm font-semibold">제안서</span>
                <span className="text-xs text-zinc-500">기술 제안서 (7단계)</span>
              </button>
              <button
                onClick={() => selectTemplate("estimate")}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-zinc-200 p-6 transition-colors hover:border-green-500 hover:bg-green-50 dark:border-zinc-700 dark:hover:border-green-500 dark:hover:bg-green-900/20"
              >
                <Receipt size={32} className="text-green-600" />
                <span className="text-sm font-semibold">견적서</span>
                <span className="text-xs text-zinc-500">견적서 (4단계)</span>
              </button>
            </div>
            {savedDocs.length > 0 && (
              <p className="text-xs text-zinc-400">또는 좌측에서 저장된 문서를 선택하세요</p>
            )}
          </div>
        ) : (
          /* Wizard */
          <div className="space-y-6">
            <div className="no-print">
              <StepNavigator steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
            </div>

            {/* Step content */}
            <div className="min-h-[400px]">{renderStep()}</div>

            {/* Wizard controls */}
            <div className="flex items-center justify-between border-t border-zinc-200 pt-4 no-print dark:border-zinc-700">
              <div className="flex gap-2">
                <button
                  onClick={() => { setTemplateId(null); setCurrentReport(null); }}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Plus size={14} className="mr-1 inline" />
                  새 문서
                </button>
              </div>
              <div className="flex items-center gap-2">
                {currentStep > 1 && (
                  <button
                    onClick={() => setCurrentStep((s) => s - 1)}
                    className="flex items-center gap-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    <ChevronLeft size={16} /> 이전
                  </button>
                )}
                {currentStep < maxStep && (
                  <button
                    onClick={() => setCurrentStep((s) => s + 1)}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    다음 <ChevronRight size={16} />
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-900/20"
                >
                  <Save size={16} />
                  {saving ? "저장 중..." : currentReport ? "수정 저장" : "저장"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
