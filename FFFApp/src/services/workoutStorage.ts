/**
* workoutStorage.ts
* Two stores:
*   - user_custom_workouts  → saved workout templates (active)
*   - user_workout_history  → completed workout sessions
*/

import AsyncStorage from '@react-native-async-storage/async-storage';

const TEMPLATES_KEY = 'user_custom_workouts';
const HISTORY_KEY   = 'user_workout_history';

// ── Saved template (built in CreateWorkoutScreen) ─────────────────────────────
export interface SavedWorkout {
id: string;
name: string;
createdAt: string;
exercises: {
exercise: {
id: string;
name: string;
category: string;
primaryMuscles: string[];
level: string;
};
sets: number;
reps: string;
rest: number;
notes: string;
}[];
totalSets: number;
estimatedTime: number;
}

// ── Completed session (saved in CompleteWorkoutScreen) ────────────────────────
export interface CompletedWorkout {
id: string;
name: string;
completedAt: string;
rating: number;           // 1–5
notes: string;
totalSets: number;
completedSets: number;
estimatedTime: number;
exercises: {
name: string;
sets: {
reps: number;
weight: number;
completed: boolean;
}[];
}[];
}

// ── Template store ─────────────────────────────────────────────────────────────
export const workoutStorage = {
getAll: async (): Promise<SavedWorkout[]> => {
    try {
      const raw = await AsyncStorage.getItem(TEMPLATES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  save: async (workout: Omit<SavedWorkout, 'id' | 'createdAt'>): Promise<SavedWorkout> => {
    const all = await workoutStorage.getAll();
    const newWorkout: SavedWorkout = {
      ...workout,
      id: `w_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify([newWorkout, ...all]));
    return newWorkout;
  },

  delete: async (id: string): Promise<void> => {
    const all = await workoutStorage.getAll();
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(all.filter(w => w.id !== id)));
  },

  update: async (updated: SavedWorkout): Promise<void> => {
    const all = await workoutStorage.getAll();
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(
      all.map(w => w.id === updated.id ? updated : w)
    ));
  },
};

// ── History store ──────────────────────────────────────────────────────────────
export const workoutHistory = {
  getAll: async (): Promise<CompletedWorkout[]> => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  save: async (session: Omit<CompletedWorkout, 'id' | 'completedAt'>): Promise<CompletedWorkout> => {
    const all = await workoutHistory.getAll();
    const entry: CompletedWorkout = {
      ...session,
      id: `h_${Date.now()}`,
      completedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...all]));
    return entry;
  },

  delete: async (id: string): Promise<void> => {
    const all = await workoutHistory.getAll();
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(all.filter(h => h.id !== id)));
  },
};