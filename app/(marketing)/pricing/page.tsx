'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Zap, Shield, Crown } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const PLANS = [
    {
        name: 'Starter',
        price: '$10',
        period: '/month',
        description: 'Perfect for getting started with short-form content.',
        features: ['1080p Export', '3 Video Exports / week', 'Standard Support', 'Remove Watermark'],
        variantId: process.env.NEXT_PUBLIC_LEMON_VARIANT_STARTER,
        color: 'bg-blue-500',
        icon: Zap
    },
    {
        name: 'Pro',
        price: '$30',
        period: '/month',
        description: 'For serious creators who need power and quality.',
        features: ['1 Video / day (30/mo)', 'Priority Rendering', 'No Watermarks', 'Standard Support'],
        variantId: process.env.NEXT_PUBLIC_LEMON_VARIANT_PRO,
        popular: true,
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
        icon: Crown
    },
    {
        name: 'Agency',
        price: '$65',
        period: '/month',
        description: 'For teams and high-volume production.',
        features: ['2 Videos / day (60/mo)', /* 'Special Help' - included in priority support conceptually */ 'Priority Rendering', 'Priority Support', 'Team Seats (3)'],
        variantId: process.env.NEXT_PUBLIC_LEMON_VARIANT_AGENCY,
        color: 'bg-amber-500',
        icon: Shield
    }
];

export default function PricingPage() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);

    const handleSubscribe = async (variantId: string | undefined) => {
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
        } catch (error) {
            console.error(error);
            toast.error("Failed to start checkout. Please try again.");
            setLoading(null);
        }
    };

    const currentPlan = user?.publicMetadata?.plan as string || 'free';

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4">
            <div className="max-w-7xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-500">
                        Select Your Plan
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Choose the perfect plan to supercharge your content creation with AI-powered tools.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {PLANS.map((plan) => {
                        const Icon = plan.icon;
                        const isCurrent = currentPlan === plan.name.toLowerCase();
                        const isProcessing = loading === plan.variantId;

                        return (
                            <div
                                key={plan.name}
                                className={`relative p-8 rounded-3xl border ${plan.popular ? 'border-purple-500/50 bg-purple-900/10' : 'border-white/10 bg-white/5'} flex flex-col hover:border-white/20 transition-all duration-300`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                                        Most Popular
                                    </div>
                                )}

                                <div className="space-y-4 flex-1">
                                    <div className={`w-12 h-12 rounded-2xl ${plan.color} flex items-center justify-center mb-6`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>

                                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold">{plan.price}</span>
                                        <span className="text-gray-400">{plan.period}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm">{plan.description}</p>

                                    <div className="h-px bg-white/10 my-6" />

                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                                                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <button
                                    onClick={() => handleSubscribe(plan.variantId)}
                                    disabled={loading !== null || isCurrent}
                                    className={`w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                                        ${isCurrent
                                            ? 'bg-white/10 text-gray-400 cursor-default'
                                            : plan.popular
                                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white'
                                                : 'bg-white text-black hover:bg-gray-200'
                                        }
                                    `}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : isCurrent ? (
                                        "Current Plan"
                                    ) : (
                                        "Subscribe Now"
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="text-center text-gray-500 text-sm mt-12">
                    <p>Payments processed securely by Lemon Squeezy. Terms and conditions apply.</p>
                </div>
            </div>
        </div>
    );
}
