export interface FileMetadata {
  _id: string;
  filename: string;
  content_type: string;
  size: number;
  release_id?: string;
  uploaded_by?: string;
  upload_date: string;
}

export interface FileUploadResponse {
  file_id: string;
  filename: string;
  size: number;
  content_type: string;
}
