/**
* planStorage.ts — Coaching Hub
* Stores user's subscribed plans in AsyncStorage.
* Available plans are hardcoded (admin-managed in future).
*/

import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBSCRIBED_KEY = 'user_subscribed_plans';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type Equipment  = 'Gym' | 'Home' | 'Both';

export interface DaySchedule {
mon: string | null;
tue: string | null;
wed: string | null;
thu: string | null;
fri: string | null;
sat: string | null;
sun: string | null;
}

export interface Plan {
id: string;
name: string;
description: string;
coach: { name: string; avatar: string };
durationWeeks: number;
difficulty: Difficulty;
equipment: Equipment;
schedule: DaySchedule;
tags: string[];
color: string; // accent colour
}

export interface SubscribedPlan extends Plan {
subscribedAt: string;
currentWeek: number;
completedSessions: number;
}

// ── Hardcoded available plans (coach/admin-managed until backend built) ─────────
export const AVAILABLE_PLANS: Plan[] = [
{
id: 'plan_alpha_hypertrophy',
name: 'Alpha Hypertrophy',
description: 'A 12-week progressive overload programme designed to maximise muscle growth through structured push/pull/legs splits with weekly volume increases.',
coach: { name: 'Coach Rian', avatar: '🧑‍💼' },
durationWeeks: 12,
difficulty: 'Intermediate',
equipment: 'Gym',
color: '#7B6FFF',
tags: ['Hypertrophy', 'PPL', 'Progressive Overload'],
schedule: {
mon: 'Push Day A',
tue: 'Pull Day A',
wed: 'Legs Day A',
thu: null,
fri: 'Push Day B',
sat: 'Pull Day B',
sun: null,
},
},
{
id: 'plan_shred_8',
name: 'Shred in 8',
description: 'An 8-week high-intensity fat loss programme combining strength circuits and cardio finishers. Minimal equipment, maximum burn.',
coach: { name: 'Coach Rian', avatar: '🧑‍💼' },
durationWeeks: 8,
difficulty: 'Advanced',
equipment: 'Both',
color: '#FF6B6B',
tags: ['Fat Loss', 'HIIT', 'Circuits'],
schedule: {
mon: 'Upper Circuit',
tue: 'HIIT Cardio',
wed: 'Lower Circuit',
thu: null,
fri: 'Full Body Burn',
sat: 'Active Recovery',
sun: null,
},
},
{
id: 'plan_home_foundation',
name: 'Home Foundation',
description: 'A 6-week beginner-friendly bodyweight programme. Build a solid fitness base from home with zero equipment needed.',
coach: { name: 'Coach Rian', avatar: '🧑‍💼' },
durationWeeks: 6,
difficulty: 'Beginner',
equipment: 'Home',
color: '#26de81',
tags: ['Bodyweight', 'Beginner', 'No Equipment'],
schedule: {
mon: 'Full Body A',
tue: null,
wed: 'Full Body B',
thu: null,
fri: 'Full Body C',
sat: null,
sun: null,
},
},
{
id: 'plan_powerlifting_peaking',
name: 'Powerlifting Peak',
description: 'A 10-week peaking cycle targeting squat, bench, and deadlift maxes. Follows a conjugate-inspired periodisation model.',
coach: { name: 'Coach Rian', avatar: '🧑‍💼' },
durationWeeks: 10,
difficulty: 'Advanced',
equipment: 'Gym',
color: '#FF9F43',
tags: ['Powerlifting', 'Strength', 'Peaking'],
schedule: {
mon: 'Max Effort Lower',
tue: null,
wed: 'Max Effort Upper',
thu: null,
fri: 'Dynamic Lower',
sat: 'Dynamic Upper',
sun: null,
},
},
{
id: 'plan_mobility_reset',
name: 'Mobility Reset',
description: 'A 4-week daily mobility and flexibility programme to improve range of motion, reduce stiffness, and prevent injury.',
coach: { name: 'Coach Rian', avatar: '🧑‍💼' },
durationWeeks: 4,
difficulty: 'Beginner',
equipment: 'Home',
color: '#4A9EFF',
tags: ['Mobility', 'Flexibility', 'Recovery'],
schedule: {
mon: 'Upper Body Mobility',
tue: 'Lower Body Mobility',
wed: 'Spine & Hips',
thu: 'Full Body Flow',
fri: 'Upper Body Mobility',
sat: 'Lower Body Mobility',
sun: 'Full Body Flow',
},
},
];

// ── Subscribed plan store ──────────────────────────────────────────────────────
export const planStorage = {
getSubscribed: async (): Promise<SubscribedPlan[]> => {
    try {
      const raw = await AsyncStorage.getItem(SUBSCRIBED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  subscribe: async (plan: Plan): Promise<SubscribedPlan> => {
    const all = await planStorage.getSubscribed();
    if (all.find(p => p.id === plan.id)) throw new Error('Already subscribed');
    const entry: SubscribedPlan = {
      ...plan,
      subscribedAt:      new Date().toISOString(),
      currentWeek:       1,
      completedSessions: 0,
    };
    await AsyncStorage.setItem(SUBSCRIBED_KEY, JSON.stringify([entry, ...all]));
    return entry;
  },

  unsubscribe: async (planId: string): Promise<void> => {
    const all = await planStorage.getSubscribed();
    await AsyncStorage.setItem(SUBSCRIBED_KEY, JSON.stringify(all.filter(p => p.id !== planId)));
  },

  // Called when a session linked to a plan is completed
  recordSession: async (planId: string): Promise<void> => {
    const all = await planStorage.getSubscribed();
    const updated = all.map(p => {
      if (p.id !== planId) return p;
      const completedSessions = p.completedSessions + 1;
      // Sessions per week = non-null days in schedule
      const sessionsPerWeek = Object.values(p.schedule).filter(Boolean).length;
      const currentWeek = Math.min(
        p.durationWeeks,
        Math.floor(completedSessions / sessionsPerWeek) + 1
      );
      return { ...p, completedSessions, currentWeek };
    });
    await AsyncStorage.setItem(SUBSCRIBED_KEY, JSON.stringify(updated));
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
export const getTodaySession = (plan: Plan): string | null => {
  const days: (keyof DaySchedule)[] = ['sun','mon','tue','wed','thu','fri','sat'];
  const today = days[new Date().getDay()];
  return plan.schedule[today];
};

export const getSessionsPerWeek = (plan: Plan): number =>
  Object.values(plan.schedule).filter(Boolean).length;

export const getDifficultyColor = (d: Difficulty): string =>
  d === 'Beginner' ? '#26de81' : d === 'Intermediate' ? '#FF9F43' : '#FF6B6B';

export const getEquipmentIcon = (e: Equipment): string =>
  e === 'Gym' ? '🏋️' : e === 'Home' ? '🏠' : '🔄';