/**
 * healthService.ts;
 * ─────────────────────────────────────────────────────────────────────────────;
 * Cross-platform health data abstraction for CoachingHub.
 *
 * Platform routing:
 *   Android  →  react-native-health-connect  (Health Connect API)
 *   iOS      →  react-native-health           (Apple HealthKit)
 *
 * Public API (used by HealthScreen and anywhere else you need health data):
 *   initHealthService()          – initialise + request permissions;
 *   fetchHealthData()            – returns HealthData for today;
 *   isHealthAvailable()          – quick availability check (no permissions)
 *
 * ─────────────────────────────────────────────────────────────────────────────;
 */

import { Platform } from 'react-native';
import type { HealthPermission } from 'react-native-health';

// ─── Shared return type ───────────────────────────────────────────────────────

export type HealthData = {
  steps: number;
  heartRate: number | null;   // bpm, latest reading today
  weight: string | null;      // e.g. "82.5kg"  (last 30 days)
  sleep: string | null;       // e.g. "7.5hrs"  (last night)
  calories: number;           // active kcal burned today
};

// ─── Android – Health Connect ─────────────────────────────────────────────────

const initAndroid = async (): Promise<boolean> => {
  const { initialize } = await import('react-native-health-connect');
  return initialize();
};

import {
  initialize,
  requestPermission,
  readRecords,
  getGrantedPermissions,
  type Permission,
} from 'react-native-health-connect';

const requestAndroidPermissions = async (): Promise<void> => {
  const granted = await getGrantedPermissions();
  const grantedTypes = granted.map((p: any) => p.recordType);

  const all: Permission[] = [
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'Weight' },
    { accessType: 'read', recordType: 'SleepSession' },
    { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  ];

  const needed = all.filter(p => !grantedTypes.includes(p.recordType));

  if (needed.length > 0) {
    await requestPermission(needed);
  }
};

const fetchAndroid = async (): Promise<HealthData> => {
  const { readRecords } = await import('react-native-health-connect');

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const todayFilter = {
    operator: 'between' as const,
    startTime: startOfDay.toISOString(),
    endTime: now.toISOString(),
  };

  // Steps
  const stepsData = await readRecords('Steps', { timeRangeFilter: todayFilter });
  const totalSteps = stepsData.records.reduce(
    (sum: number, r: any) => sum + r.count,
    0,
  );

  // Heart Rate (latest sample today)
  const hrData = await readRecords('HeartRate', { timeRangeFilter: todayFilter });
  const latestHR =
    hrData.records.at(-1)?.samples?.at(-1)?.beatsPerMinute ?? null;

  // Weight (last 30 days)
  const weightStart = new Date(now);
  weightStart.setDate(weightStart.getDate() - 30);
  const weightData = await readRecords('Weight', {
    timeRangeFilter: {
      operator: 'between' as const,
      startTime: weightStart.toISOString(),
      endTime: now.toISOString(),
    },
  });
  const latestWeight = weightData.records.at(-1)?.weight?.inKilograms ?? null;

  // Sleep (8 pm yesterday → now)
  const sleepStart = new Date(now);
  sleepStart.setDate(sleepStart.getDate() - 1);
  sleepStart.setHours(20, 0, 0, 0);
  const sleepData = await readRecords('SleepSession', {
    timeRangeFilter: {
      operator: 'between' as const,
      startTime: sleepStart.toISOString(),
      endTime: now.toISOString(),
    },
  });
  const sleepHours = sleepData.records.reduce((sum: number, r: any) => {
    const ms =
      new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
    return sum + ms / 3_600_000;
  }, 0);

  // Active Calories
  const calData = await readRecords('ActiveCaloriesBurned', {
    timeRangeFilter: todayFilter,
  });
  const totalCalories = calData.records.reduce(
    (sum: number, r: any) => sum + r.energy.inKilocalories,
    0,
  );

  return {
    steps: totalSteps,
    heartRate: latestHR,
    weight: latestWeight ? `${latestWeight.toFixed(1)}kg` : null,
    sleep: sleepHours > 0 ? `${sleepHours.toFixed(1)}hrs` : null,
    calories: Math.round(totalCalories),
  };
};

// ─── iOS – Apple HealthKit ────────────────────────────────────────────────────
// Uses the `react-native-health` package (AppleHealthKit default export).

