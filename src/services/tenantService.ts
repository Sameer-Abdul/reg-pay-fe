import { Tenant } from "../types/tenant";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://reg-pay-be.onrender.com";

export async function fetchTenants(): Promise<Tenant[]> {
  try {
    const response = await fetch(`${API_URL}/tenants`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tenants: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Tenant fetch error:", err);
    return [];
  }
}
