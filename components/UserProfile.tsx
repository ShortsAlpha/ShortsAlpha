'use client';
import React from 'react';
import {
    Popover,
    PopoverBody,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
    PopoverFooter,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { User, Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useClerk } from "@clerk/nextjs";

import { useRouter } from 'next/navigation';

export function UserProfile() {
    const { user } = useUser();
    const { signOut } = useClerk();
    const router = useRouter();

    if (!user) return null;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.imageUrl} />
                        <AvatarFallback>{user.firstName?.substring(0, 2).toUpperCase() || "US"}</AvatarFallback>
                    </Avatar>
                </Button>
            </PopoverTrigger>
            <PopoverContent className='w-64' align="end">
                <PopoverHeader>
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user.imageUrl} />
                            <AvatarFallback>{user.firstName?.substring(0, 2).toUpperCase() || "US"}</AvatarFallback>
                        </Avatar>
                        <div>
                            <PopoverTitle>{user.fullName}</PopoverTitle>
                            <PopoverDescription className='text-xs line-clamp-1 break-all'>{user.primaryEmailAddress?.emailAddress}</PopoverDescription>
                        </div>
                    </div>
                </PopoverHeader>
                <PopoverBody className="space-y-1 px-2 py-1">
                    <Button variant="ghost" className="w-full justify-start" size="sm" onClick={() => router.push('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Account
                    </Button>
                </PopoverBody>
                <PopoverFooter>
                    <Button variant="outline" className="w-full bg-transparent hover:bg-destructive/10 hover:text-destructive" size="sm" onClick={() => signOut()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </PopoverFooter>
            </PopoverContent>
        </Popover>
    );
}