const fetchIOS = async (): Promise<HealthData> => {
  // Dynamic import keeps the Android bundle clean.
  const AppleHealthKit = (await import('react-native-health')).default;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const yesterday8pm = new Date(now);
  yesterday8pm.setDate(yesterday8pm.getDate() - 1);
  yesterday8pm.setHours(20, 0, 0, 0);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  /** Tiny promise wrapper around the callback-based HealthKit API */
  const query = <T>(
    fn: (opts: any, cb: (err: string | null, result: T) => void) => void,
    opts: any,
  ): Promise<T> =>
    new Promise((resolve, reject) =>
      fn(opts, (err, result) => (err ? reject(new Error(err)) : resolve(result))),
    );

  // ── Steps ──
  let totalSteps = 0;
  try {
    const stepResult: any = await query(
      AppleHealthKit.getStepCount.bind(AppleHealthKit),
      { date: startOfDay.toISOString() },
    );
    totalSteps = stepResult?.value ?? 0;
  } catch (_) {}

  // ── Heart Rate (latest today) ──
  let latestHR: number | null = null;
  try {
    const hrResults: any[] = await query(
      AppleHealthKit.getHeartRateSamples.bind(AppleHealthKit),
      {
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        ascending: false,
        limit: 1,
      },
    );
    latestHR = hrResults?.[0]?.value ?? null;
  } catch (_) {}

  // ── Weight (last 30 days) ──
  let latestWeight: number | null = null;
  try {
    const weightResults: any[] = await query(
      AppleHealthKit.getWeightSamples.bind(AppleHealthKit),
      {
        startDate: thirtyDaysAgo.toISOString(),
        endDate: now.toISOString(),
        ascending: false,
        limit: 1,
        unit: 'kilogram',
      },
    );
    latestWeight = weightResults?.[0]?.value ?? null;
  } catch (_) {}

  // ── Sleep (8 pm yesterday → now) ──
  let sleepHours = 0;
  try {
    const sleepResults: any[] = await query(
      AppleHealthKit.getSleepSamples.bind(AppleHealthKit),
      {
        startDate: yesterday8pm.toISOString(),
        endDate: now.toISOString(),
      },
    );
    // HealthKit returns individual sleep stages — sum anything classed as "ASLEEP"
    sleepHours = (sleepResults ?? [])
      .filter((s: any) => s.value === 'ASLEEP' || s.value === 'CORE' || s.value === 'DEEP' || s.value === 'REM')
      .reduce((sum: number, s: any) => {
        const ms =
          new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
        return sum + ms / 3_600_000;
      }, 0);
  } catch (_) {}

  // ── Active Calories Burned ──
  let totalCalories = 0;
  try {
    const calResult: any = await query(
      AppleHealthKit.getActiveEnergyBurned.bind(AppleHealthKit),
      {
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        ascending: false,
        limit: 1000,
      },
    );
    totalCalories = (calResult ?? []).reduce(
      (sum: number, r: any) => sum + (r.value ?? 0),
      0,
    );
  } catch (_) {}

  return {
    steps: totalSteps,
    heartRate: latestHR,
    weight: latestWeight ? `${latestWeight.toFixed(1)}kg` : null,
    sleep: sleepHours > 0 ? `${sleepHours.toFixed(1)}hrs` : null,
    calories: Math.round(totalCalories),
  };
};

const initIOS = (): Promise<boolean> =>
  new Promise(async (resolve) => {
    const AppleHealthKit = (await import('react-native-health')).default;

    const options = {
        permissions: {
            read: [
            'Steps',
            'HeartRate',
            'Weight',
            'SleepAnalysis',
            'ActiveEnergyBurned',
            ] as HealthPermission[],
            write: [] as HealthPermission[],
        },
        };

    AppleHealthKit.initHealthKit(options, (err: string) => {
      if (err) {
        console.warn('HealthKit init error:', err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the platform health SDK and request all required permissions.
 * Returns true if the SDK is available and ready; false if the device/OS;
 * doesn't support it (e.g. Android without Health Connect installed).
 */
export const initHealthService = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      return await initIOS();
    } else {
      const ok = await initAndroid();
      if (ok) await requestAndroidPermissions();
      return ok;
    }
  } catch (err) {
    console.warn('initHealthService error:', err);
    return false;
  }
};

/**
 * Fetch today's health data from whichever platform SDK is active.
 * Always resolves — individual metric failures are swallowed and;
 * return null / 0 so the UI degrades gracefully.
 */
export const fetchHealthData = async (): Promise<HealthData> => {
  try {
    return Platform.OS === 'ios'
      ? await fetchIOS()
      : await fetchAndroid();
  } catch (err) {
    console.warn('fetchHealthData error:', err);
    return { steps: 0, heartRate: null, weight: null, sleep: null, calories: 0 };
  }
};

/**
 * Quick non-permission check — is health data possible on this device?
 * Useful for showing/hiding the "Live" badge before init completes.
 */
export const isHealthAvailable = (): boolean => {
  // HealthKit is always present on iOS 8+. Health Connect requires Android 9+.
  // We can't check Health Connect install status without initialising, so
  // we optimistically return true on Android and handle failure in init.
  return Platform.OS === 'ios' || Platform.OS === 'android';
};