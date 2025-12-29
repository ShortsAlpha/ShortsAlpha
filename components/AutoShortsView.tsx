import { useState } from "react";
import { Upload, FileVideo, Layout, Zap, ArrowRight, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

interface AutoShortsViewProps {
    onBack: () => void;
    onAnalyze: (result: any) => void;
}

export function AutoShortsView({ onBack, onAnalyze }: AutoShortsViewProps) {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [layout, setLayout] = useState<'focus' | 'split'>('focus');

    // Mock Upload Logic (Reuse logic from SplitScreen or direct UploadThing later)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setAnalyzing(true);

        try {
            // 1. Upload to R2 (for Studio playback)
            const filename = `auto_shorts_${Date.now()}.mp4`;
            const uploadRes = await axios.post('/api/upload', {
                filename,
                contentType: file.type || 'video/mp4',
                prefix: 'auto_shorts'
            });

            const { uploadUrl, publicUrl } = uploadRes.data;

            await axios.put(uploadUrl, file, {
                headers: { 'Content-Type': file.type || 'video/mp4' }
            });

            // 2. Analyze Faces (via Backend Proxy)
            const formData = new FormData();
            formData.append("file", file);

            const analysisRes = await axios.post('/api/face-detect', formData);

            const result = analysisRes.data;

            if (result.error) throw new Error(result.error);

            // 3. Process Tracking Data for Multi-Cam
            // The backend returns { t, x, left, right }
            // We need to split this into two separate tracking arrays
            const rawTracking = result.tracking_data || [];

            console.log("DEBUG: Raw Tracking Data (Sample):", JSON.stringify(rawTracking.slice(0, 5)));
            console.log("DEBUG: Total Tracking Frames:", rawTracking.length);

            // Default Fallbacks: If no face found, point to likely location.
            // BETTER LOGIC: If 'left' is specific (Face A), use it.
            // If missing, fallback to 'd.x' (Main Face) instead of 0.25 (Empty space).
            // This ensures single-speaker videos are centered correctly.
            // Default Fallbacks: If specific face is missing, SNAP TO CORRECT SIDE.
            // Do NOT fallback to 'd.x' (Center/0.5) because that makes the camera stare at the empty wall.
            const trackLeft = rawTracking.map((d: any) => ({
                t: d.t,
                x: d.left ?? 0.25, // Fallback to Left Quarter
                y: d.left_y ?? d.y ?? 0.20
            }));
            const trackRight = rawTracking.map((d: any) => ({
                t: d.t,
                x: d.right ?? 0.75, // Fallback to Right Quarter
                y: d.right_y ?? d.y ?? 0.20
            }));

            // 4. Pass Data to Studio (Multi-Cam Setup)
            // Use Blob URL for immediate playback (R2 might take time to propagate or publicUrl issue)
            const blobUrl = URL.createObjectURL(file);

            onAnalyze({
                url: blobUrl,
                filename: file.name,
                duration: result.duration || 60,
                layout: layout,
                suggestedLayout: result.suggested_layout,
                faces: result.max_faces_detected,
                // Pass raw tracking just in case, but we really want the pre-processed clips logic
                // Actually, let's pass the pre-split data so Studio can create the clips
                multiCamTracks: {
                    left: trackLeft,
                    right: trackRight
                },
                diarization: result.diarization // Pass diarization data strictly
            });

        } catch (error: any) {
            console.error("Analysis Failed:", error);
            toast.error(error.message || "Analysis Failed");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* Header */}
            <div className="text-center space-y-4 mb-12">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 mb-4">
                    <Users className="w-8 h-8 text-pink-400" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                    Auto Face Tracking
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                    Upload a podcast or interview. We'll detect faces and create vertical shorts automatically.
                </p>
            </div>

            {/* Main Card */}
            <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl">

                {/* Step 1: Upload */}
                <div className="space-y-8">
                    <div className={`p-8 border-2 border-dashed rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-4 group cursor-pointer
                        ${file ? 'border-pink-500/50 bg-pink-500/5' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'}`}
                        onClick={() => document.getElementById('file-upload')?.click()}
                    >
                        <input
                            id="file-upload"
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {file ? (
                            <>
                                <FileVideo className="w-12 h-12 text-pink-400" />
                                <div className="text-center">
                                    <h3 className="text-lg font-medium text-white">{file.name}</h3>
                                    <p className="text-zinc-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                                </div>
                                <button className="text-sm text-pink-400 hover:underline" onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                }}>Remove & Upload Different</button>
                            </>
                        ) : (
                            <>
                                <Upload className="w-12 h-12 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                                <div className="text-center">
                                    <h3 className="text-lg font-medium text-white">Upload Podcast / Video</h3>
                                    <p className="text-zinc-500">MP4, MOV up to 500MB</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Step 2: Layout Selection */}
                    {file && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                <Layout className="w-4 h-4 text-zinc-400" />
                                Select Format
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setLayout('focus')}
                                    className={`p-4 rounded-xl border text-left transition-all ${layout === 'focus'
                                        ? 'bg-pink-500/10 border-pink-500/50 ring-1 ring-pink-500/50'
                                        : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'}`}
                                >
                                    <div className="flex gap-2 mb-2">
                                        <div className="w-4 h-6 rounded-sm bg-zinc-600"></div>
                                    </div>
                                    <div className="font-bold text-white">Active Speaker Focus</div>
                                    <div className="text-xs text-zinc-500 mt-1">Cuts to whoever is speaking.</div>
                                </button>
                                <button
                                    onClick={() => setLayout('split')}
                                    className={`p-4 rounded-xl border text-left transition-all ${layout === 'split'
                                        ? 'bg-pink-500/10 border-pink-500/50 ring-1 ring-pink-500/50'
                                        : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'}`}
                                >
                                    <div className="flex gap-1 mb-2">
                                        <div className="w-4 h-3 rounded-sm bg-zinc-600"></div>
                                        <div className="w-4 h-3 rounded-sm bg-zinc-600"></div>
                                    </div>
                                    <div className="font-bold text-white">Split Screen Grid</div>
                                    <div className="text-xs text-zinc-500 mt-1">Shows multiple faces at once.</div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800">
                    <button onClick={onBack} className="text-zinc-400 hover:text-white transition">
                        Back
                    </button>
                    <button
                        onClick={handleAnalyze}
                        disabled={!file || analyzing}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all
                            ${!file
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white shadow-lg shadow-pink-500/20'
                            }`}
                    >
                        {analyzing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Detecting Faces...
                            </>
                        ) : (
                            <>
                                <Zap className="w-5 h-5" />
                                Analyze Video
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
