// index.ts - Fixed interface definitions

export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  personalId: string;
  email: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FileUpload {
  universityId?: File;
  resume?: File;
}
