export interface BranchLocation {
  id: number;
  name: string;
}

export interface PublicBranch {
  id: number;
  name: string;
  branch_code: string;
  level: string;
  district?: BranchLocation | null;
  area?: BranchLocation | null;
}
