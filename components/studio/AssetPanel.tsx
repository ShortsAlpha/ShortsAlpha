import { useState, useRef } from "react";
import { Gamepad2, Video, Search, Upload, Music, Plus, Image as ImageIcon, FolderOpen } from "lucide-react";
import axios from "axios";

interface AssetPanelProps {
    onSelectBackground: (url: string) => void;
    currentBackground: string | null;
    onAssetUploaded?: (key: string) => void;
}

// Mock Stock Assets
const STOCK_ASSETS = [
    { id: 'mc_parkour', title: 'Minecraft Parkour', thumb: '/thumbs/mc.jpg', url: 'https://pub-b1a4f641f6b640c9a03f5731f8362854.r2.dev/stock/minecraft_parkour.mp4', type: 'video', category: 'Gaming' },
    { id: 'gta_ramps', title: 'GTA V Ramps', thumb: '/thumbs/gta.jpg', url: 'https://pub-b1a4f641f6b640c9a03f5731f8362854.r2.dev/stock/gta_ramps.mp4', type: 'video', category: 'Gaming' },
    { id: 'satisfying', title: 'Satisfying Sand', thumb: '/thumbs/sand.jpg', url: 'https://pub-b1a4f641f6b640c9a03f5731f8362854.r2.dev/stock/satisfying_sand.mp4', type: 'video', category: 'Oddly Satisfying' },
];

type Tab = 'media' | 'library';

export function AssetPanel({ onSelectBackground, currentBackground, onAssetUploaded }: AssetPanelProps) {
    const [activeTab, setActiveTab] = useState<Tab>('media');
    const [search, setSearch] = useState("");

    // Split state: User Assets vs Stock (Static)
    const [userAssets, setUserAssets] = useState<any[]>([]);
    const [stockAssets] = useState(STOCK_ASSETS);

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { data: { uploadUrl, key, publicUrl } } = await axios.post("/api/upload", {
                filename: file.name,
                contentType: file.type,
            });

            await axios.put(uploadUrl, file, { headers: { "Content-Type": file.type } });

            const newAsset = {
                id: key,
                title: file.name,
                url: publicUrl,
                type: file.type.startsWith('audio/') ? 'audio' : 'video',
                category: 'User Uploads'
            };

            setUserAssets([newAsset, ...userAssets]);

            // Notify Parent
            if (onAssetUploaded) {
                onAssetUploaded(key);
            }

            // Switch to media tab to show upload
            setActiveTab('media');

        } catch (error: any) {
            console.error("Upload failed", error);
            alert(`Upload failed: ${error.message || "Unknown error"}`);
        } finally {
            setIsUploading(false);
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
                                <Video className="w-8 h-8 text-zinc-500 group-hover:text-white" />
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
            {/* Sub-Header Tabs */}
            <div className="flex p-2 gap-1 border-b border-zinc-900">
                <button
                    onClick={() => setActiveTab('media')}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === 'media' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    My Media
                </button>
                <button
                    onClick={() => setActiveTab('library')}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === 'library' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Stock Library
                </button>
            </div>

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
                            onChange={handleUpload}
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
                            Viral Backgrounds
                        </h3>
                        {renderGrid(stockAssets, "No items found.")}
                    </div>
                )}
            </div>
        </div>
    );
}
