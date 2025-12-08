export interface UploadResponse {
  success: boolean;
  message: string;
  data: UploadedFileInfo | UploadedFileInfo[];
}

export interface UploadedFileInfo {
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
}

export interface DeleteImageResponse {
  success: boolean;
  message: string;
}

export interface UploadConfigResponse {
  allowedMimeTypes: string[];
  maxFileSize: number;
  maxFiles: number;
  maxFileSizeMB: number;
}
