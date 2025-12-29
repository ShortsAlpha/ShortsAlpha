import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, ChevronLeft, Gamepad, Layers, ArrowRight, Video, Loader2 } from 'lucide-react';
import axios from 'axios';

interface SplitScreenSetupProps {
    onBack: () => void;
    onGenerate: (script: any) => void;
}

// Initial Presets (URLs will be hydrated from API)
const INITIAL_OPTIONS = [
    { id: 'minecraft', name: 'Minecraft Parkour', color: 'from-emerald-600 to-green-500', keywords: ['minecraft'] },
    { id: 'gta', name: 'GTA V Ramps', color: 'from-orange-600 to-red-500', keywords: ['gta'] },
    { id: 'subway', name: 'Subway Surfers', color: 'from-blue-600 to-cyan-500', keywords: ['subway'] },
    { id: 'satisfying', name: 'Satisfying Sand', color: 'from-purple-600 to-pink-500', keywords: ['satisfying'] }
];

export function SplitScreenSetup({ onBack, onGenerate }: SplitScreenSetupProps) {
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedGame, setSelectedGame] = useState<string>('minecraft');
    const [isProcessing, setIsProcessing] = useState(false);

    // Stock Video State
    const [gameOptions, setGameOptions] = useState<any[]>(INITIAL_OPTIONS);
    const [stockLoading, setStockLoading] = useState(true);

    // Fetch Real Signed URLs
    useEffect(() => {
        setStockLoading(true);
        axios.get('/api/stock')
            .then(res => {
                const assets = res.data.assets || [];

                // Map API assets to our categories
                const updatedOptions = INITIAL_OPTIONS.map(opt => {
                    // Find first matching video for this category
                    const match = assets.find((a: any) =>
                        a.type === 'video' &&
                        opt.keywords.some(k => a.title.toLowerCase().includes(k))
                    );

                    // Fallback using the fetched URL if found
                    return {
                        ...opt,
                        url: match ? match.url : null
                    };
                });

                setGameOptions(updatedOptions);
            })
            .catch(err => console.error("Failed to fetch stock:", err))
            .finally(() => setStockLoading(false));
    }, []);

    // Dropzone Logic
    const onDrop = async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            setUploadedFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'video/*': [] },
        maxFiles: 1
    });

    const handleCreate = async () => {
        if (!uploadedFile || !previewUrl) return;

        setIsProcessing(true);

        // 1. Determine Gameplay Asset
        const game = gameOptions.find(g => g.id === selectedGame);
        // Fallback or Alert
        if (!game?.url) {
            alert("Stock video not found for this category (Check connection/R2 Bucket).");
            setIsProcessing(false);
            return;
        }
        const gameUrl = game.url;

        // 1080p Portrait Layout: Total 1080x1920.
        // Revised: "Fit Width" for Top Video (16:9) to prevent side cropping.
        // Width = 100%. Height = 31.64% (16:9 ratio). Centered Y = 9.18%.

        // 2. Upload USER video to R2/S3 (Required for Transcribe/Render)
        let finalUserUrl = '';

        try {
            // A. Get Presigned URL
            const filename = `split_user_${Date.now()}.mp4`;
            const uploadRes = await axios.post('/api/upload', {
                filename,
                contentType: uploadedFile.type || 'video/mp4',
                prefix: 'split_uploads'
            });

            const { uploadUrl, publicUrl } = uploadRes.data;

            // B. Upload File
            await axios.put(uploadUrl, uploadedFile, {
                headers: { 'Content-Type': uploadedFile.type || 'video/mp4' }
            });

            finalUserUrl = publicUrl;

        } catch (error) {
            console.error("Upload Failed:", error);
            alert("Video upload failed. Please check connection.");
            setIsProcessing(false);
            return;
        }

        const userVideoTrack = {
            id: `user_vid_${Date.now()}`,
            url: finalUserUrl, // Use Public R2 URL
            type: 'video',
            start: 0,
            duration: 15,
            trackIndex: 1, // TOP LAYER
            volume: 1.0,
            scale: 1.1, // 110% Zoom
            style: {
                width: '100%',     // Fit Screen Width
                height: '31.64%',  // Maintain 16:9 aspect ratio
                x: '0%',
                y: '0%'            // Top Align
            }
        };

        const gameplayTrack = {
            id: `game_vid_${Date.now()}`,
            url: gameUrl,
            type: 'video',
            start: 0,
            duration: 15,
            trackIndex: 0, // BOTTOM LAYER
            volume: 0, // Muted
            scale: 1,
            style: {
                width: '100%',
                height: '100%', // Full Screen Background
                x: '0%',
                y: '0%'
            }
        };

        const script = {
            script: [],
            metadata: {
                projectType: 'split_screen',
                userVideo: userVideoTrack,
                gamePlay: gameplayTrack
            }
        };

        onGenerate(script);
    };

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground">
                        <Layers className="w-8 h-8 text-orange-500" />
                        Split Screen Creator
                    </h1>
                    <p className="text-muted-foreground">Upload your content and choose a viral gameplay background.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">

                {/* LEFT: Upload User Video */}
                <div className="bg-card border border-border rounded-3xl p-6 flex flex-col shadow-sm">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
                        <Video className="w-5 h-5 text-indigo-400" />
                        1. Your Content
                    </h2>

                    <div
                        {...getRootProps()}
                        className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all gap-4 relative overflow-hidden group
                            ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}
                            ${previewUrl ? 'border-transparent' : ''}
                        `}
                    >
                        <input {...getInputProps()} />

                        {previewUrl ? (
                            <div className="absolute inset-0 w-full h-full bg-black">
                                <video
                                    src={previewUrl}
                                    className="w-full h-full object-contain"
                                    controls
                                />
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                                    Change Video
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-8 space-y-4">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8 text-zinc-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-foreground">Click to upload or drag & drop</p>
                                    <p className="text-sm text-muted-foreground mt-2">MP4, MOV (Max 50MB)</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Select Gameplay */}
                <div className="bg-card border border-border rounded-3xl p-6 flex flex-col shadow-sm">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
                        <Gamepad className="w-5 h-5 text-orange-400" />
                        2. Gameplay Background
                    </h2>

                    {stockLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p>Loading Stock Library...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 flex-1 content-start">
                            {gameOptions.map((game) => (
                                <button
                                    key={game.id}
                                    onClick={() => setSelectedGame(game.id)}
                                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all group
                                        ${selectedGame === game.id ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-transparent hover:border-white/20'}
                                    `}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-20`} />
                                    {/* Show LIVE PREVIEW if URL exists, else Fallback */}
                                    {game.url ? (
                                        <video src={game.url + '#t=5'} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" muted />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                            <span className="text-xs text-red-500">Not Found</span>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="font-bold uppercase tracking-wider text-xs text-center px-2 drop-shadow-md">{game.name}</span>
                                    </div>
                                    {selectedGame === game.id && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <button
                            onClick={handleCreate}
                            disabled={!uploadedFile || isProcessing || stockLoading}
                            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
                                ${(!uploadedFile || stockLoading)
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white shadow-lg shadow-orange-500/20 active:scale-95'
                                }
                            `}
                        >
                            {isProcessing ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    Create Split Video
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
