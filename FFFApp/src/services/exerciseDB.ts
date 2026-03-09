const BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main';
const EXERCISES_URL = `${BASE_URL}/dist/exercises.json`;
export const IMAGE_BASE = `${BASE_URL}/exercises/`;

export interface Exercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

let cachedExercises: Exercise[] | null = null;

export const exerciseDB = {
  // Fetch all exercises once, cache in memory
  getAll: async (): Promise<Exercise[]> => {
    if (cachedExercises) return cachedExercises;
    const res = await fetch(EXERCISES_URL);
    const data = await res.json();
    cachedExercises = data;
    return data;
  },

  // Search by name or muscle
  search: async (query: string, filter = 'all'): Promise<Exercise[]> => {
    const all = await exerciseDB.getAll();
    const q = query.toLowerCase().trim();

    return all.filter(ex => {
      const matchesQuery = !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.primaryMuscles.some(m => m.toLowerCase().includes(q)) ||
        ex.category.toLowerCase().includes(q);

      const matchesFilter = filter === 'all' ||
        ex.category.toLowerCase() === filter.toLowerCase() ||
        ex.primaryMuscles.some(m => m.toLowerCase().includes(filter.toLowerCase()));

      return matchesQuery && matchesFilter;
    }).slice(0, 50); // cap at 50 results
  },

  // Get image URL for an exercise
  getImageUrl: (exercise: Exercise, index = 0): string => {
    if (!exercise.images || exercise.images.length === 0) return '';
    return `${IMAGE_BASE}${exercise.images[index] || exercise.images[0]}`;
  },
};