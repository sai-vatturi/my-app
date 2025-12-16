import { Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReleaseProduct } from '../../../core/models/release.model';
import { AutoResizeDirective } from '../../../shared/directives/auto-resize.directive';

export interface ProductDialogData {
    product_id: string;
    new_features: string;
    enhancements: string;
    key_defect_fixes: string;
    deferred_items: string;
    pocs: string[];
    fixed_versions: { jira_board_id: string; fixed_version: string }[];
    workflow_states?: any;
}

@Component({
    selector: 'app-product-edit-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, AutoResizeDirective],
    templateUrl: './product-edit-dialog.html',
})
export class ProductEditDialogComponent {
    @Input() visible = false;
    @Input() mode: 'add' | 'edit' = 'edit';
    @Input() productMap: Map<string, string> = new Map();
    @Input() availableProducts: any[] = [];
    @Input() set product(value: ProductDialogData | null) {
        if (value) {
            // Deep clone to avoid mutating original
            this._product.set({
                product_id: value.product_id || '',
                new_features: value.new_features || '',
                enhancements: value.enhancements || '',
                key_defect_fixes: value.key_defect_fixes || '',
                deferred_items: value.deferred_items || '',
                pocs: [...(value.pocs || [])],
                fixed_versions: (value.fixed_versions || []).map(v => ({ ...v })),
                workflow_states: value.workflow_states,
            });
        }
    }

    @Output() save = new EventEmitter<ProductDialogData>();
    @Output() cancel = new EventEmitter<void>();

    _product = signal<ProductDialogData>({
        product_id: '',
        new_features: '',
        enhancements: '',
        key_defect_fixes: '',
        deferred_items: '',
        pocs: [],
        fixed_versions: [],
    });

    title = computed(() => this.mode === 'add' ? 'Add Product to Release' : 'Edit Product Details');
    saveButtonText = computed(() => this.mode === 'add' ? 'Add Product' : 'Save Changes');
    canSave = computed(() => this.mode === 'edit' || !!this._product().product_id);

    // Scope field update methods
    updateProductId(value: string): void {
        this._product.update(p => ({ ...p, product_id: value }));
    }

    updateNewFeatures(value: string): void {
        this._product.update(p => ({ ...p, new_features: value }));
    }

    updateEnhancements(value: string): void {
        this._product.update(p => ({ ...p, enhancements: value }));
    }

    updateKeyDefectFixes(value: string): void {
        this._product.update(p => ({ ...p, key_defect_fixes: value }));
    }

    updateDeferredItems(value: string): void {
        this._product.update(p => ({ ...p, deferred_items: value }));
    }

    getProductName(id: string): string {
        return this.productMap.get(id) || 'Unknown Product';
    }

    // POC management
    updatePoc(value: string, index: number): void {
        this._product.update(p => {
            const pocs = [...p.pocs];
            pocs[index] = value;
            return { ...p, pocs };
        });
    }

    addPoc(): void {
        this._product.update(p => ({ ...p, pocs: [...p.pocs, ''] }));
    }

    removePoc(index: number): void {
        this._product.update(p => {
            const pocs = [...p.pocs];
            pocs.splice(index, 1);
            return { ...p, pocs };
        });
    }

    // Fixed version management
    addFixedVersion(): void {
        this._product.update(p => ({
            ...p,
            fixed_versions: [...p.fixed_versions, { jira_board_id: '', fixed_version: '' }]
        }));
    }

    removeFixedVersion(index: number): void {
        this._product.update(p => {
            const versions = [...p.fixed_versions];
            versions.splice(index, 1);
            return { ...p, fixed_versions: versions };
        });
    }

    updateFixedVersion(index: number, field: 'jira_board_id' | 'fixed_version', value: string): void {
        this._product.update(p => {
            const versions = p.fixed_versions.map((v, i) =>
                i === index ? { ...v, [field]: value } : v
            );
            return { ...p, fixed_versions: versions };
        });
    }

    onSave(): void {
        this.save.emit(this._product());
    }

    onCancel(): void {
        this.cancel.emit();
    }

    onBackdropClick(): void {
        this.onCancel();
    }

    trackByIndex(index: number): number {
        return index;
    }
}
