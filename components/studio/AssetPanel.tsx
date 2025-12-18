import { useState, useRef, useEffect } from "react";
import { Gamepad2, Video, Search, Upload, Music, Plus, Image as ImageIcon, FolderOpen } from "lucide-react";
import axios from "axios";

interface AssetPanelProps {
    onSelectBackground: (url: string) => void;
    currentBackground: string | null;
    onAssetUploaded?: (key: string) => void;

    // Mobile Drag Trigger
    onExternalDragStart?: (asset: { url: string, type: 'video' | 'audio', title: string }) => void;

    // Lifted State
    userAssets?: any[];
    onUpdateAssets?: (assets: any[]) => void;

    // View Mode from Parent
    mode?: 'uploads' | 'stock';
}

// Mock Stock Assets Removed - Replaced by API
/*
const STOCK_ASSETS = [
    { id: 'mc_parkour', title: 'Minecraft Parkour', thumb: '/thumbs/mc.jpg', url: 'https://pub-b1a4f641f6b640c9a03f5731f8362854.r2.dev/stock/minecraft_parkour.mp4', type: 'video', category: 'Gaming' },
    ...
];
*/

type Tab = 'media' | 'library';

export function AssetPanel({
    onSelectBackground,
    currentBackground,
    onAssetUploaded,
    onExternalDragStart,
    userAssets = [],
    onUpdateAssets,
    mode = 'uploads'
}: AssetPanelProps) {
    // Derived state from mode
    const activeTab = mode === 'uploads' ? 'media' : 'library';

    const [search, setSearch] = useState("");

    // Split state: User Assets vs Stock (Static)
    // const [userAssets, setUserAssets] = useState<any[]>([]); // MOVED TO PROPS
    const [stockAssets, setStockAssets] = useState<any[]>([]); // Fetched from API
    const [stockTab, setStockTab] = useState<'visual' | 'audio'>('visual');
    const [customName, setCustomName] = useState("");

    const [isUploading, setIsUploading] = useState(false);

    // FETCH STOCK ASSETS
    useEffect(() => {
        if (mode === 'stock') {
            axios.get('/api/stock')
                .then(res => setStockAssets(res.data.assets || []))
                .catch(err => console.error("Failed to fetch stock:", err));
        }
    }, [mode]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const stockInputRef = useRef<HTMLInputElement>(null);

    // LONG PRESS LOGIC
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartPosRef = useRef<{ x: number, y: number } | null>(null);

    const handleTouchStart = (vid: any, e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

        longPressTimerRef.current = setTimeout(() => {
            // Trigger Drag
            if (onExternalDragStart) {
                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate(50);
                onExternalDragStart({ url: vid.url, type: vid.type, title: vid.title });
            }
        }, 600); // 600ms hold
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartPosRef.current) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

        // Cancel if moved too much (scrolling)
        if (dx > 10 || dy > 10) {
            handleTouchEnd();
        }
    };


    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, isStock = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (isStock && !customName.trim()) {
            alert("Please enter a name for the stock asset first.");
            return;
        }

        setIsUploading(true);
        try {
            const folder = isStock ? "stock" : "uploads";

            // Allow Custom Filename for stock (to be neat in R2)
            const extension = file.name.split('.').pop();
            const finalFilename = isStock ? `${customName}.${extension}` : file.name;

            const { data: { uploadUrl, key, publicUrl } } = await axios.post("/api/upload", {
                filename: file.name, // Send original filename for extension extraction
                contentType: file.type,
                prefix: folder,
                customName: isStock ? customName : undefined // Send custom name for smart key generation
            });

            await axios.put(uploadUrl, file, { headers: { "Content-Type": file.type } });

            const isAudio = file.type.startsWith('audio/') ||
                file.name.toLowerCase().endsWith('.mp3') ||
                file.name.toLowerCase().endsWith('.wav') ||
                file.name.toLowerCase().endsWith('.m4a');

            // Force type based on tab if stock
            let finalType = isAudio ? 'audio' : 'video';
            if (isStock) {
                finalType = stockTab === 'audio' ? 'audio' : 'video';
            }

            const newAsset = {
                id: key,
                title: isStock ? customName : file.name,
                url: publicUrl,
                type: finalType,
                category: isStock ? 'Stock' : 'User Uploads',
                duration: 10 // Default fallback, should extract real duration later
            };

            if (isStock) {
                setStockAssets(prev => [newAsset, ...prev]);
                setCustomName("");
                // Optionally re-fetch to ensure sync?
                // axios.get('/api/stock').then(res => setStockAssets(res.data.assets));
            } else {
                // Prop Update
                if (onUpdateAssets) {
                    onUpdateAssets([newAsset, ...userAssets]);
                }
                // Notify Parent
                if (onAssetUploaded) {
                    onAssetUploaded(key);
                }
                // Switch to media tab to show upload - REMOVED (Derived State)
                // setActiveTab('media');
            }

        } catch (error: any) {
            console.error("Upload failed", error);
            alert(`Upload failed: ${error.message || "Unknown error"}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (stockInputRef.current) stockInputRef.current.value = "";
        }
    };

    // Helper to render asset grid
    const renderGrid = (items: any[], emptyMessage: string) => (
        items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-500 space-y-2 border border-dashed border-zinc-800 rounded-xl">
                <FolderOpen className="w-8 h-8 opacity-50" />
                <span className="text-xs">{emptyMessage}</span>
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-3">
                {items.map((vid) => (
                    <button
                        key={vid.id}
                        onClick={() => onSelectBackground(vid.url)}
                        // Touch / Long Press Logic
                        onTouchStart={(e) => handleTouchStart(vid, e)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchMove}
                        onTouchCancel={handleTouchEnd}
                        className={`group relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all text-left ${currentBackground === vid.url
                            ? "border-indigo-500 ring-2 ring-indigo-500/20"
                            : "border-transparent hover:border-zinc-700"
                            }`}
                    >
                        <div className="absolute inset-0 bg-zinc-800 group-hover:bg-zinc-700 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            {vid.type === 'audio' ? (
                                <Music className="w-8 h-8 text-zinc-500 group-hover:text-indigo-400" />
                            ) : (
                                <>
                                    <video
                                        src={vid.url + "#t=0.5"}
                                        preload="metadata"
                                        className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                                        onMouseOver={e => e.currentTarget.play()}
                                        onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0.5; }}
                                        muted
                                        playsInline
                                    />
                                    {/* Overlay Icon for clarity */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                                        <Video className="w-8 h-8 text-white/50" />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                            <p className="text-[10px] font-medium text-white truncate">{vid.title}</p>
                        </div>
                    </button>
                ))}
            </div>
        )
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header Tabs Removed - Controlled by Parent StudioView */}

            <div className="p-4 border-b border-zinc-800 space-y-3">
                {activeTab === 'media' && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isUploading ? "Uploading..." : (
                                <>
                                    <Upload className="w-3 h-3" /> Upload
                                </>
                            )}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="video/*,audio/*"
                            onChange={(e) => handleUpload(e, false)}
                        />
                    </div>
                )}

                {activeTab === 'library' && (
                    <div className="flex flex-col gap-3">
                        {/* Sub-Tabs */}
                        <div className="flex bg-zinc-900 rounded-lg p-1">
                            <button
                                onClick={() => setStockTab('visual')}
                                className={`flex-1 py-1 text-[10px] font-bold uppercase rounded transition-colors ${stockTab === 'visual' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-400'}`}
                            >
                                Visuals (Görsel)
                            </button>
                            <button
                                onClick={() => setStockTab('audio')}
                                className={`flex-1 py-1 text-[10px] font-bold uppercase rounded transition-colors ${stockTab === 'audio' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-400'}`}
                            >
                                SFX (Ses)
                            </button>
                        </div>

                        {/* Stock Upload UI */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Asset Name..."
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                                onClick={() => {
                                    if (!customName.trim()) { alert("Name required!"); return; }
                                    stockInputRef.current?.click();
                                }}
                                disabled={isUploading}
                                className="w-24 flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-[10px] font-bold rounded-lg transition-colors"
                            >
                                <Plus className="w-3 h-3" /> Add
                            </button>
                        </div>
                        <input
                            type="file"
                            ref={stockInputRef}
                            className="hidden"
                            accept={stockTab === 'visual' ? "video/*" : "audio/*"}
                            onChange={(e) => handleUpload(e, true)}
                        />
                    </div>
                )}

                {/* Search removed as per user request */}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {activeTab === 'media' && (
                    <div>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
                            <ImageIcon className="w-3 h-3" />
                            Your Uploads
                        </h3>
                        {renderGrid(userAssets, "No uploads yet. Import your videos!")}
                    </div>
                )}

                {activeTab === 'library' && (
                    <div>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
                            <Gamepad2 className="w-3 h-3" />
                            {stockTab === 'visual' ? 'Stock Visuals' : 'Sound Effects'}
                        </h3>
                        {renderGrid(
                            stockAssets.filter(a => stockTab === 'visual' ? a.type === 'video' : a.type === 'audio'),
                            "No stock items found."
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
