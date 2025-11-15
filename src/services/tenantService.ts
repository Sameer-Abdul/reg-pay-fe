const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Interface for tenant data
export interface Tenant {
  tenant_id: string;
  name: string;
  email: string;
  contact_no: string;
  address: string;
  image_url: string;
  license_type?: string;
  valid_to?: string;
}

// Fetch all tenants from the NestJS backend
export async function fetchTenants(): Promise<Tenant[]> {
  try {
    const res = await fetch(`${API_URL}/tenants`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to fetch tenants');
    }

    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error('Error fetching tenants:', err);
    return [];
  }
}

// Fetch a single tenant by ID
export async function fetchTenantById(id: string): Promise<Tenant | null> {
  try {
    const res = await fetch(`${API_URL}/tenants/${id}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to fetch tenant');
    }

    const data = await res.json();
    return data.data || null;
  } catch (err) {
    console.error('Error fetching tenant:', err);
    return null;
  }
}
