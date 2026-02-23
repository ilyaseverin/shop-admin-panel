export interface Branch {
  id: number;
  name: string;
  description?: string;
  address: string;
  city?: string;
  region?: string;
  phone?: string;
  isActive?: boolean;
}

export interface BranchForm {
  name: string;
  address: string;
  description: string;
  city: string;
  region: string;
  phone: string;
  isActive: boolean;
}

export const emptyBranchForm: BranchForm = {
  name: "",
  address: "",
  description: "",
  city: "",
  region: "",
  phone: "",
  isActive: true,
};
