'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useLiteMode } from '@/hooks/use-lite-mode';
import { ShaderBackground } from '@/components/ui/shader-background';
import { GlassNavbar } from '@/components/ui/glass-navbar';
import { PricingSection } from '@/components/ui/pricing-section';
import type { PricingTier } from '@/components/ui/pricing-card';

const PAYMENT_FREQUENCIES = ["monthly", "yearly"];

const TIERS: PricingTier[] = [
    {
        name: 'Starter',
        price: {
            monthly: 10,
            yearly: 100,
        },
        description: 'Perfect for getting started with short-form content.',
        features: ['1080p Export', '3 Video Exports / week', 'Standard Support', 'Remove Watermark'],
        cta: 'Subscribe',
        variantId: process.env.NEXT_PUBLIC_LEMON_VARIANT_STARTER,
    },
    {
        name: 'Pro',
        price: {
            monthly: 30,
            yearly: 300,
        },
        description: 'For serious creators who need power and quality.',
        features: ['1 Video / day (30/mo)', 'Priority Rendering', 'No Watermarks', 'Standard Support'],
        cta: 'Subscribe',
        popular: true,
        variantId: process.env.NEXT_PUBLIC_LEMON_VARIANT_PRO,
    },
    {
        name: 'Agency',
        price: {
            monthly: 65,
            yearly: 650,
        },
        description: 'For teams and high-volume production.',
        features: ['2 Videos / day (60/mo)', 'Priority Rendering', 'Priority Support', 'Team Seats (3)'],
        cta: 'Subscribe',
        variantId: process.env.NEXT_PUBLIC_LEMON_VARIANT_AGENCY,
    }
];

export default function PricingPage() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);

    // Theme hook
    const { isLiteMode, toggleLiteMode } = useLiteMode();

    const handleSubscribe = async (tier: any) => {
        const variantId = tier.variantId;
        if (!variantId) {
            toast.error("Configuration error: Missing Variant ID");
            return;
        }

        if (!user) {
            toast.info("Please sign in to subscribe");
            router.push('/sign-up?redirect_url=/pricing');
            return;
        }

        setLoading(variantId);
        try {
            const response = await axios.post('/api/lemon/checkout', {
                variantId
            });

            // Lemon Squeezy returns a checkout URL
            if (response.data.url) {
                window.location.href = response.data.url;
            } else {
                throw new Error("No URL returned");
            }
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error || "Failed to start checkout. Please try again.";
            toast.error(msg);
            setLoading(null);
        }
    };

    // Add click handler to tiers
    const tiersWithHandlers = TIERS.map(tier => ({
        ...tier,
        onClick: () => handleSubscribe(tier)
    }));

    return (
        <section className="relative min-h-screen w-screen overflow-x-hidden bg-black text-white">
            <ShaderBackground isLiteMode={isLiteMode} />
            <GlassNavbar isLiteMode={isLiteMode} toggleLiteMode={toggleLiteMode} />

            <div className="relative z-10 pt-24 px-4">
                <PricingSection
                    title="Select Your Plan"
                    subtitle="Choose the perfect plan to supercharge your content creation with AI-powered tools."
                    frequencies={PAYMENT_FREQUENCIES}
                    tiers={tiersWithHandlers}
                />

                <div className="text-center text-gray-500 text-sm mt-12 pb-12">
                    <p>Payments processed securely by Lemon Squeezy. Terms and conditions apply.</p>
                </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent" />
        </section>
    );
}
