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
    <div class="bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-72 flex flex-col gap-3 animate-fade-in relative">
      <!-- Arrow pointer (simplified, positioning handled by parent) -->
      
      <!-- Header -->
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-gray-900">{{ stage.name }}</h3>
          <span class="text-xs text-gray-500 font-medium uppercase tracking-wide">
            {{ getStatusLabel() }}
          </span>
        </div>
        <button (click)="close.emit()" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Attachment Status if required -->
      <div *ngIf="stage.requires_attachment" class="text-xs flex items-center gap-1.5" 
           [ngClass]="state?.attachment_id ? 'text-green-600' : (stage.attachment_mandatory ? 'text-orange-600' : 'text-gray-500')">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
        </svg>
        <span *ngIf="state?.attachment_id">File attached: {{ getTruncatedFilename(state?.attachment_filename) }}</span>
        <span *ngIf="!state?.attachment_id">
          {{ stage.attachment_mandatory ? 'Attachment required' : 'Attachment optional' }}
        </span>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-2 mt-1">
        
        <!-- Upload / Replace Action -->
        <label *ngIf="stage.requires_attachment" 
               class="cursor-pointer group flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium text-gray-700">
          <svg class="w-4 h-4 text-gray-400 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
          </svg>
          {{ state?.attachment_id ? 'Replace File' : 'Upload File' }}
          <input type="file" class="hidden" (change)="onFileSelected($event)" [disabled]="isProcessing">
        </label>

         <!-- Download Action (if exists) -->
         <button *ngIf="state?.attachment_id" (click)="onDownload.emit()"
            class="flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors">
            Download current file
         </button>

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
  @Input() state: any = null; // WorkflowStageState usually
  @Input() status: 'completed' | 'current' | 'upcoming' = 'upcoming';
  @Input() isProcessing = false;

  @Output() onAdvance = new EventEmitter<void>();
  @Output() onUpload = new EventEmitter<File>();
  @Output() onDownload = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  canAdvance(): boolean {
    if (this.status === 'completed' || this.status === 'upcoming') return false;

    // Logic from WorkflowProgressComponent
    if (!this.stage.requires_attachment) return true;
    if (this.stage.requires_attachment && !this.stage.attachment_mandatory) return true;
    if (this.stage.requires_attachment && this.stage.attachment_mandatory && this.state?.attachment_id) return true;

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
      this.onUpload.emit(input.files[0]);
    }
  }
}
