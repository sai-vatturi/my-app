import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FileMetadata, FileUploadResponse } from '../models/file.model';

export interface FileQueryParams {
  skip?: number;
  limit?: number;
  release_id?: string;
}

@Injectable({ providedIn: 'root' })
export class FileApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'files';

  getAll(params?: FileQueryParams): Observable<FileMetadata[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<FileMetadata[]>(this.endpoint, { params: httpParams });
  }

  getById(id: string): Observable<FileMetadata> {
    return this.http.get<FileMetadata>(`${this.endpoint}/${id}`);
  }

  upload(file: File, releaseId?: string): Observable<HttpEvent<FileUploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    if (releaseId) {
      formData.append('release_id', releaseId);
    }
    return this.http.post<FileUploadResponse>(`${this.endpoint}/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.endpoint}/${id}`);
  }

  download(id: string): Observable<Blob> {
    return this.http.get(`${this.endpoint}/${id}/download`, {
      responseType: 'blob'
    });
  }
}
