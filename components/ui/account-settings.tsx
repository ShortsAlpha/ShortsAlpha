'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { AvatarUploader } from './avatar-uploader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { CreditCard, Shield, Zap, Calendar } from 'lucide-react';
import Link from 'next/link';
import { getPlanLimits } from '@/lib/limits';

export function AccountSettings() {
    const { user, isLoaded } = useUser();

    // Initial state with User's URL or fallback
    const [photo, setPhoto] = React.useState<string>("");

    React.useEffect(() => {
        if (user?.imageUrl) {
            setPhoto(user.imageUrl);
        }
    }, [user]);

    const handleUpload = async (file: File) => {
        // Here you would implement the actual upload logic to Clerk or S3
        // For now, simple local preview update
        setPhoto(URL.createObjectURL(file));

        // Example: await user.setProfileImage({ file });
        return { success: true };
    };

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
        <section className="relative min-h-screen w-full px-4 py-10">
            {/* Background removed as requested (System/Standard Background) */}

            <div className="mx-auto w-full max-w-4xl space-y-8">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-bold">Account Settings</h2>
                    <p className="text-muted-foreground text-base">
                        Manage account and your personal information.
                    </p>
                </div>
                <Separator />

                <div className="py-2">
                    <SectionColumns
                        title="Your Avatar"
                        description="An avatar is optional but strongly recommended."
                    >
                        <AvatarUploader onUpload={handleUpload}>
                            <Avatar className="relative h-20 w-20 cursor-pointer hover:opacity-50">
                                <AvatarImage src={photo} />
                                <AvatarFallback className="border text-2xl font-bold">
                                    {user.firstName?.substring(0, 2).toUpperCase() || "ME"}
                                </AvatarFallback>
                            </Avatar>
                        </AvatarUploader>
                    </SectionColumns>
                    <Separator />
                    <SectionColumns
                        title="Your Name"
                        description="Please enter a display name you are comfortable with."
                    >
                        <div className="w-full space-y-1">
                            <Label className="sr-only">Name</Label>
                            <div className="flex w-full items-center justify-center gap-2">
                                <Input placeholder="Enter Your Name" defaultValue={user.fullName || ""} />
                                <Button
                                    type="submit"
                                    variant="outline"
                                    className="text-xs md:text-sm"
                                >
                                    Save Changes
                                </Button>
                            </div>
                            <p className="text-muted-foreground text-xs">Max 32 characters</p>
                        </div>
                    </SectionColumns>
                    <Separator />
                    <SectionColumns
                        title="Your Email"
                        description="Please enter a Primary Email Address."
                    >
                        <Label className="sr-only">Email</Label>
                        <div className="flex w-full items-center justify-center gap-2">
                            <Input type="email" placeholder="Enter Your Email" defaultValue={user.primaryEmailAddress?.emailAddress || ""} readOnly />
                            <Button
                                type="submit"
                                variant="outline"
                                className="text-xs md:text-sm"
                                disabled
                            >
                                Managed by Clerk
                            </Button>
                        </div>
                    </SectionColumns>

                    <Separator />

                    {/* Integrating Previous Subscription & Limits Section into new Design */}
                    <SectionColumns
                        title="Subscription"
                        description="Manage your plan and billing details."
                    >
                        <div className="w-full space-y-4">
                            <Label className="sr-only">Current Plan</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Current Plan</Label>
                                    <div className="flex w-full items-center justify-center gap-2">
                                        <div className="relative w-full">
                                            <Input
                                                defaultValue={plan.toUpperCase()}
                                                disabled
                                                className="font-bold uppercase disabled:opacity-100 disabled:cursor-default"
                                            />
                                            {plan === 'pro' && <Zap className="absolute right-3 top-2.5 h-4 w-4 text-yellow-400 fill-yellow-400" />}
                                            {plan === 'agency' && <Shield className="absolute right-3 top-2.5 h-4 w-4 text-amber-400 fill-amber-400" />}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Status</Label>
                                    <Input
                                        defaultValue={status || 'Active (Free)'}
                                        disabled
                                        className={cn("capitalize font-semibold disabled:opacity-100 disabled:cursor-default", status === 'active' ? 'text-emerald-400' : 'text-zinc-400')}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Next Renewal
                                </Label>
                                <Input
                                    defaultValue={renewsAt ? formatDate(renewsAt) : 'N/A'}
                                    disabled
                                    className="disabled:opacity-100 disabled:cursor-default text-zinc-300"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                {plan === 'free' && (
                                    <Link href="/pricing">
                                        <Button variant="default" size="sm" className="bg-purple-600 hover:bg-purple-500 text-white">
                                            <Zap className="mr-2 h-3.5 w-3.5" />
                                            Upgrade to Pro
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </SectionColumns>

                    <Separator />

                    <SectionColumns
                        title="Plan Limits"
                        description="Overview of your current usage limits."
                    >
                        <div className="w-full space-y-4">
                            <div className="space-y-1">
                                <Label>Max Resolution</Label>
                                <Input defaultValue={limits.maxResolution} disabled className="disabled:opacity-100 disabled:cursor-default" />
                            </div>
                            <div className="space-y-1">
                                <Label>Render Limit</Label>
                                <Input defaultValue={'maxDailyRenders' in limits ? `${(limits as any).maxDailyRenders}/day` : `${limits.maxWeeklyRenders}/week`} disabled className="disabled:opacity-100 disabled:cursor-default" />
                            </div>
                            <div className="space-y-1">
                                <Label>Watermark</Label>
                                <div className="relative">
                                    <Input defaultValue={limits.watermark ? 'Yes' : 'None'} disabled className={cn("disabled:opacity-100 disabled:cursor-default", limits.watermark ? 'text-red-400' : 'text-emerald-400 font-medium')} />
                                </div>
                            </div>
                        </div>
                    </SectionColumns>

                </div>
            </div>
        </section>
    );
}

interface SectionColumnsType {
    title: string;
    description?: string;
    className?: string;
    children: React.ReactNode;
}

function SectionColumns({
    title,
    description,
    children,
    className,
}: SectionColumnsType) {
    return (
        <div className="animate-in fade-in grid grid-cols-1 gap-x-10 gap-y-4 py-8 duration-500 md:grid-cols-10">
            <div className="w-full space-y-1.5 md:col-span-4">
                <h2 className="font-heading text-lg leading-none font-semibold">
                    {title}
                </h2>
                <p className="text-muted-foreground text-sm text-balance">
                    {description}
                </p>
            </div>
            <div className={cn('md:col-span-6', className)}>{children}</div>
        </div>
    );
}
