import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AssetPanel } from "./studio/AssetPanel";
import { PlayerPanel } from "./studio/PlayerPanel";
import { TimelinePanel } from "./studio/TimelinePanel";
import { PropertiesPanel } from "./studio/PropertiesPanel";
import { SubtitlePanel } from "./studio/SubtitlePanel";
import { ExportModal, ExportStatus } from "./studio/ExportModal";
import { WhatsNewModal } from "./WhatsNewModal";
import {
    Download, ChevronLeft, Settings2, LayoutTemplate,
    Video, Music, Type
} from "lucide-react";
import axios from 'axios';

interface StudioViewProps {
    analysisResult: any;
}

export interface Track {
    id: string;
    url?: string;
    type: 'video' | 'audio' | 'text';
    start: number;
    duration: number;
    trackIndex?: number;
    text?: string;
    style?: any;
    volume?: number;
    offset?: number;
    sourceDuration?: number;
}

interface HistoryState {
    video: Track[];
    audio: Track[];
    text: Track[];
}

export function StudioView({ analysisResult }: StudioViewProps) {
    // --- Global State ---
    const [videoTracks, setVideoTracks] = useState<Track[]>([]);
    const [audioTracks, setAudioTracks] = useState<Track[]>([]);
    const [textTracks, setTextTracks] = useState<Track[]>([]);

    // Script & Meta
    const [currentScript, setCurrentScript] = useState(analysisResult?.script || []);
    const [voiceoverAudio, setVoiceoverAudio] = useState<string | null>(null);

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(30);

    // Selection & UI State
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'Media' | 'Subtitle'>('Media');

    // Track State (Muted/Hidden/Locked)
    const [videoTrackState, setVideoTrackState] = useState<Record<number, { muted: boolean, hidden: boolean, locked: boolean }>>({});
    const [audioTrackState, setAudioTrackState] = useState<Record<number, { muted: boolean, hidden: boolean, locked: boolean }>>({});

    // History
    const [history, setHistory] = useState<HistoryState[]>([{ video: [], audio: [], text: [] }]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Cleaning State
    const [uploadedKeys, setUploadedKeys] = useState<string[]>([]);
    const [isCleaningUp, setIsCleaningUp] = useState(false);

    // Export State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
    const [exportError, setExportError] = useState<string | null>(null);
    const [finalDownloadUrl, setFinalDownloadUrl] = useState<string | null>(null);

    // Mobile Drag State
    const [externalDragItem, setExternalDragItem] = useState<{ url: string, type: 'video' | 'audio' | 'text', title: string } | null>(null);
    const [dragPosition, setDragPosition] = useState<{ x: number, y: number } | null>(null);

    // Subtitle Generation State
    const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false);

    // --- Derived State ---
    const selectedClip = [...videoTracks, ...audioTracks, ...textTracks].find(c => c.id === selectedClipId);

    const activeVideoClips = videoTracks.filter(track =>
        currentTime >= track.start && currentTime < track.start + track.duration && !videoTrackState[track.trackIndex || 0]?.hidden
    ).sort((a, b) => (a.trackIndex || 0) - (b.trackIndex || 0)); // Render order

    // --- History Logic ---
    const saveToHistory = (newVideo: Track[], newAudio: Track[], newText: Track[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ video: newVideo, audio: newAudio, text: newText });
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const prevIndex = historyIndex - 1;
            const state = history[prevIndex];
            setVideoTracks(state.video);
            setAudioTracks(state.audio);
            setTextTracks(state.text || []);
            setHistoryIndex(prevIndex);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const nextIndex = historyIndex + 1;
            const state = history[nextIndex];
            setVideoTracks(state.video);
            setAudioTracks(state.audio);
            setTextTracks(state.text || []);
            setHistoryIndex(nextIndex);
        }
    };

    // --- Data Update Handlers ---
    const handleUpdateVideoTracks = (newTracks: any[]) => {
        setVideoTracks(newTracks);
        saveToHistory(newTracks, audioTracks, textTracks);

        // Update Duration
        const maxVid = Math.max(0, ...newTracks.map((t: Track) => t.start + t.duration));
        const maxAud = Math.max(0, ...audioTracks.map((t: Track) => t.start + t.duration));
        setDuration(Math.max(30, maxVid, maxAud));
    };

    const handleUpdateAudioTracks = (newTracks: any[]) => {
        setAudioTracks(newTracks);
        saveToHistory(videoTracks, newTracks, textTracks);

        // Update Duration
        const maxVid = Math.max(0, ...videoTracks.map((t: Track) => t.start + t.duration));
        const maxAud = Math.max(0, ...newTracks.map((t: Track) => t.start + t.duration));
        setDuration(Math.max(30, maxVid, maxAud));
    };

    const handleUpdateTextTracks = (newTracks: any[]) => {
        setTextTracks(newTracks);
        saveToHistory(videoTracks, audioTracks, newTracks);
    };

    const handleUpdateClip = (id: string, updates: any) => {
        // Try Video
        let foundIndex = videoTracks.findIndex(t => t.id === id);
        if (foundIndex !== -1) {
            const newTracks = [...videoTracks];
            newTracks[foundIndex] = { ...newTracks[foundIndex], ...updates };
            handleUpdateVideoTracks(newTracks);
            return;
        }
        // Try Audio
        foundIndex = audioTracks.findIndex(t => t.id === id);
        if (foundIndex !== -1) {
            const newTracks = [...audioTracks];
            newTracks[foundIndex] = { ...newTracks[foundIndex], ...updates };
            handleUpdateAudioTracks(newTracks);
            return;
        }
        // Try Text
        foundIndex = textTracks.findIndex(t => t.id === id);
        if (foundIndex !== -1) {
            const newTracks = [...textTracks];
            newTracks[foundIndex] = { ...newTracks[foundIndex], ...updates };
            handleUpdateTextTracks(newTracks);
            return;
        }
    };

    const toggleTrackState = (type: 'video' | 'audio', trackIndex: number, key: 'muted' | 'hidden' | 'locked') => {
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

    // --- Subtitle Generation ---
    const handleGenerateSubtitles = async () => {
        setIsGeneratingSubtitles(true);
        // Mock API Call Delay
        await new Promise(r => setTimeout(r, 2000));

        // Generate Mock Subtitles based on Video Tracks
        const newTextTracks: any[] = [];
        videoTracks.forEach((video, i) => {
            // Create 2 subtitles per video clip as demo
            if (video.duration < 1) return;
            const duration = video.duration;
            const part1 = {
                id: `sub_${Math.random().toString(36).substr(2, 9)}`,
                type: 'text',
                text: "Welcome to this scene",
                start: video.start,
                duration: duration / 2,
                trackIndex: 0,
                style: {
                    fontSize: 24,
                    color: '#ffffff',
                    fontFamily: 'Inter',
                    x: 0.5, // Center
                    y: 0.8  // Bottom
                }
            };
            const part2 = {
                id: `sub_${Math.random().toString(36).substr(2, 9)}`,
                type: 'text',
                text: "This is auto-generated text",
                start: video.start + (duration / 2),
                duration: duration / 2,
                trackIndex: 0,
                style: {
                    fontSize: 24,
                    color: '#ffffff',
                    fontFamily: 'Inter',
                    x: 0.5, // Center
                    y: 0.8
                }
            };
            newTextTracks.push(part1, part2);
        });

        setTextTracks(newTextTracks);
        saveToHistory(videoTracks, audioTracks, newTextTracks);
        setIsGeneratingSubtitles(false);
    };

    // --- Asset Management ---
    const handleAssetUploaded = (key: string) => {
        setUploadedKeys(prev => [...prev, key]);
    };

    // ADD Asset (Logic moved mostly to AssetPanel or here)
    // Previously handleAddAsset
    const getAssetDuration = (url: string, type: 'video' | 'audio'): Promise<number> => {
        return new Promise((resolve) => {
            const element = document.createElement(type);
            element.src = url;
            element.onloadedmetadata = () => resolve(element.duration);
            element.onerror = () => resolve(10);
        });
    };

    const handleAddAsset = async (url: string) => {
        const cleanUrl = url.split(/[?#]/)[0];
        const isAudio = cleanUrl.match(/\.(mp3|wav|m4a)$/i);
        const type = isAudio ? 'audio' : 'video';
        const duration = await getAssetDuration(url, type);

        if (type === 'audio') {
            const track0Items = audioTracks.filter(t => t.trackIndex === 0 || t.trackIndex === undefined);
            const lastTrack = track0Items[track0Items.length - 1];
            const newStartTime = lastTrack ? lastTrack.start + lastTrack.duration : 0;
            const newTrack: Track = {
                id: Math.random().toString(36).substr(2, 9),
                url,
                type: 'audio',
                start: newStartTime,
                duration,
                trackIndex: 0,
                volume: 1.0,
                sourceDuration: duration
            };
            handleUpdateAudioTracks([...audioTracks, newTrack]);
        } else {
            const track0Items = videoTracks.filter(t => t.trackIndex === 0 || t.trackIndex === undefined);
            const lastTrack = track0Items[track0Items.length - 1];
            const newStartTime = lastTrack ? lastTrack.start + lastTrack.duration : 0;
            const newTrack: Track = {
                id: Math.random().toString(36).substr(2, 9),
                url,
                type: 'video',
                start: newStartTime,
                duration,
                trackIndex: 0,
                volume: 1.0,
                sourceDuration: duration
            };
            handleUpdateVideoTracks([...videoTracks, newTrack]);
        }
    };

    // --- Playback Loop ---
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentTime(prev => {
                    if (prev >= duration) {
                        setIsPlaying(false);
                        return 0;
                    }
                    return prev + 0.1;
                });
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isPlaying, duration]);

    // Spacebar
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

    // --- Export ---
    const handleExport = async () => {
        setIsExportModalOpen(true);
        setExportStatus('uploading');
        setFinalDownloadUrl(null);
        // ... (Simplified logic for brevity, assuming similar to previous)
        try {
            const response = await axios.post("/api/render", {
                video_tracks: videoTracks,
                audio_tracks: audioTracks,
                script: currentScript,
                output_key: `export_${Date.now()}.mp4`
            });
            if (response.data.status === 'mock_success') {
                setIsExportModalOpen(false);
                alert("Simulated Export Success");
            } else {
                setExportStatus('failed'); // Placeholder for real polling logic
                setExportError("Real export pipeline pending configuration.");
            }
        } catch (e: any) {
            setExportStatus('failed');
            setExportError(e.message || "Export failed");
        }
    };

    const triggerDownload = () => {
        if (!finalDownloadUrl) return;
        const link = document.createElement('a');
        link.href = finalDownloadUrl;
        link.download = `export.mp4`;
        link.click();
    };

    const handleExitProject = () => {
        window.location.reload();
    };

    // Mobile Drag Tracking
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

            {/* HEADER */}
            <header className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={handleExitProject} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h1 className="font-bold text-sm text-zinc-200">Untitled Project</h1>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500">
                    <Download className="w-3 h-3" />
                    <span>Export</span>
                </button>
            </header>

            {/* MAIN WORKSPACE */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

                {/* TOP: Panels + Player + Properties */}
                <div className="flex-1 flex min-h-0 border-b border-zinc-800">

                    {/* LEFT PANEL */}
                    <div className="w-[380px] flex flex-col border-r border-zinc-800 bg-zinc-950 shrink-0 z-10">
                        <div className="flex items-center gap-1 p-2 border-b border-zinc-900 bg-zinc-950 shrink-0">
                            <button onClick={() => setActiveTab('Media')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${activeTab === 'Media' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Media</button>
                            <button onClick={() => setActiveTab('Subtitle')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${activeTab === 'Subtitle' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Subtitle</button>
                        </div>
                        <div className="flex-1 min-h-0">
                            {activeTab === 'Media' ? (
                                <AssetPanel
                                    onSelectBackground={handleAddAsset}
                                    currentBackground={null}
                                    onAssetUploaded={handleAssetUploaded}
                                    onExternalDragStart={setExternalDragItem}
                                />
                            ) : (
                                <SubtitlePanel
                                    onGenerateSubtitles={handleGenerateSubtitles}
                                    isGenerating={isGeneratingSubtitles}
                                />
                            )}
                        </div>
                    </div>

                    {/* CENTER: PLAYER */}
                    <div className="flex-1 flex flex-col min-w-0 bg-zinc-900/50 relative p-8 items-center justify-center">
                        <div className="aspect-[9/16] h-full max-h-full shadow-2xl rounded-lg overflow-hidden ring-1 ring-zinc-800 bg-black relative">
                            <PlayerPanel
                                script={currentScript}
                                activeVideoClips={activeVideoClips}
                                currentTime={currentTime}
                                isPlaying={isPlaying}
                                onTogglePlay={() => setIsPlaying(!isPlaying)}
                                currentSubtitle={""}
                                audioTracks={audioTracks}
                                videoTrackState={videoTrackState}
                                audioTrackState={audioTrackState}
                                textTracks={textTracks}
                                onUpdateTextTracks={handleUpdateTextTracks}
                                selectedClipId={selectedClipId}
                                onSelectClip={setSelectedClipId}
                            />
                        </div>
                    </div>

                    {/* RIGHT: PROPERTIES */}
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
                                    <span className="text-xs">Select a clip to edit properties.</span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* BOTTOM: TIMELINE */}
                <div className="h-[320px] bg-zinc-950 shrink-0 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 relative">
                    <div className="h-8 border-b border-zinc-800 flex items-center px-4 gap-4 bg-[#1e1e1e]">
                        <span className="text-[10px] text-zinc-500">Timeline</span>
                    </div>
                    <div className="flex-1 min-h-0 bg-[#1e1e1e]">
                        <TimelinePanel
                            script={currentScript}
                            videoTracks={videoTracks}
                            audioTracks={audioTracks}
                            textTracks={textTracks} // NEW
                            currentTime={currentTime}
                            duration={duration}
                            onSeek={setCurrentTime}
                            isPlaying={isPlaying}
                            onTogglePlay={() => setIsPlaying(!isPlaying)}
                            onUpdateVideoTracks={handleUpdateVideoTracks}
                            onUpdateAudioTracks={handleUpdateAudioTracks}
                            onUpdateTextTracks={handleUpdateTextTracks} // NEW
                            selectedClipId={selectedClipId}
                            onSelectClip={setSelectedClipId}
                            videoTrackState={videoTrackState}
                            audioTrackState={audioTrackState}
                            onToggleTrackState={toggleTrackState}
                            externalDragItem={externalDragItem}
                            onExternalDragEnd={() => setExternalDragItem(null)}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                        />
                    </div>
                </div>

            </div>

            {/* Drag Ghost Element */}
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
