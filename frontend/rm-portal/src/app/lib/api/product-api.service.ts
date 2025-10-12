import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Product, ProductCreateDto, ProductUpdateDto } from '../models/product.model';

export interface ProductQueryParams {
  skip?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'products';

  getAll(params?: ProductQueryParams): Observable<Product[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<Product[]>(this.endpoint, { params: httpParams });
  }

  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.endpoint}/${id}`);
  }

  create(data: ProductCreateDto): Observable<Product> {
    return this.http.post<Product>(this.endpoint, data);
  }

  update(id: string, data: ProductUpdateDto): Observable<Product> {
    return this.http.put<Product>(`${this.endpoint}/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.endpoint}/${id}`);
  }
}
