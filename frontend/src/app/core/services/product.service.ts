import { Injectable } from '@angular/core';
import { Product, ProductCreate, ProductUpdate } from '../models/product.model';
import { ApiService } from './api.service';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService extends BaseService<Product, ProductCreate, ProductUpdate> {
  protected override endpoint = '/products';

  constructor(protected override api: ApiService) {
    super(api);
  }

  // No override needed for getAll, getById, create, update, delete
  // unless specific logic exists. 
  // BaseService handles:
  // - public items signal
  // - ID normalization
  // - State updates on mutations

  // Expose the readonly signal as 'products' to match existing interface consumers
  // BaseService exposes 'items', so we can alias it or just rely on 'items'.
  // But to minimize refactoring in components, let's alias it.
  get products() {
    return this.items;
  }
}
