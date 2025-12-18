
import React from 'react';
import { Loader2, CheckCircle2, Download, AlertCircle, X } from 'lucide-react';

export type ExportStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'failed' | 'finished';

interface ExportModalProps {
    isOpen: boolean;
    status: ExportStatus;
    detailedStatus?: string | null;
    downloadUrl: string | null;
    errorMessage?: string | null;
    onClose: () => void;
    onDownload: () => void;
    onCloseComplete?: () => void; // Called when closing after success
}

export function ExportModal({ isOpen, status, detailedStatus, downloadUrl, errorMessage, onClose, onDownload }: ExportModalProps) {
    if (!isOpen) return null;

    const steps = [
        {
            id: 'uploading',
            label: 'Preparing Assets',
            description: 'Uploading project files to cloud',
            isActive: status === 'uploading',
            isDone: ['processing', 'success', 'finished'].includes(status)
        },
        {
            id: 'rendering',
            label: 'Cloud Rendering',
            description: (status === 'processing' && detailedStatus) ? detailedStatus : 'Processing video on high-performance server',
            isActive: status === 'processing',
            isDone: ['success', 'finished'].includes(status)
        },
        {
            id: 'ready',
            label: 'Finalizing',
            description: 'Video is ready for download',
            isActive: status === 'finished' || status === 'success',
            isDone: status === 'finished' || status === 'success'
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl w-full shadow-2xl p-6 relative transition-all duration-500 ${status === 'finished' || status === 'success' ? 'max-w-4xl' : 'max-w-md'}`}>

                {/* Close / Cancel Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10 p-2 hover:bg-zinc-800 rounded-full"
                    title={status === 'finished' || status === 'success' || status === 'failed' ? "Close" : "Cancel Rendering"}
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Column: Preview (Only visible when finished) */}
                    {(status === 'finished' || status === 'success') && downloadUrl && (
                        <div className="flex-1 animate-in slide-in-from-right-10 fade-in duration-500">
                            <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">Preview</h3>
                            <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden border border-zinc-700 shadow-inner relative group">
                                <video
                                    src={downloadUrl}
                                    controls
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </div>
                    )}

                    {/* Right Column: Status & Controls */}
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-bold text-white mb-2">Exporting Video</h2>
                            <p className="text-sm text-zinc-400">
                                {(status === 'finished' || status === 'success') ? 'Your video is ready!' : 'Please wait while we process your masterpiece.'}
                            </p>
                        </div>

                        {/* Steps */}
                        <div className="space-y-6 mb-8">
                            {steps.map((step, idx) => (
                                <div key={step.id} className="flex items-start gap-4">
                                    <div className="relative pt-1">
                                        {step.isDone ? (
                                            <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                        ) : step.isActive ? (
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700" />
                                        )}

                                        {/* Connector Line */}
                                        {idx < steps.length - 1 && (
                                            <div className={`absolute left - 3 top - 7 w - px h - 10 ${step.isDone ? 'bg-green-500/30' : 'bg-zinc-800'} `} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className={`font - medium ${step.isActive || step.isDone ? 'text-zinc-200' : 'text-zinc-500'} `}>
                                            {step.label}
                                        </h3>
                                        {(step.isActive) && (
                                            <p className="text-xs text-zinc-400 mt-1 animate-pulse">
                                                {step.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Failed State */}
                        {status === 'failed' && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-3 text-red-400">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <div className="text-sm">
                                    <span className="font-bold block">Render Failed</span>
                                    {errorMessage || "Check console logs for details. (API Access / CORS?)"}
                                </div>
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            onClick={onDownload}
                            disabled={status !== 'finished' && status !== 'success'}
                            className={`
                                w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all
                                ${status === 'finished' || status === 'success'
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20 scale-100'
                                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed grayscale'
                                }
                            `}
                        >
                            <Download className={`w-5 h-5 ${(status === 'finished' || status === 'success') ? 'animate-bounce' : ''}`} />
                            <span>Download Project</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
