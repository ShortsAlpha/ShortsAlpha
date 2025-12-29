import { useUser } from "@clerk/nextjs";
import { CreditCard, Shield, Zap, Calendar, User } from "lucide-react";
import Link from "next/link";
import { getPlanLimits } from "@/lib/limits";

export function SettingsView() {
    const { user, isLoaded } = useUser();

    if (!isLoaded || !user) return null;

    const plan = (user.publicMetadata.plan as string) || 'free';
    const limits = getPlanLimits(plan);
    const renewsAt = user.publicMetadata.lemonRenewsAt as string;
    const status = user.publicMetadata.lemonStatus as string;

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white">Settings</h1>
                <p className="text-zinc-400">Manage your account and subscription.</p>
            </div>

            <div className="grid gap-6">
                {/* Profile Section */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-400" />
                        Profile
                    </h2>
                    <div className="flex items-center gap-4">
                        <img src={user.imageUrl} alt={user.fullName || "User"} className="w-16 h-16 rounded-full border-2 border-zinc-800" />
                        <div>
                            <div className="font-medium text-white text-lg">{user.fullName}</div>
                            <div className="text-zinc-400">{user.primaryEmailAddress?.emailAddress}</div>
                        </div>
                    </div>
                </div>

                {/* Subscription Section */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-purple-400" />
                            Subscription
                        </h2>
                        {plan === 'free' && (
                            <Link href="/pricing" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition">
                                Upgrade to Pro
                            </Link>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-black/30 rounded-xl border border-zinc-800/50">
                            <div className="text-sm text-zinc-500 mb-1">Current Plan</div>
                            <div className="text-2xl font-bold uppercase text-white flex items-center gap-2">
                                {plan}
                                {plan === 'pro' && <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
                                {plan === 'agency' && <Shield className="w-5 h-5 text-amber-400 fill-amber-400" />}
                            </div>
                        </div>
                        <div className="p-4 bg-black/30 rounded-xl border border-zinc-800/50">
                            <div className="text-sm text-zinc-500 mb-1">Status</div>
                            <div className={`text-2xl font-bold capitalize ${status === 'active' ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                {status || 'Active (Free)'}
                            </div>
                        </div>
                        {renewsAt && (
                            <div className="p-4 bg-black/30 rounded-xl border border-zinc-800/50 md:col-span-2">
                                <div className="text-sm text-zinc-500 mb-1 flex items-center gap-1">
                                    <Calendar className="w-4 h-4" /> Next Renewal
                                </div>
                                <div className="text-xl font-medium text-white">
                                    {formatDate(renewsAt)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Limits Section */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-400" />
                        Plan Limits
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between p-3 bg-black/20 rounded-lg">
                            <span className="text-zinc-400">Max Resolution</span>
                            <span className="font-bold text-white">{limits.maxResolution}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-black/20 rounded-lg">
                            <span className="text-zinc-400">Render Limit</span>
                            <span className="font-bold text-white">
                                {'maxDailyRenders' in limits ? `${(limits as any).maxDailyRenders}/day` : `${limits.maxWeeklyRenders}/week`}
                            </span>
                        </div>
                        <div className="flex justify-between p-3 bg-black/20 rounded-lg">
                            <span className="text-zinc-400">Watermark</span>
                            <span className={`font-bold ${limits.watermark ? 'text-red-400' : 'text-emerald-400'}`}>
                                {limits.watermark ? 'Yes' : 'None'}
                            </span>
                        </div>
                        <div className="flex justify-between p-3 bg-black/20 rounded-lg">
                            <span className="text-zinc-400">Priority Queue</span>
                            <span className={`font-bold ${limits.priority ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                {limits.priority ? 'Active' : 'Standard'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
