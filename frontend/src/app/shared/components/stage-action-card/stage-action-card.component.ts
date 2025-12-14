import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowStage } from '../../../core/models/workflow.model';
import { ButtonComponent } from '../button/button.component';

export interface StageAction {
  type: 'advance' | 'upload' | 'download';
  payload?: any;
}

@Component({
  selector: 'app-stage-action-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-72 flex flex-col gap-3 animate-fade-in relative overflow-hidden"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)">

      <!-- Drag Overlay -->
      <div *ngIf="isDragging && stage.requires_attachment" 
           class="absolute inset-0 z-50 bg-primary-50 bg-opacity-90 border-2 border-primary-500 border-dashed rounded-xl flex flex-col items-center justify-center text-primary-600 pointer-events-none transition-opacity">
           <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
           </svg>
           <span class="font-bold">Drop file here</span>
      </div>

      <!-- Header -->
      <div class="flex justify-between items-start">
        <div class="flex items-start gap-2">
            <!-- Revert Button -->
            <button *ngIf="canRevert" (click)="onRevert.emit()" [disabled]="isProcessing"
                class="mt-0.5 text-gray-400 hover:text-red-600 transition-colors p-0.5 rounded hover:bg-red-50" title="Revert to previous stage">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
            </button>
            <div>
                <h3 class="font-bold text-gray-900 leading-tight">{{ stage.name }}</h3>
                <span class="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    {{ getStatusLabel() }}
                </span>
            </div>
        </div>
        <button (click)="close.emit()" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Attachment Status -->
      <div *ngIf="stage.requires_attachment" class="text-xs flex flex-col gap-2">
         <!-- Status Text -->
         <div class="flex items-center gap-1.5"
             [ngClass]="hasAttachments ? 'text-green-600' : (stage.attachment_mandatory ? 'text-orange-600' : 'text-gray-500')">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
            </svg>
            <span *ngIf="hasAttachments">Attachments ({{ attachments.length }})</span>
            <span *ngIf="!hasAttachments">
              {{ stage.attachment_mandatory ? 'Attachment required' : 'Attachment optional' }}
            </span>
         </div>

         <!-- Attachment List -->
         <div *ngIf="hasAttachments" class="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
             <div class="flex justify-between items-center mb-1">
                 <span class="text-xs font-semibold text-gray-600">Files</span>
                 <button (click)="onDownloadAll.emit()" class="text-[10px] text-primary-600 hover:text-primary-700 font-medium hover:underline">
                    Download All
                 </button>
             </div>
            <div *ngFor="let file of attachments" class="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100 text-xs">
                <span class="truncate flex-1 min-w-0 mr-2" [title]="file.filename">{{ file.filename }}</span>
                <div class="flex items-center gap-1 flex-shrink-0">
                    <!-- Download -->
                    <button (click)="onDownload.emit(file)" class="p-1 text-gray-400 hover:text-primary-600 rounded hover:bg-white transition-colors" title="Download">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                    </button>
                    <!-- Delete -->
                    <button (click)="onDelete.emit(file)" class="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-white transition-colors" title="Delete">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
         </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-2 mt-1">
        
        <!-- Add Attachment Action -->
        <label *ngIf="stage.requires_attachment" 
               class="cursor-pointer group flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium text-gray-700">
          <svg class="w-4 h-4 text-gray-400 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          {{ hasAttachments ? 'Add File / Drag & Drop' : 'Upload / Drag & Drop File' }}
          <input type="file" class="hidden" multiple (change)="onFileSelected($event)" [disabled]="isProcessing">
        </label>

         <!-- Advance Action -->
        <button *ngIf="canAdvance()" (click)="onAdvance.emit()" [disabled]="isProcessing"
          class="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-primary-600 text-white hover:bg-primary-700 active:transform active:scale-95 transition-all shadow-md text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">
          <span *ngIf="isProcessing" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
          <span *ngIf="!isProcessing">Advance Stage</span>
          <svg *ngIf="!isProcessing" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
          </svg>
        </button>

        <!-- Blocked Message -->
        <div *ngIf="status === 'current' && !canAdvance() && !isProcessing" 
             class="text-xs text-center text-orange-600 bg-orange-50 py-1.5 rounded border border-orange-100">
           Upload required to continue
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class StageActionCardComponent {
  @Input() stage!: WorkflowStage;
  @Input() state: any = null; // WorkflowStageState
  @Input() status: 'completed' | 'current' | 'upcoming' = 'upcoming';
  @Input() isProcessing = false;

  @Input() canRevert = false;

  @Output() onAdvance = new EventEmitter<void>();
  @Output() onRevert = new EventEmitter<void>();
  @Output() onUpload = new EventEmitter<File[]>();
  @Output() onDownload = new EventEmitter<any>();
  @Output() onDownloadAll = new EventEmitter<void>();
  @Output() onDelete = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  isDragging = false;

  get attachments(): any[] {
    if (this.state?.attachments && this.state.attachments.length > 0) {
      return this.state.attachments;
    }
    // Fallback for legacy or if attachments array is empty but singular fields exist
    if (this.state?.attachment_id) {
      return [{
        id: this.state.attachment_id,
        filename: this.state.attachment_filename || 'Unknown File',
        uploaded_at: this.state.attachment_uploaded_at
      }];
    }
    return [];
  }

  get hasAttachments(): boolean {
    return this.attachments.length > 0;
  }

  canAdvance(): boolean {
    if (this.status === 'completed' || this.status === 'upcoming') return false;
    if (!this.stage.requires_attachment) return true;
    if (this.stage.requires_attachment && !this.stage.attachment_mandatory) return true;
    if (this.stage.requires_attachment && this.stage.attachment_mandatory && this.hasAttachments) return true;
    return false;
  }

  getStatusLabel(): string {
    switch (this.status) {
      case 'completed': return 'Completed';
      case 'current': return 'In Progress';
      default: return 'Pending';
    }
  }

  getTruncatedFilename(filename: string): string {
    if (!filename) return '';
    if (filename.length > 20) return filename.substring(0, 10) + '...' + filename.substring(filename.length - 7);
    return filename;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.onUpload.emit(Array.from(input.files));
      input.value = ''; // Reset to allow same file upload
    }
  }

  // Drag and Drop Handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.stage.requires_attachment && !this.isProcessing) {
      this.isDragging = true;
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (!this.stage.requires_attachment || this.isProcessing) return;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.onUpload.emit(Array.from(event.dataTransfer.files));
    }
  }
}
