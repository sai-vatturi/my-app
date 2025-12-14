import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Release, ReleaseCreate, ReleaseUpdate } from '../models/release.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ReleaseService {
  private releasesSignal = signal<Release[]>([]);
  releases = this.releasesSignal.asReadonly();

  constructor(private api: ApiService) { }

  getAll(): Observable<Release[]> {
    return this.api.get<Release[]>('/releases').pipe(
      tap(releases => {
        // Normalize _id to id
        const normalizedReleases = releases.map(r => ({
          ...r,
          id: r.id || r._id
        }));
        this.releasesSignal.set(normalizedReleases);
      })
    );
  }

  getByDateRange(startDate: Date, endDate: Date): Observable<Release[]> {
    const params = {
      start_date: this.formatDate(startDate),
      end_date: this.formatDate(endDate)
    };
    return this.api.get<Release[]>('/releases', params).pipe(
      tap(releases => {
        // Normalize _id to id for each release
        releases.forEach(r => {
          if (!r.id && r._id) {
            r.id = r._id;
          }
        });
      })
    );
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  }

  getById(id: string): Observable<Release> {
    return this.api.get<Release>(`/releases/${id}`).pipe(
      tap(release => {
        // Normalize _id to id
        if (release._id && !release.id) {
          release.id = release._id;
        }
      })
    );
  }

  create(release: ReleaseCreate): Observable<Release> {
    return this.api.post<Release>('/releases', release).pipe(
      tap(newRelease => {
        this.releasesSignal.update(releases => [...releases, newRelease]);
      })
    );
  }

  update(id: string, release: ReleaseUpdate): Observable<Release> {
    return this.api.put<Release>(`/releases/${id}`, release).pipe(
      tap(updatedRelease => {
        this.releasesSignal.update(releases =>
          releases.map(r => r.id === id ? updatedRelease : r)
        );
      })
    );
  }

  delete(id: string): Observable<any> {
    return this.api.delete(`/releases/${id}`).pipe(
      tap(() => {
        this.releasesSignal.update(releases =>
          releases.filter(r => r.id !== id)
        );
      })
    );
  }

  advanceProductStage(releaseId: string, productId: string): Observable<Release> {
    return this.api.post<Release>(
      `/releases/${releaseId}/products/${productId}/advance-stage`,
      {}
    ).pipe(
      tap(updatedRelease => {
        this.releasesSignal.update(releases =>
          releases.map(r => (r.id === releaseId || r._id === releaseId) ? updatedRelease : r)
        );
      })
    );
  }

  uploadStageAttachment(
    releaseId: string,
    productId: string,
    stageOrder: number,
    file: File
  ): Observable<Release> {
    const formData = new FormData();
    formData.append('file', file);

    return this.api.post<Release>(
      `/releases/${releaseId}/products/${productId}/stages/${stageOrder}/attachment`,
      formData
    ).pipe(
      tap(updatedRelease => {
        this.releasesSignal.update(releases =>
          releases.map(r => (r.id === releaseId || r._id === releaseId) ? updatedRelease : r)
        );
      })
    );
  }

  deleteStageAttachment(
    releaseId: string,
    productId: string,
    stageOrder: number,
    attachmentId: string
  ): Observable<Release> {
    return this.api.delete<Release>(
      `/releases/${releaseId}/products/${productId}/stages/${stageOrder}/attachments/${attachmentId}`
    ).pipe(
      tap(updatedRelease => {
        this.releasesSignal.update(releases =>
          releases.map(r => (r.id === releaseId || r._id === releaseId) ? updatedRelease : r)
        );
      })
    );
  }

  updateStageTimeline(
    releaseId: string,
    stageOrder: number,
    daysBeforeRelease?: number,
    productId?: string,
    deadline?: Date
  ): Observable<Release> {
    const data: any = {
      product_id: productId || null
    };

    if (deadline) {
      data.deadline = deadline.toISOString();
    } else if (daysBeforeRelease !== undefined) {
      data.days_before_release = daysBeforeRelease;
    }

    return this.api.put<Release>(
      `/releases/${releaseId}/stages/${stageOrder}/timeline`,
      data
    ).pipe(
      tap(updatedRelease => {
        this.releasesSignal.update(releases =>
          releases.map(r => (r.id === releaseId || r._id === releaseId) ? updatedRelease : r)
        );
      })
    );
  }
  uploadCustomAttachment(releaseId: string, file: File): Observable<Release> {
    const formData = new FormData();
    formData.append('file', file);

    return this.api.post<Release>(
      `/releases/${releaseId}/custom-attachments`,
      formData
    ).pipe(
      tap(updatedRelease => {
        this.releasesSignal.update(releases =>
          releases.map(r => (r.id === releaseId || r._id === releaseId) ? updatedRelease : r)
        );
      })
    );
  }

  deleteCustomAttachment(releaseId: string, attachmentId: string): Observable<Release> {
    return this.api.delete<Release>(
      `/releases/${releaseId}/custom-attachments/${attachmentId}`
    ).pipe(
      tap(updatedRelease => {
        this.releasesSignal.update(releases =>
          releases.map(r => (r.id === releaseId || r._id === releaseId) ? updatedRelease : r)
        );
      })
    );
  }
}
