// Import process type definitions
declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Location {
  id: string;
  name: string;
}

interface LocationResponse {
  success: boolean;
  data: Location[];
  error?: string;
}

/**
 * Fetches states from the backend API
 */
export async function fetchStates(): Promise<Location[]> {
  try {
    const response = await fetch(`${API_URL}/locations/states`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch states');
    }

    const data: LocationResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching states:', error);
    return [];
  }
}

/**
 * Fetches districts for a given state
 */
export async function fetchDistricts(state: string): Promise<Location[]> {
  if (!state) return [];

  try {
    const response = await fetch(
      `${API_URL}/locations/districts?state=${encodeURIComponent(state)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch districts');
    }

    const data: LocationResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching districts:', error);
    return [];
  }
}

/**
 * Fetches mandals for a given district
 */
export async function fetchMandals(district: string): Promise<Location[]> {
  if (!district) return [];

  try {
    const response = await fetch(
      `${API_URL}/locations/mandals?district=${encodeURIComponent(district)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch mandals');
    }

    const data: LocationResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching mandals:', error);
    return [];
  }
}
