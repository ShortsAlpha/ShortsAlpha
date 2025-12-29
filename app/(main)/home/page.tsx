"use client";

import { Dashboard } from "@/components/Dashboard";
import { useRouter } from "next/navigation";

export default function HomePage() {
    const router = useRouter();

    const handleSelectMode = (mode: string) => {
        switch (mode) {
            case 'remix': // Create from Zero
                router.push('/studio');
                break;
            case 'create': // Reddit Story
                router.push('/story');
                break;
            case 'chat': // Fake Chat
                router.push('/fake');
                break;
            case 'split': // Gameplay Split
                router.push('/gameplay');
                break;
            case 'auto_shorts': // Auto Shorts
                router.push('/podcast');
                break;
            default:
                router.push('/studio');
        }
    };

    return (
        <div className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
            <Dashboard onSelectMode={(mode: any) => handleSelectMode(mode)} />
        </div>
    );
}
