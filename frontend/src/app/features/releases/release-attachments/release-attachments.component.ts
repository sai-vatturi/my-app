import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Release, ReleaseProduct } from '../../../core/models/release.model';
import { WorkflowTemplate } from '../../../core/models/workflow.model';
import { ReleaseService } from '../../../core/services/release.service';
import { environment } from '../../../../environments/environment';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

interface StageAttachment {
  productId: string;
  productName: string;
  stageOrder: string;
  stageName: string;
  attachmentId: string;
  filename: string;
  uploadedAt: string;
}

interface StageAttachmentGroup {
  stageOrder: string;
  stageName: string;
  attachments: StageAttachment[];
}

@Component({
  selector: 'app-release-attachments',
  standalone: true,
  imports: [CommonModule, ButtonComponent, AlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8">
      <!-- Custom Attachments Section -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div class="flex items-center gap-4">
            <h3 class="text-lg font-semibold text-gray-900">General Attachments</h3>
            <button *ngIf="release.custom_attachments?.length" (click)="downloadAllCustomAttachments()" 
              class="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Download All
            </button>
          </div>
          <div class="relative">
            <input type="file" #fileInput class="hidden" (change)="uploadCustomAttachment($event)">
            <app-button size="sm" (clicked)="fileInput.click()" [loading]="uploading()">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add Attachment
            </app-button>
          </div>
        </div>
        
        <div class="divide-y divide-gray-200">
          <div *ngIf="release.custom_attachments?.length === 0" class="p-8 text-center text-gray-500">
            No general attachments added yet.
          </div>
          
          <div *ngFor="let file of release.custom_attachments" class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <p class="font-medium text-gray-900">{{ file.filename }}</p>
                <p class="text-xs text-gray-500">Uploaded {{ formatDate(file.uploaded_at) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button (click)="downloadFile(file.id)" class="p-2 text-gray-500 hover:text-primary-600 transition-colors" title="Download">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
              </button>
              <button (click)="deleteCustomAttachment(file.id)" class="p-2 text-gray-500 hover:text-red-600 transition-colors" title="Delete">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Stage Attachments Section -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 class="text-lg font-semibold text-gray-900">Workflow Stage Attachments</h3>
        </div>

        <div class="divide-y divide-gray-200">
          <div *ngIf="stageAttachmentGroups().length === 0" class="p-8 text-center text-gray-500">
            No stage attachments found.
          </div>

          <div *ngFor="let group of stageAttachmentGroups()" class="border-b border-gray-100 last:border-0">
            <!-- Group Header -->
            <div class="px-6 py-3 bg-gray-50 flex justify-between items-center">
              <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wider">{{ group.stageName }}</h4>
              <button (click)="downloadAllStageAttachments(group)" 
                class="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Download All
              </button>
            </div>

            <!-- Attachments in Group -->
            <div *ngFor="let attachment of group.attachments" class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors pl-8">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ attachment.filename }}</p>
                  <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span class="font-medium text-gray-700">{{ attachment.productName }}</span>
                    <span>•</span>
                    <span>{{ formatDate(attachment.uploadedAt) }}</span>
                  </div>
                </div>
              </div>
              <button (click)="downloadFile(attachment.attachmentId)" class="p-2 text-gray-500 hover:text-primary-600 transition-colors" title="Download">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ReleaseAttachmentsComponent {
  @Input() release!: Release;
  @Input() workflow!: WorkflowTemplate;
  @Input() productMap: Map<string, string> = new Map();
  @Output() releaseUpdated = new EventEmitter<Release>();

  uploading = signal(false);
  error = signal<string | null>(null);

  stageAttachmentGroups = computed(() => {
    const groups: Map<string, StageAttachmentGroup> = new Map();

    if (!this.release || !this.release.products) return [];

    this.release.products.forEach(product => {
      if (!product.workflow_states) return;

      Object.entries(product.workflow_states).forEach(([order, state]) => {
        if (state.attachment_id) {
          const stageOrder = order;

          if (!groups.has(stageOrder)) {
            // Find stage name from workflow
            const stage = this.workflow?.stages.find(s => s.order.toString() === stageOrder);
            const stageName = stage ? stage.name : `Stage ${stageOrder}`;

            groups.set(stageOrder, {
              stageOrder,
              stageName,
              attachments: []
            });
          }

          groups.get(stageOrder)!.attachments.push({
            productId: product.product_id,
            productName: this.productMap.get(product.product_id) || product.product_id,
            stageOrder,
            stageName: groups.get(stageOrder)!.stageName,
            attachmentId: state.attachment_id,
            filename: state.attachment_filename || 'unknown',
            uploadedAt: state.attachment_uploaded_at || ''
          });
        }
      });
    });

    // Convert map to array and sort by stage order
    return Array.from(groups.values()).sort((a, b) => parseInt(a.stageOrder) - parseInt(b.stageOrder));
  });

  constructor(private releaseService: ReleaseService) { }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  downloadFile(fileId: string, customFilename?: string): void {
    let url = `${environment.apiUrl}/files/${fileId}/download`;
    if (customFilename) {
      url += `?filename=${encodeURIComponent(customFilename)}`;
    }

    // Use hidden iframe for download to allow multiple downloads without blocking
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    // Clean up iframe after a delay (give it enough time to start download)
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 60000);
  }

  downloadAllStageAttachments(group: StageAttachmentGroup): void {
    group.attachments.forEach((attachment, index) => {
      // Naming convention: stage name _ product name _ filename
      // Sanitize names to be safe for filenames
      const safeStageName = this.sanitizeFilename(group.stageName);
      const safeProductName = this.sanitizeFilename(attachment.productName);
      const customFilename = `${safeStageName}_${safeProductName}_${attachment.filename}`;

      // Add a small delay between downloads to prevent browser blocking
      setTimeout(() => {
        this.downloadFile(attachment.attachmentId, customFilename);
      }, index * 500);
    });
  }

  downloadAllCustomAttachments(): void {
    if (!this.release.custom_attachments) return;

    this.release.custom_attachments.forEach((attachment, index) => {
      setTimeout(() => {
        this.downloadFile(attachment.id);
      }, index * 500);
    });
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_');
  }



  uploadCustomAttachment(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.error.set(null);

    const releaseId = this.release.id || this.release._id;
    if (!releaseId) return;

    this.releaseService.uploadCustomAttachment(releaseId, file).subscribe({
      next: (updatedRelease) => {
        this.uploading.set(false);
        this.releaseUpdated.emit(updatedRelease);
        input.value = ''; // Reset input
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err.message || 'Failed to upload attachment');
      }
    });
  }

  deleteCustomAttachment(attachmentId: string): void {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    const releaseId = this.release.id || this.release._id;
    if (!releaseId) return;

    this.releaseService.deleteCustomAttachment(releaseId, attachmentId).subscribe({
      next: (updatedRelease) => {
        this.releaseUpdated.emit(updatedRelease);
      },
      error: (err) => {
        alert('Failed to delete attachment: ' + (err.message || 'Unknown error'));
      }
    });
  }
}
