import { Injectable, signal, WritableSignal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

/**
 * BaseService<T> provides generic CRUD operations.
 * T: The model type (e.g., Product, Squad)
 * C: The create DTO type
 * U: The update DTO type
 */
export abstract class BaseService<T extends { id?: string; _id?: string }, C = any, U = any> {
    // Signal to hold the list of items
    protected itemsSignal: WritableSignal<T[]> = signal<T[]>([]);
    public readonly items = this.itemsSignal.asReadonly();

    protected abstract endpoint: string;

    constructor(protected api: ApiService) { }

    /**
     * Fetch all items and update the signal.
     */
    getAll(): Observable<T[]> {
        return this.api.get<T[]>(this.endpoint).pipe(
            tap(items => {
                // Normalize IDs to ensure 'id' property exists
                const normalized = items.map(item => ({ ...item, id: item.id || item._id }));
                this.itemsSignal.set(normalized);
            })
        );
    }

    /**
     * Get a single item by ID.
     */
    getById(id: string): Observable<T> {
        return this.api.get<T>(`${this.endpoint}/${id}`);
    }

    /**
     * Create a new item.
     */
    create(data: C): Observable<T> {
        return this.api.post<T>(this.endpoint, data).pipe(
            tap(newItem => {
                // Ensure ID presence for optimistic UI updates if needed, though backend usually returns it
                const normalized = { ...newItem, id: newItem.id || newItem._id };
                this.itemsSignal.update(items => [...items, normalized]);
            })
        );
    }

    /**
     * Update an existing item.
     */
    update(id: string, data: U): Observable<T> {
        return this.api.put<T>(`${this.endpoint}/${id}`, data).pipe(
            tap(updatedItem => {
                const normalized = { ...updatedItem, id: updatedItem.id || updatedItem._id };
                this.itemsSignal.update(items =>
                    items.map(item => (item.id === id || item._id === id) ? normalized : item)
                );
            })
        );
    }

    /**
     * Delete an item.
     */
    delete(id: string): Observable<any> {
        return this.api.delete(`${this.endpoint}/${id}`).pipe(
            tap(() => {
                this.itemsSignal.update(items =>
                    items.filter(item => item.id !== id && item._id !== id)
                );
            })
        );
    }
}
