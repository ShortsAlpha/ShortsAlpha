import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AssetPanel } from "./studio/AssetPanel";
import { PlayerPanel } from "./studio/PlayerPanel";
import { TimelinePanel } from "./studio/TimelinePanel";
import { PropertiesPanel } from "./studio/PropertiesPanel";
import { SubtitlePanel } from "./studio/SubtitlePanel";
import { VoiceoverPanel } from "./studio/VoiceoverPanel";
import { AnimationPanel } from "./studio/AnimationPanel";
import { ExportModal, ExportStatus } from "./studio/ExportModal";
import { WhatsNewModal } from "./WhatsNewModal";
import {
    Download, ChevronLeft, Settings2, LayoutTemplate,
    Video, Music, Type, Mic, Loader2, Sparkles
} from "lucide-react";
import axios from 'axios';

interface StudioViewProps {
    analysisResult: any;
    onBack?: () => void;
    importedAssets?: any[]; // New prop for assets coming from AI Generator
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

export function StudioView({ analysisResult, onBack, importedAssets }: StudioViewProps) {
    // --- Global State ---
    const [isLoading, setIsLoading] = useState(true); // Fake loading state
    const [videoTracks, setVideoTracks] = useState<Track[]>([]);
    const [audioTracks, setAudioTracks] = useState<Track[]>([]);
    const [textTracks, setTextTracks] = useState<Track[]>([]);

    useEffect(() => {
        // Fake loading delay
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);



    // Script & Meta
    const [currentScript, setCurrentScript] = useState(analysisResult?.script || []);
    const [voiceoverAudio, setVoiceoverAudio] = useState<string | null>(null);

    // --- Auto-Load Voiceovers from Script ---
    useEffect(() => {
        if (!currentScript || !Array.isArray(currentScript)) return;

        // Check if we have audioUrls that aren't in tracks yet
        const newAudioTracks: Track[] = [];
        const newAssets: any[] = [];
        let currentAudioTime = 0;
        let hasNewAudio = false;

        currentScript.forEach((segment: any, index: number) => {
            if (segment.audioUrl) {
                // Prevent duplicates
                const isAlreadyTrack = audioTracks.some(t => t.url === segment.audioUrl);

                if (!isAlreadyTrack) {
                    hasNewAudio = true;
                    // Improved duration estimation (approx 1 sec per 15 chars if metadata missing)
                    const estimatedDur = segment.text ? Math.max(2, segment.text.length / 15) : 5;
                    const duration = segment.duration || estimatedDur;

                    newAudioTracks.push({
                        id: `voice_${index}_${Date.now()}`,
                        url: segment.audioUrl,
                        type: 'audio',
                        start: currentAudioTime,
                        duration: duration,
                        trackIndex: 0,
                        volume: 1.0,
                        sourceDuration: duration,
                        text: segment.text
                    });

                    // Add to 'My Media' assets
                    const isAssetExists = userAssets.some(a => a.url === segment.audioUrl);
                    if (!isAssetExists) {
                        newAssets.push({
                            id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, // Added ID
                            key: segment.audioUrl,
                            url: segment.audioUrl,
                            type: 'audio',
                            LastModified: new Date(),
                            Size: 0
                        });
                    }

                    currentAudioTime += duration;
                }
            }
        });

        if (hasNewAudio) {
            setAudioTracks(prev => [...prev, ...newAudioTracks]);
            setUserAssets(prev => [...prev, ...newAssets]);

            // Adjust duration to fit new audio
            setDuration(prev => Math.max(prev, currentAudioTime));
        }
    }, [currentScript]);

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(10); // Default, updates with content

    // Selection & UI State
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'Media' | 'Subtitle' | 'Stock' | 'Voiceover' | 'Animations'>('Media');

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
    const [detailedStatus, setDetailedStatus] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [finalDownloadUrl, setFinalDownloadUrl] = useState<string | null>(null);

    // Mobile Drag State
    const [externalDragItem, setExternalDragItem] = useState<{ url: string, type: 'video' | 'audio' | 'text', title: string } | null>(null);
    const [dragPosition, setDragPosition] = useState<{ x: number, y: number } | null>(null);

    // Subtitle Generation State
    const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false);

    // Asset Management State (Lifted for Persistence)
    const [userAssets, setUserAssets] = useState<any[]>([]);

    // Load Imported Assets (from AI Generator)
    useEffect(() => {
        if (importedAssets && importedAssets.length > 0) {
            setUserAssets(prev => {
                const combined = [...prev];
                importedAssets.forEach(imp => {
                    if (!combined.some(c => c.id === imp.id)) {
                        combined.push(imp);
                    }
                });
                return combined;
            });
        }
    }, [importedAssets]);

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
        try {
            // Real API Call
            const response = await axios.post("/api/subtitles", {
                video_tracks: videoTracks,
                audio_tracks: audioTracks,
                // Include text tracks if we want to augment? No, fresh start or append.
            }, {
                timeout: 300000 // 5 minutes timeout for Gemini 2.5 Pro Audio
            });

            if ((response.data.status === 'success' || response.data.status === 'mock_success') && Array.isArray(response.data.subtitles)) {
                // Map to Track interface
                const newSubs: Track[] = response.data.subtitles.map((sub: any) => ({
                    id: `sub_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'text',
                    text: sub.text,
                    start: sub.start,
                    duration: sub.duration,
                    trackIndex: 0,
                    style: {
                        fontSize: 48, // Larger default
                        color: '#ffffff',
                        fontFamily: 'Inter',
                        x: 0.5,
                        y: 0.8, // Bottom
                        stroke: '#000000',
                        strokeWidth: 4,
                        fontWeight: '800' // Bold by default for shorts
                    }
                }));
                setTextTracks(newSubs);
                saveToHistory(videoTracks, audioTracks, newSubs);
            } else {
                console.error("Subtitle Generation Error:", response.data);
                const msg = response.data.message || response.data.error || "Unknown error";
                const detail = JSON.stringify(response.data);
                alert(`Subtitle generation failed: ${msg}\nDetails: ${detail}`);
            }
        } catch (e: any) {
            console.error("Subtitle Request Failed:", e);
            if (e.response && e.response.data) {
                alert(`Request Failed: ${e.response.data.error || e.message}`);
            } else {
                alert("Subtitle generation request failed. Check server console.");
            }
        } finally {
            setIsGeneratingSubtitles(false);
        }
    };

    const handleApplyToAll = (id: string, style: any) => {
        // Apply the style of the current clip (id) to ALL text clips
        const sourceClip = textTracks.find(t => t.id === id);
        if (!sourceClip || !sourceClip.style) return;

        const newTracks = textTracks.map(t => {
            if (t.type === 'text') {
                return {
                    ...t,
                    style: { ...t.style, ...style }
                };
            }
            return t;
        });
        setTextTracks(newTracks);
        saveToHistory(videoTracks, audioTracks, newTracks);
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
            element.onloadedmetadata = () => {
                const duration = element.duration;
                if (!Number.isFinite(duration)) resolve(10);
                else resolve(duration);
            };
            element.onerror = () => resolve(10);
        });
    };

    const handleAddAsset = async (url: string, mediaType?: 'video' | 'audio') => {
        const cleanUrl = url.split(/[?#]/)[0];
        // If type is provided, use it. Otherwise, guess from extension.
        let type: 'video' | 'audio' = mediaType || 'video';

        if (!mediaType) {
            const isAudio = cleanUrl.match(/\.(mp3|wav|m4a|aac|ogg)$/i);
            type = isAudio ? 'audio' : 'video';
        }

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

        const outputKey = `processed/export_${Date.now()}.mp4`;
        // Hardcoded R2 Public Base URL (Using r2.dev for MVP as configured in env)
        // Ideally should come from env but for client side we need NEXT_PUBLIC_...
        // Assuming the R2_PUBLIC_URL from env finding earlier: https://pub-b1a4f641f6b640c9a03f5731f8362854.r2.dev
        const publicDownloadUrl = `https://pub-b1a4f641f6b640c9a03f5731f8362854.r2.dev/${outputKey}`;
        const statusUrl = `https://pub-b1a4f641f6b640c9a03f5731f8362854.r2.dev/${outputKey}_status.json`;

        // Polling Logic
        const pollForVideo = async (attempts = 0) => {
            if (attempts > 300) { // Timeout after ~15 mins (was 60/3mins)
                setExportStatus('failed');
                setExportError("Timeout waiting for video render. Please check your Dashboard.");
                return;
            }

            try {
                // Check if file exists via PROXY HEAD (Robust)
                // We use the same proxy endpoint. If it returns 'ready', header is 200.
                const proxyFileUrl = `/api/poll-render?url=${encodeURIComponent(publicDownloadUrl)}&t=${Date.now()}`;
                const fileCheck = await fetch(proxyFileUrl);

                if (fileCheck.ok) {
                    const fileData = await fileCheck.json();
                    if (fileData.status === 'ready') {
                        const proxyVideoUrl = `/api/video-proxy?key=${outputKey}`;
                        setFinalDownloadUrl(proxyVideoUrl);
                        setExportStatus('finished');
                        setDetailedStatus("Ready for download!");
                        return;
                    }
                }

                // Check for detailed status JSON via PROXY (Bypasses CORS/Caching on iOS)
                try {
                    const proxyUrl = `/api/poll-render?url=${encodeURIComponent(statusUrl)}&t=${Date.now()}`;
                    const statusCheck = await fetch(proxyUrl);

                    if (statusCheck.ok) {
                        const data = await statusCheck.json();

                        const isFinished =
                            data.status === 'finished' ||
                            data.status === 'success' ||
                            (data.percent === 100 && (data.message?.includes('Finalizing') || data.message?.includes('Success')));

                        // Check for explicit finished status (Robustness for iOS)
                        if (isFinished) {
                            const proxyVideoUrl = `/api/video-proxy?key=${outputKey}`;
                            setFinalDownloadUrl(proxyVideoUrl);
                            setExportStatus('finished');
                            setDetailedStatus("Ready for download!");
                            return;
                        }

                        if (data.message) {
                            setDetailedStatus(data.message);
                        }
                    }
                } catch (err) {
                    // Ignore status fetch errors
                }

            } catch (e) {
                // Ignore network errors during poll (cors etc might happen initially)
            }

            // Retry
            setTimeout(() => pollForVideo(attempts + 1), 3000);
        };

        try {
            // ... (Track cleaning logic identical to before) ...
            // 1. Clean Text Tracks
            const cleanTextTracks = textTracks.map(t => ({
                id: t.id,
                text: t.text,
                start: t.start,
                duration: t.duration,
                type: 'text',
                track_index: t.trackIndex || 0,
                style: t.style ? {
                    color: t.style.color,
                    font_size: (t.style.fontSize || 24) * 3.0, // Reduced to 3.0x for 1080p match
                    font_family: t.style.fontFamily,
                    font_weight: t.style.fontWeight,
                    stroke: t.style.stroke,
                    stroke_width: (t.style.strokeWidth || 0) * 1.5, // Reduced to 1.5x for cleaner stroke
                    background_color: t.style.backgroundColor,
                    text_transform: t.style.textTransform,
                    shadow: t.style.shadow, // Shadow parsing is complex, backend currently ignores it or needs update
                    x: t.style.x,
                    y: t.style.y,
                    animation: t.style.animation // Pass animation type to backend
                } : undefined
            }));

            // 2. Clean Video Tracks
            const cleanVideoTracks = videoTracks.map(t => ({
                id: t.id,
                url: t.url,
                start: t.start,
                duration: t.duration,
                source_duration: t.sourceDuration,
                volume: t.volume,
                track_index: t.trackIndex || 0,
                type: 'video'
            }));

            // 3. Clean Audio Tracks
            const cleanAudioTracks = audioTracks.map(t => ({
                id: t.id,
                url: t.url,
                start: t.start,
                duration: t.duration,
                source_duration: t.sourceDuration,
                volume: t.volume,
                track_index: t.trackIndex || 0,
                type: 'audio'
            }));

            const response = await axios.post("/api/render", {
                video_tracks: cleanVideoTracks,
                audio_tracks: cleanAudioTracks,
                text_tracks: cleanTextTracks,
                script: currentScript,
                output_key: outputKey, // Use const variable
                width: 1080,
                height: 1920
            });

            if (response.data.status === 'mock_success' || response.data.status === 'rendering_started' || response.data.status === 'finished') {
                setExportStatus('processing');
                // Start Polling
                pollForVideo();
            } else {
                setExportStatus('failed');
                setExportError("Unexpected status: " + response.data.status);
            }
        } catch (e: any) {
            console.error("Export Error:", e);
            setExportStatus('failed');
            const serverError = e.response?.data?.error || e.response?.data?.detail;
            const errorMsg = typeof serverError === 'object' ? JSON.stringify(serverError) : (serverError || e.message || "Export failed");
            setExportError(errorMsg);
        }
    };

    const triggerDownload = () => {
        if (!finalDownloadUrl) return;

        // Append download=true to the proxy URL to force attachment header
        const downloadUrl = finalDownloadUrl.includes('?')
            ? `${finalDownloadUrl}&download=true`
            : `${finalDownloadUrl}?download=true`;

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `export.mp4`; // This attribute is often ignored by iOS, but the header will force it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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


    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white font-sans">
                <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-indigo-500 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Video className="w-6 h-6 text-zinc-700" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-lg font-bold tracking-tight">ShortsAlpha</span>
                        <span className="text-xs text-zinc-500 animate-pulse">Initializing Studio...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col z-50 animate-in fade-in duration-300 font-sans">
            <WhatsNewModal />

            {/* Subtitle Generation Loading Overlay */}
            {isGeneratingSubtitles && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-indigo-500 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <h3 className="text-white font-bold text-lg">Generating Subtitles...</h3>
                            <p className="text-zinc-400 text-sm">AI is transcribing your video.</p>
                        </div>
                    </div>
                </div>
            )}

            <ExportModal
                isOpen={isExportModalOpen}
                status={exportStatus}
                detailedStatus={detailedStatus}
                downloadUrl={finalDownloadUrl}
                errorMessage={exportError}
                onClose={() => setIsExportModalOpen(false)}
                onDownload={triggerDownload}
            />

            {/* MAIN WORKSPACE - Header Removed for more space */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

                {/* TOP: Panels + Player + Properties */}
                <div className="flex-1 flex min-h-0 border-b border-zinc-800">

                    {/* LEFT PANEL */}
                    <div className="w-[380px] flex flex-col border-r border-zinc-800 bg-zinc-950 shrink-0 z-10">

                        <div className="flex items-center gap-1 p-2 border-b border-zinc-900 bg-zinc-950 shrink-0">
                            {onBack && (
                                <button
                                    onClick={onBack}
                                    className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors mr-1"
                                    title="Back to Dashboard"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}
                            <button onClick={() => setActiveTab('Media')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${activeTab === 'Media' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Media</button>
                            <button onClick={() => setActiveTab('Stock')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${activeTab === 'Stock' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Stock Library</button>
                            <button onClick={() => setActiveTab('Subtitle')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${activeTab === 'Subtitle' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Subtitles</button>
                            <button onClick={() => setActiveTab('Voiceover')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${activeTab === 'Voiceover' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Voiceover</button>
                        </div>
                        <div className="flex-1 min-h-0">
                            {activeTab === 'Media' && (
                                <AssetPanel
                                    onSelectBackground={handleAddAsset}
                                    currentBackground={null}
                                    onAssetUploaded={handleAssetUploaded}
                                    onExternalDragStart={setExternalDragItem}
                                    userAssets={userAssets}
                                    onUpdateAssets={setUserAssets}
                                    mode="uploads"
                                />
                            )}
                            {activeTab === 'Stock' && (
                                <AssetPanel
                                    onSelectBackground={handleAddAsset}
                                    currentBackground={null}
                                    onAssetUploaded={handleAssetUploaded}
                                    onExternalDragStart={setExternalDragItem}
                                    userAssets={userAssets}
                                    onUpdateAssets={setUserAssets}
                                    mode="stock"
                                />
                            )}
                            {activeTab === 'Subtitle' && (
                                <SubtitlePanel
                                    onGenerateSubtitles={handleGenerateSubtitles}
                                    isGenerating={isGeneratingSubtitles}
                                />
                            )}
                            {activeTab === 'Voiceover' && (
                                <VoiceoverPanel
                                    onAddTrack={(url, type) => handleAddAsset(url, type)}
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
                        <div className="h-14 border-b border-zinc-900 flex items-center justify-between px-4 bg-zinc-950/50">
                            <span className="text-sm font-bold text-zinc-300">Properties</span>
                            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                                <Download className="w-4 h-4" />
                                <span>Export Project</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {selectedClip ? (
                                <PropertiesPanel
                                    selectedClip={selectedClip}
                                    onUpdateClip={handleUpdateClip}
                                    onApplyToAll={handleApplyToAll}
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
