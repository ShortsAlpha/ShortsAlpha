import { useState, useEffect } from "react";
import { AssetPanel } from "./studio/AssetPanel";
import { PlayerPanel } from "./studio/PlayerPanel";
// ScriptPanel removed
import { TimelinePanel } from "./studio/TimelinePanel";
import { Download, ChevronLeft, LayoutTemplate, Settings2, Volume2, Video, Music } from "lucide-react";
import axios from "axios";
import { PropertiesPanel } from "./studio/PropertiesPanel";
import { ExportModal, ExportStatus } from "./studio/ExportModal";
import { WhatsNewModal } from "./WhatsNewModal";

interface StudioViewProps {
    analysisResult: any; // The Script + Metadata
}

export function StudioView({ analysisResult }: StudioViewProps) {
    // Global State for the Editor
    // Tracks: { id, url, type, start, duration, offset, trackIndex, volume }
    const [videoTracks, setVideoTracks] = useState<any[]>([]);
    const [audioTracks, setAudioTracks] = useState<any[]>([]); // Separated Audio Tracks
    const [voiceoverAudio, setVoiceoverAudio] = useState<string | null>(null);
    const [currentScript, setCurrentScript] = useState(analysisResult?.script || []);

    // Selection State
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(30);

    // Derived State
    const activeVideoClips = videoTracks
        .filter(t => currentTime >= t.start && currentTime < t.start + t.duration)
        .sort((a, b) => (a.trackIndex || 0) - (b.trackIndex || 0));

    const selectedClip = videoTracks.find(t => t.id === selectedClipId) || audioTracks.find(t => t.id === selectedClipId);

    // Track State (Mute/Hide/Lock)
    // Map: trackIndex -> { muted, hidden }
    const [videoTrackState, setVideoTrackState] = useState<Record<number, { muted: boolean, hidden: boolean }>>({});
    const [audioTrackState, setAudioTrackState] = useState<Record<number, { muted: boolean, hidden: boolean }>>({});

    const toggleTrackState = (type: 'video' | 'audio', trackIndex: number, key: 'muted' | 'hidden' | 'locked') => {
        if (key === 'locked') return; // Not implemented yet
        if (type === 'video') {
            setVideoTrackState(prev => ({
                ...prev,
                [trackIndex]: { ...prev[trackIndex], [key]: !prev[trackIndex]?.[key] }
            }));
        } else {
            setAudioTrackState(prev => ({
                ...prev,
                [trackIndex]: { ...prev[trackIndex], [key]: !prev[trackIndex]?.[key] }
            }));
        }
    };

    // Helper: Get Video/Audio Duration
    const getAssetDuration = (url: string, type: 'video' | 'audio'): Promise<number> => {
        return new Promise((resolve) => {
            const element = document.createElement(type);
            element.src = url;
            element.onloadedmetadata = () => {
                resolve(element.duration);
            };
            element.onerror = () => {
                resolve(10);
            }
        });
    };

    // Helper: Add Asset to Timeline
    const handleAddAsset = async (url: string) => {
        // Simple type detection
        const isAudio = url.match(/\.(mp3|wav|m4a)$/i);
        const type = isAudio ? 'audio' : 'video';

        const duration = await getAssetDuration(url, type);

        if (type === 'audio') {
            // Magnetic Logic for Audio (Snap to end of Track 0)
            const track0Items = audioTracks.filter(t => t.trackIndex === 0 || t.trackIndex === undefined);
            const lastTrack = track0Items[track0Items.length - 1];
            const newStartTime = lastTrack ? lastTrack.start + lastTrack.duration : 0;

            const newTrack = {
                id: Math.random().toString(36).substr(2, 9),
                url,
                type: 'audio',
                start: newStartTime,
                duration: duration,
                trackIndex: 0, // Default Audio Track 0
                volume: 1.0
            };
            setAudioTracks([...audioTracks, newTrack]);
        } else {
            // Magnetic Logic for Video Track 0
            const track0Items = videoTracks.filter(t => t.trackIndex === 0 || t.trackIndex === undefined);
            const lastTrack = track0Items[track0Items.length - 1];
            const newStartTime = lastTrack ? lastTrack.start + lastTrack.duration : 0;

            const newTrack = {
                id: Math.random().toString(36).substr(2, 9),
                url,
                type: 'video',
                start: newStartTime,
                duration: duration,
                trackIndex: 0, // Default Video Track 0
                volume: 1.0
            };

            const updatedTracks = [...videoTracks, newTrack];
            setVideoTracks(updatedTracks);

            // Update total duration (Video leads duration usually)
            const totalDuration = updatedTracks.reduce((acc, t) => Math.max(acc, t.start + t.duration), 0);
            setDuration(Math.max(30, totalDuration));
        }
    };

    // Helper: Update a specific clip's property
    const handleUpdateClip = (id: string, updates: any) => {
        // Check Video
        const vIndex = videoTracks.findIndex(t => t.id === id);
        if (vIndex !== -1) {
            const newTracks = [...videoTracks];
            newTracks[vIndex] = { ...newTracks[vIndex], ...updates };
            setVideoTracks(newTracks);
            return;
        }
        // Check Audio
        const aIndex = audioTracks.findIndex(t => t.id === id);
        if (aIndex !== -1) {
            const newTracks = [...audioTracks];
            newTracks[aIndex] = { ...newTracks[aIndex], ...updates };
            setAudioTracks(newTracks);
            return;
        }
    };

    // Helper: Normalize/Compact Tracks (Remove empty gaps)
    const normalizeTracks = (tracks: any[]) => {
        // Group by index
        const byIndex: { [key: number]: any[] } = {};
        tracks.forEach(t => {
            const idx = t.trackIndex || 0;
            if (!byIndex[idx]) byIndex[idx] = [];
            byIndex[idx].push(t);
        });

        // Get sorted indices that have content
        const activeIndices = Object.keys(byIndex).map(Number).sort((a, b) => a - b);

        const newTracks: any[] = [];
        activeIndices.forEach((oldIdx, newIdx) => {
            byIndex[oldIdx].forEach(clip => {
                clip.trackIndex = newIdx; // Shift to compact
                newTracks.push(clip);
            });
        });

        // If entirely empty, newTracks is [], which works.
        return newTracks;
    };

    const handleUpdateVideoTracks = (newTracks: any[]) => {
        // Removed normalizeTracks to allow gaps/stable stacking
        setVideoTracks(newTracks);
    };

    const handleUpdateAudioTracks = (newTracks: any[]) => {
        // Removed normalizeTracks to allow gaps/stable stacking
        setAudioTracks(newTracks);
    };

    // Spacebar Key Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                setIsPlaying(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Playback Loop
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentTime(prev => {
                    if (prev >= duration) {
                        setIsPlaying(false);
                        return 0;
                    }
                    return prev + 0.1; // 100ms tick
                });
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isPlaying, duration]);

    // Format current subtitle based on time
    const getCurrentSubtitle = () => {
        // Simple mock logic for subtitles - improvement: use logic based on track or global script time
        const sceneIndex = Math.floor(currentTime / 3);
        return currentScript[sceneIndex]?.text || "";
    };

    // Key Tracking for Cleanup
    const [uploadedKeys, setUploadedKeys] = useState<string[]>([]);
    const [isCleaningUp, setIsCleaningUp] = useState(false);

    const handleAssetUploaded = (key: string) => {
        setUploadedKeys(prev => [...prev, key]);
    };

    const handleExitProject = async () => {
        if (uploadedKeys.length > 0) {
            setIsCleaningUp(true);
            try {
                // Determine keys to delete (All session uploads)
                // Note: If user wants to SAVE project, we would NOT delete.
                // But request was "after exiting project... delete".

                await axios.post("/api/cleanup", { keys: uploadedKeys });
                console.log("Cleanup complete. Deleted:", uploadedKeys);
            } catch (error) {
                console.error("Cleanup failed:", error);
            } finally {
                setIsCleaningUp(false);
            }
        }

        // Navigate away (For now, simple reload/reset since we have no text routing)
        window.location.reload();
    };

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
    const [exportError, setExportError] = useState<string | null>(null);
    const [finalDownloadUrl, setFinalDownloadUrl] = useState<string | null>(null);

    const [externalDragItem, setExternalDragItem] = useState<{ url: string, type: 'video' | 'audio', title: string } | null>(null);
    const [dragPosition, setDragPosition] = useState<{ x: number, y: number } | null>(null);

    // Track Drag Position
    useEffect(() => {
        if (!externalDragItem) {
            setDragPosition(null);
            return;
        }

        const handleTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            setDragPosition({ x: touch.clientX, y: touch.clientY });
        };

        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        return () => window.removeEventListener('touchmove', handleTouchMove);
    }, [externalDragItem]);

    const handleExport = async () => {
        setIsExportModalOpen(true);
        setExportStatus('uploading');
        setFinalDownloadUrl(null);

        try {
            const exportData = {
                video_tracks: videoTracks,
                audio_tracks: audioTracks,
                script: currentScript,
                output_key: `export_${Date.now()}.mp4`,
                r2_account_id: "",
                r2_access_key_id: "",
                r2_secret_access_key: "",
                r2_bucket_name: ""
            };

            const response = await axios.post("/api/render", exportData);

            if (response.data.status === 'mock_success') {
                alert("Export Simulated!");
                setIsExportModalOpen(false);
            } else {
                setExportStatus('rendering');
                const resultUrl = response.data.result_url;

                if (!resultUrl) {
                    setExportStatus('failed');
                    return;
                }

                // Poll every 5 seconds
                const pollInterval = setInterval(async () => {
                    try {
                        const check = await fetch(`/api/poll-render?url=${encodeURIComponent(resultUrl)}`);
                        if (check.ok) {
                            const data = await check.json();
                            if (data.status === 'ready') {
                                clearInterval(pollInterval);
                                setExportStatus('ready');
                                setFinalDownloadUrl(resultUrl);
                            }
                        }
                    } catch (e) {
                        console.error("Polling error:", e);
                    }
                }, 5000);

                // Safety Timeout (15 minutes)
                setTimeout(() => {
                    clearInterval(pollInterval);
                    if (exportStatus !== 'ready') {
                        setExportStatus('failed');
                    }
                }, 900000);
            }

        } catch (e: any) {
            console.error("Export Failed", e);
            setExportStatus('failed');
            // Extract meaningful message
            let msg = "Export failed to start.";
            if (e.response) {
                msg = `Server Error: ${e.response.status} - ${JSON.stringify(e.response.data)}`;
            } else if (e.message) {
                msg = e.message;
            }
            setExportError(msg);
        }
    };

    const triggerDownload = () => {
        if (!finalDownloadUrl) return;
        const link = document.createElement('a');
        link.href = finalDownloadUrl;
        link.download = `video_export_${Date.now()}.mp4`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportModalOpen(false); // Close after starting download
    };

    return (
        <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col z-50 animate-in fade-in duration-300 font-sans">
            <WhatsNewModal />
            <ExportModal
                isOpen={isExportModalOpen}
                status={exportStatus}
                errorMessage={exportError}
                downloadUrl={finalDownloadUrl}
                onClose={() => setIsExportModalOpen(false)}
                onDownload={triggerDownload}
            />
            {/* 1. Header */}
            <header className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleExitProject}
                        disabled={isCleaningUp}
                        className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                        title="Back & Cleanup"
                    >
                        {isCleaningUp ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <ChevronLeft className="w-5 h-5" />}
                    </button>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-sm text-zinc-200">Untitled Project</h1>
                        <span className="text-[10px] text-zinc-500">Last saved just now</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        disabled={isExportModalOpen}
                        className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20 ${isExportModalOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                        <span className="text-xs font-bold text-zinc-400">YA</span>
                    </div>
                </div>
            </header>

            {/* 2. Main Workspace (Vertical Split: Top Panels / Bottom Timeline) */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

                {/* TOP HALF: Assets | Player | Properties */}
                <div className="flex-1 flex min-h-0 border-b border-zinc-800">

                    {/* LEFT: Asset Library */}
                    <div className="w-[380px] flex flex-col border-r border-zinc-800 bg-zinc-950 shrink-0 z-10">
                        <div className="flex items-center gap-1 p-2 border-b border-zinc-900 bg-zinc-950 shrink-0">
                            {['Media', 'Audio', 'Text', 'Transitions', 'Filters'].map((tab, i) => (
                                <button key={tab} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${i === 0 ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 min-h-0">
                            <AssetPanel
                                onSelectBackground={handleAddAsset}
                                currentBackground={null}
                                onAssetUploaded={handleAssetUploaded}
                                onExternalDragStart={setExternalDragItem}
                            />
                        </div>
                    </div>

                    {/* CENTER: Player */}
                    <div className="flex-1 flex flex-col min-w-0 bg-zinc-900/50 relative">
                        <div className="flex-1 flex items-center justify-center p-8">
                            {/* Player Container */}
                            <div className="aspect-[9/16] h-full max-h-full shadow-2xl rounded-lg overflow-hidden ring-1 ring-zinc-800 bg-black relative">
                                <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between px-3 pointer-events-none">
                                    <span className="text-[10px] text-white/50 font-mono">1080x1920</span>
                                </div>
                                <PlayerPanel
                                    script={currentScript}
                                    activeVideoClips={activeVideoClips}
                                    currentTime={currentTime}
                                    isPlaying={isPlaying}
                                    onTogglePlay={() => setIsPlaying(!isPlaying)}
                                    currentSubtitle={getCurrentSubtitle()}
                                    audioTracks={audioTracks}
                                    videoTrackState={videoTrackState}
                                    audioTrackState={audioTrackState}
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Properties */}
                    <div className="w-80 border-l border-zinc-800 bg-zinc-950 shrink-0 flex flex-col z-10">
                        <div className="h-10 border-b border-zinc-900 flex items-center px-4 bg-zinc-950/50">
                            <span className="text-xs font-bold text-zinc-400">Properties</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {selectedClip ? (
                                <PropertiesPanel
                                    selectedClip={selectedClip}
                                    onUpdateClip={handleUpdateClip}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2 p-8 text-center opacity-50">
                                    <LayoutTemplate className="w-8 h-8 mb-2" />
                                    <span className="text-xs">Select a clip on the timeline to edit properties.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* BOTTOM HALF: Docked Timeline (Full Width) */}
                <div className="h-[320px] bg-zinc-950 shrink-0 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 relative">
                    <div className="h-8 border-b border-zinc-800 flex items-center px-4 gap-4 bg-[#1e1e1e]">
                        <div className="flex gap-2">
                            <button className="text-zinc-400 hover:text-white" title="Undo"><Settings2 className="w-3 h-3" /></button>
                        </div>
                        <div className="h-3 w-px bg-zinc-700" />
                        <span className="text-[10px] text-zinc-500">Timeline</span>
                    </div>
                    <div className="flex-1 min-h-0 bg-[#1e1e1e]">
                        <TimelinePanel
                            script={currentScript}
                            videoTracks={videoTracks}
                            audioTracks={audioTracks}
                            currentTime={currentTime}
                            duration={duration}
                            onSeek={setCurrentTime}
                            isPlaying={isPlaying}
                            onTogglePlay={() => setIsPlaying(!isPlaying)}
                            onUpdateVideoTracks={handleUpdateVideoTracks}
                            onUpdateAudioTracks={handleUpdateAudioTracks}
                            selectedClipId={selectedClipId}
                            onSelectClip={setSelectedClipId}
                            videoTrackState={videoTrackState}
                            audioTrackState={audioTrackState}
                            onToggleTrackState={toggleTrackState}

                            // Mobile Drag Props
                            externalDragItem={externalDragItem}
                            onExternalDragEnd={() => setExternalDragItem(null)}
                        />
                    </div>
                </div>

            </div>

            {/* Drag Ghost Element (Mobile) */}
            {externalDragItem && (
                <div
                    className="fixed z-50 pointer-events-none p-2 bg-zinc-800 rounded-lg shadow-2xl border border-indigo-500 opacity-90 flex items-center gap-2 transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                        left: (dragPosition?.x || 0),
                        top: (dragPosition?.y || 0),
                    }}
                >
                    {externalDragItem.type === 'video' ? <Video className="w-4 h-4 text-white" /> : <Music className="w-4 h-4 text-white" />}
                    <span className="text-xs text-white font-bold">{externalDragItem.title}</span>
                </div>
            )}
        </div>
    );
}
