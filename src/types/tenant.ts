export interface Tenant {
  id: number;
  tenant_id?: string;  // backend uses tenant_id
  name: string;
  email?: string;
  contact_no?: string;
  address?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}
