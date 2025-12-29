"use client";

import { useAuth } from "@clerk/nextjs";
import { AuthComponent } from "@/components/ui/sign-in-flo";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
    const { isLoaded, userId } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && userId) {
            router.replace("/studio");
        }
    }, [isLoaded, userId, router]);

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (userId) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return <AuthComponent initialMode="signup" />;
}
