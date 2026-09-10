import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Trash2,
  RefreshCw,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { ScheduleItem, UserRole } from '../types';
import { parseScheduleCsv, generateSampleCsv, CsvParseResult } from '../utils/csvParser';
import { ConfirmModal } from './ConfirmModal';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportItems: (items: ScheduleItem[]) => void;
  currentUserRole?: UserRole;
  currentItemsCount: number;
  onRestrictedAction?: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportItems,
  currentUserRole = 'Editor',
  currentItemsCount,
  onRestrictedAction,
}) => {
  const isViewer = currentUserRole === 'Viewer';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setParseResult({
        success: false,
        items: [],
        headers: [],
        rowCount: 0,
        errors: ['Please select a valid .csv spreadsheet file.'],
        warnings: [],
      });
      setSelectedFile(file);
      return;
    }

    setSelectedFile(file);
    setIsReadingFile(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text);
      const result = parseScheduleCsv(text);
      setParseResult(result);
      setIsReadingFile(false);
    };

    reader.onerror = () => {
      setParseResult({
        success: false,
        items: [],
        headers: [],
        rowCount: 0,
        errors: ['Error reading file content. Please try again.'],
        warnings: [],
      });
      setIsReadingFile(false);
    };

    reader.readAsText(file);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClearSelectedFile = () => {
    setSelectedFile(null);
    setFileContent(null);
    setParseResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const templateContent = generateSampleCsv();
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'schedule_template_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleInitiateImport = () => {
    if (isViewer) {
      if (onRestrictedAction) {
        onRestrictedAction();
      }
      return;
    }

    if (!parseResult || !parseResult.success || parseResult.items.length === 0) {
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmAndApply = () => {
    setShowConfirmModal(false);
    if (parseResult && parseResult.items.length > 0) {
      onImportItems(parseResult.items);
      onClose();
    }
  };

  return (
    <div
      id="csv-import-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="csv-import-modal-container"
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Import Schedule from CSV
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload a CSV file to replace current workspace milestones
              </p>
            </div>
          </div>
          <button
            type="button"
            id="csv-import-close-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Role Alert for Viewer */}
          {isViewer && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <span className="font-semibold block text-amber-900">
                  Read-Only Permission Active
                </span>
                You are currently signed in with the Viewer role. You can inspect and test the CSV preview, but replacing the workspace schedule requires Editor or Admin permissions.
              </div>
            </div>
          )}

          {/* Upload Area (Drag & Drop + Click) */}
          <div
            id="csv-dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 select-none ${
              isDragOver
                ? 'border-emerald-500 bg-emerald-50/60 scale-[1.005]'
                : selectedFile
                ? 'border-emerald-300 bg-emerald-50/20 hover:bg-emerald-50/30'
                : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              id="csv-file-input"
              accept=".csv,text/csv"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center gap-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                  isDragOver
                    ? 'bg-emerald-600 text-white shadow-md'
                    : selectedFile
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {selectedFile ? (
                  <FileSpreadsheet className="w-7 h-7" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {isDragOver ? (
                    <span className="text-emerald-700">Drop your CSV file here</span>
                  ) : selectedFile ? (
                    <span>Click or drag to choose another CSV file</span>
                  ) : (
                    <>
                      <span className="text-emerald-700 hover:underline font-bold">
                        Click to browse
                      </span>{' '}
                      or drag & drop your CSV file here
                    </>
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports standard CSV formatted with Day, Responsible, Key Activities, Subtasks, Evaluation, Category, and Safety Notes.
                </p>
              </div>

              {/* Template Download & Hint Button */}
              <div className="pt-2 flex items-center gap-2 flex-wrap justify-center">
                <button
                  type="button"
                  id="csv-download-template-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTemplate();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download Sample Template CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active File Card */}
          {selectedFile && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB •{' '}
                    {parseResult?.rowCount ?? 0} milestone(s) detected
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearSelectedFile}
                title="Remove selected file"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Parsing Errors Banner */}
          {parseResult && parseResult.errors.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>CSV Parsing Issues</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {parseResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsing Warnings Banner */}
          {parseResult && parseResult.warnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Parser Notices & Adjustments</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {parseResult.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Items Preview */}
          {parseResult && parseResult.success && parseResult.items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Schedule Structure Match ({parseResult.items.length} items parsed)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Ready to replace {currentItemsCount} current item(s)
                </span>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Day</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Responsible</th>
                        <th className="py-2.5 px-3">Key Activities</th>
                        <th className="py-2.5 px-3">Subtasks</th>
                        <th className="py-2.5 px-3 text-right">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseResult.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {item.day}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-slate-700 bg-slate-100 rounded border border-slate-200">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {item.responsible}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 max-w-[200px]">
                            <p className="line-clamp-2">{item.keyActivities}</p>
                            {item.safetyNotes && (
                              <p className="text-[10px] text-amber-700 truncate mt-0.5">
                                ⚠️ {item.safetyNotes}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-center">
                            {item.subtasks.length} item(s)
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span
                              className={`font-semibold ${
                                item.evaluation === 100
                                  ? 'text-emerald-600'
                                  : item.evaluation >= 50
                                  ? 'text-blue-600'
                                  : 'text-slate-600'
                              }`}
                            >
                              {item.evaluation}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Overwrite Warning Callout */}
              <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200/80 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Important:</span> Applying this import will completely
                  replace the existing {currentItemsCount} milestone(s) in your workspace with the {parseResult.items.length} milestone(s) from this CSV.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-500">
            CSV items automatically conform to the ScheduleItem schema.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="csv-import-confirm-submit-btn"
              onClick={handleInitiateImport}
              disabled={
                !parseResult ||
                !parseResult.success ||
                parseResult.items.length === 0 ||
                isReadingFile
              }
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {parseResult && parseResult.items.length > 0
                  ? `Replace with ${parseResult.items.length} Item(s)`
                  : 'Import & Replace Schedule'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Overwriting Workspace Schedule */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirm Schedule Overwrite"
        message={`Are you sure you want to replace your current schedule (${currentItemsCount} items) with the ${
          parseResult?.items.length ?? 0
        } milestones from "${selectedFile?.name}"?\n\nThis will overwrite existing schedule items in your workspace.`}
        confirmLabel={`Replace Current Schedule (${parseResult?.items.length ?? 0} Items)`}
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmAndApply}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
};
