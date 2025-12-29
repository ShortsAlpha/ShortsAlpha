
export const PLAN_LIMITS = {
    free: {
        maxWeeklyRenders: 2, // Updated to 2 per week
        maxResolution: '720p',
        watermark: true,
        priority: false,
    },
    starter: {
        maxWeeklyRenders: 3,
        maxResolution: '1080p', // Updated to 1080p
        watermark: null,
        priority: false,
    },
    pro: {
        maxDailyRenders: 1,
        maxMonthlyRenders: 30,
        maxResolution: '1080p',
        watermark: null,
        priority: true,
    },
    agency: {
        maxDailyRenders: 2,
        maxMonthlyRenders: 60,
        maxResolution: '1080p', // Explicitly 1080p (4k removed/deferred)
        watermark: null,
        priority: true,
    },
    admin: {
        maxDailyRenders: 9999,
        maxMonthlyRenders: 9999,
        maxResolution: '4k',
        watermark: null,
        priority: true,
    }
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string) {
    return PLAN_LIMITS[plan as PlanType] || PLAN_LIMITS.free;
}

// TODO: In the future, we will need a Redis or database to track actual usage counts.
// For now, checks will be static (e.g. resolution) or soft-enforced via UI.
// To fully enforce "1 video per day", we need to query the history/DB.
