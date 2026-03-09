import {
  initialize,
  requestPermission,
  readRecords,
  getGrantedPermissions,
} from 'react-native-health-connect';

export const initHealthConnect = async (): Promise<boolean> => {
  const isInitialized = await initialize();
  return isInitialized;
};

export const requestHealthPermissions = async () => {
  const granted = await getGrantedPermissions();
  const grantedTypes = granted.map((p: any) => p.recordType);

  const needed = [
    { accessType: 'read' as const, recordType: 'Steps' },
    { accessType: 'read' as const, recordType: 'HeartRate' },
    { accessType: 'read' as const, recordType: 'Weight' },
    { accessType: 'read' as const, recordType: 'SleepSession' },
    { accessType: 'read' as const, recordType: 'ActiveCaloriesBurned' },
  ].filter(p => !grantedTypes.includes(p.recordType));

  if (needed.length > 0) {
    await requestPermission(needed);
  }
};

export const fetchHealthData = async () => {
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
  const totalSteps = stepsData.records.reduce((sum: number, r: any) => sum + r.count, 0);

  // Heart Rate (latest)
  const hrData = await readRecords('HeartRate', { timeRangeFilter: todayFilter });
  const latestHR = hrData.records.at(-1)?.samples?.at(-1)?.beatsPerMinute ?? null;

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

  // Sleep (last night)
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
    const ms = new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
    return sum + ms / 3600000;
  }, 0);

  // Calories
  const caloriesData = await readRecords('ActiveCaloriesBurned', { timeRangeFilter: todayFilter });
  const totalCalories = caloriesData.records.reduce(
    (sum: number, r: any) => sum + r.energy.inKilocalories, 0
  );

  return {
    steps: totalSteps,
    heartRate: latestHR,
    weight: latestWeight ? `${latestWeight.toFixed(1)}kg` : null,
    sleep: sleepHours > 0 ? `${sleepHours.toFixed(1)}hrs` : null,
    calories: Math.round(totalCalories),
  };
};