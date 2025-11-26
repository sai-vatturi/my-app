import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly _baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  get baseUrl(): string {
    return this._baseUrl;
  }

  get<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    // Ensure endpoint starts with / and doesn't have trailing slash (except root)
    const normalizedEndpoint = endpoint === '/' ? '/' : endpoint.replace(/\/$/, '');
    return this.http.get<T>(`${this.baseUrl}${normalizedEndpoint}`, { params: httpParams }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    const normalizedEndpoint = endpoint === '/' ? '/' : endpoint.replace(/\/$/, '');
    return this.http.post<T>(`${this.baseUrl}${normalizedEndpoint}`, data).pipe(
      catchError(this.handleError)
    );
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    const normalizedEndpoint = endpoint === '/' ? '/' : endpoint.replace(/\/$/, '');
    return this.http.put<T>(`${this.baseUrl}${normalizedEndpoint}`, data).pipe(
      catchError(this.handleError)
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    const normalizedEndpoint = endpoint === '/' ? '/' : endpoint.replace(/\/$/, '');
    return this.http.delete<T>(`${this.baseUrl}${normalizedEndpoint}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend error
      errorMessage = error.error?.detail || error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error('API Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
