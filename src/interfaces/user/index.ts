// Define branch type for reuse
export interface Branch {
  id?: string;
  uuid?: string;
  branch_id?: string;
  branch_code?: string;
  [key: string]: any;
}

export interface User {
  id: Number,
  uuid: String,
  name: String,
  first_name: String,
  last_name: String,
  phone: String,
  email: String,
  role: String,
  system_role: String,
  client_id: null | string,
  branches: Array<string | Branch> | null,
  branches_access?: Array<string | Branch>,
  created_at: String,
  updated_at: String,
}
