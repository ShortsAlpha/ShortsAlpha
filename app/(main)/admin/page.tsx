'use client';

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, Server, Activity, Users, AlertTriangle, Video, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export default function AdminPage() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (isLoaded) {
            const plan = (user?.publicMetadata?.plan as string) || 'free';
            if (plan !== 'admin') {
                toast.error("Access Denied: Admins Only");
                router.push('/home');
            }
        }
    }, [isLoaded, user, router]);

    const handleSystemCheck = async () => {
        try {
            const res = await axios.get('/api/admin/stats');
            setStats(res.data);
            toast.success("Admin Data Updated");
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch admin data");
        }
    };

    // Auto load on mount
    useEffect(() => {
        if (isLoaded && user?.publicMetadata?.plan === 'admin') {
            handleSystemCheck();
        }
    }, [isLoaded, user]);

    const handleFixCors = async () => {
        try {
            await axios.post('/api/admin/fix-cors');
            toast.success("CORS Fix Triggered");
        } catch (error) {
            toast.error("Failed to fix CORS");
        }
    }

    if (!isLoaded || !user || (user.publicMetadata.plan !== 'admin')) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <p>Verifying Access...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 pb-32">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
                    <button
                        onClick={() => router.push('/studio')}
                        className="p-3 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center">
                        <Shield className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                        <p className="text-zinc-400">System Controls, User Analytics & Financial Monitoring</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                        <div className="text-zinc-400 text-sm mb-1">Total Users</div>
                        <div className="text-3xl font-bold text-white">{stats?.overview?.totalUsers || '-'}</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                        <div className="text-zinc-400 text-sm mb-1">Active (7d)</div>
                        <div className="text-3xl font-bold text-emerald-400">{stats?.overview?.activeUsers || '-'}</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                        <div className="text-zinc-400 text-sm mb-1">Pro Users</div>
                        <div className="text-3xl font-bold text-purple-400">{stats?.overview?.proUsers || '-'}</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                        <div className="text-zinc-400 text-sm mb-1">Agency Users</div>
                        <div className="text-3xl font-bold text-amber-400">{stats?.overview?.agencyUsers || '-'}</div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* User Activity Log */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                Recent User Activity
                            </h3>
                            <button onClick={handleSystemCheck} className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition">Refresh Data</button>
                        </div>
                        <div className="space-y-0 divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
                            {stats?.recentActivity?.map((log: any, i: number) => (
                                <div key={i} className="py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {log.action === 'Rendered Video' ? (
                                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                                <Video className="w-4 h-4" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center">
                                                <Activity className="w-4 h-4" />
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-sm font-medium text-white">
                                                {log.action === 'Rendered Video' ? log.details : log.email}
                                            </div>
                                            <div className="text-xs text-zinc-500">
                                                {log.action === 'Rendered Video' ? `Generated by ${log.userId}` : `Last Login`} • {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Never'}
                                            </div>
                                        </div>
                                    </div>

                                    {log.action !== 'Rendered Video' && (
                                        <div className={`px-2 py-1 rounded text-xs font-bold uppercase
                                            ${log.plan === 'pro' ? 'bg-purple-500/20 text-purple-400' :
                                                log.plan === 'agency' ? 'bg-amber-500/20 text-amber-400' :
                                                    log.plan === 'admin' ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400'
                                            }
                                        `}>
                                            {log.plan}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {!stats && <div className="text-center text-zinc-500 py-8">Loading or Empty...</div>}
                        </div>
                    </div>

                    {/* Subscription Renewals */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-400" />
                                Upcoming Renewals
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {stats?.subscriptions?.length === 0 && (
                                <p className="text-sm text-zinc-500 text-center py-8">No active subscriptions found.</p>
                            )}
                            {stats?.subscriptions?.map((sub: any) => (
                                <div key={sub.userId} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-zinc-800/50">
                                    <div>
                                        <div className="text-sm font-medium">{sub.email}</div>
                                        <div className="text-xs text-zinc-500">Renews: {new Date(sub.renewsAt).toLocaleDateString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-emerald-400">{sub.plan.toUpperCase()}</div>
                                        <div className="text-xs text-zinc-500">{sub.status}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* System Actions (Moved down) */}
                        <div className="mt-8 pt-6 border-t border-zinc-800">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">System Controls</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleFixCors}
                                    className="flex items-center justify-center gap-2 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition text-sm font-medium"
                                >
                                    <Server className="w-4 h-4" /> Fix CORS
                                </button>
                                <button className="flex items-center justify-center gap-2 p-3 bg-zinc-800 rounded-lg opacity-50 cursor-not-allowed text-sm font-medium">
                                    <AlertTriangle className="w-4 h-4" /> Wipe DB
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
