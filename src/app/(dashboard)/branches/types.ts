export interface Branch {
  id: number;
  name: string;
  description?: string;
  address: string;
  city?: string;
  region?: string;
  phone?: string;
  email?: string;
  workingHours?: string;
  latitude?: number;
  longitude?: number;
  bannerImage?: string;
  isActive?: boolean;
}

export interface BranchForm {
  name: string;
  address: string;
  description: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  workingHours: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
}

export const emptyBranchForm: BranchForm = {
  name: "",
  address: "",
  description: "",
  city: "",
  region: "",
  phone: "",
  email: "",
  workingHours: "",
  latitude: "",
  longitude: "",
  isActive: true,
};
