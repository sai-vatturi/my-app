import { Component, ElementRef, Input, OnChanges, SimpleChanges, AfterViewInit, ChangeDetectionStrategy, signal, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Lock, Unlock } from 'lucide-angular';
import * as d3 from 'd3';
import { ReleaseNode } from '../../../core/models/release.model';
import { Release } from '../../../core/models/release.model';
import { Workflow } from '../../../core/models/workflow.model';

@Component({
  selector: 'app-release-workflow',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './release-workflow.component.html',
  styles: [`
    :host { display: block; width: 100%; }
    .workflow-container { position: relative; }
    .node.draggable { cursor: move; }
    .node.dragging { opacity: 0.7; }
  `]
})
export class ReleaseWorkflowComponent implements AfterViewInit, OnChanges {
  @Input() releaseData: ReleaseNode[] = [];
  @Input() release: Release | null = null;
  @Input() workflow: Workflow | null = null;
  
  @Output() advanceStage = new EventEmitter<string>();
  @Output() editStageDate = new EventEmitter<{productId: string, stageIndex: number}>();
  @Output() addAttachment = new EventEmitter<{productId: string, stageIndex: number}>();
  
  readonly Lock = Lock;
  readonly Unlock = Unlock;
  
  private svg: any;
  private zoomGroup: any;
  private zoom: any;
  private drag: any;
  isLocked = signal(true); // Start locked by default
  
  selectedNode: ReleaseNode | null = null;

  constructor(private el: ElementRef, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    if (this.releaseData?.length > 0) {
      setTimeout(() => this.renderChart(), 0);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['releaseData'] && !changes['releaseData'].firstChange && this.releaseData?.length > 0) {
      this.renderChart();
    }
  }

  private renderChart(): void {
    const container = this.el.nativeElement.querySelector('.relative[style*="z-index: 1"]');
    if (!container) return;

    d3.select(container).selectAll('svg.chart').remove();

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight || 600;
    
    // Calculate dimensions to fit within container
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    this.svg = d3.select(container)
      .append('svg')
      .attr('class', 'chart')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    this.zoomGroup = this.svg.append('g')
      .attr('class', 'zoom-group')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const root = d3.hierarchy({ label: 'Root', children: this.releaseData } as any);
    
    // Use a horizontal tree layout for workflow stages
    const treeLayout = d3.tree<any>()
      .size([width * 0.8, height * 0.6]) // Make it more horizontal
      .separation((a: any, b: any) => {
        // Increase separation for stages
        if (a.data.type === 'stage' || b.data.type === 'stage') {
          return 2;
        }
        return (a.parent === b.parent ? 1.5 : 2);
      });
    
    treeLayout(root);

    // Links
    this.zoomGroup.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2)
      .attr('d', d3.linkHorizontal<any, any>()
        .x((d: any) => d.y)
        .y((d: any) => d.x));

    // Nodes
    const node = this.zoomGroup.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        this.selectedNode = d.data;
        this.cdr.detectChanges();
      });

    node.append('rect')
      .attr('width', 160)
      .attr('height', 50)
      .attr('x', -80)
      .attr('y', -25)
      .attr('rx', 8)
      .attr('fill', (d: any) => {
        if (d.data.label.includes('✓')) {
          return '#dcfce7'; // Green for completed
        } else if (d.data.label.includes('→')) {
          return '#fef3c7'; // Yellow for current
        }
        return this.getColor(d.data.type);
      })
      .attr('stroke', (d: any) => {
        if (d.data.label.includes('✓')) {
          return '#16a34a'; // Green border for completed
        } else if (d.data.label.includes('→')) {
          return '#ca8a04'; // Yellow border for current
        }
        return '#64748b';
      })
      .attr('stroke-width', 2);

    node.append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .text((d: any) => {
        const label = d.data.label || '';
        return label.length > 20 ? label.substring(0, 18) + '...' : label;
      })
      .style('font-size', '14px')
      .style('fill', '#1e293b')
      .style('font-weight', '600')
      .append('title')
      .text((d: any) => d.data.label || '');

    // Setup drag behavior
    this.drag = d3.drag()
      .on('start', (event: any, d: any) => {
        if (!this.isLocked()) {
          d3.select(event.sourceEvent.target.parentNode).classed('dragging', true);
        }
      })
      .on('drag', (event: any, d: any) => {
        if (!this.isLocked()) {
          d.x = event.y;
          d.y = event.x;
          d3.select(event.sourceEvent.target.parentNode)
            .attr('transform', `translate(${d.y},${d.x})`);
          
          // Update links
          this.zoomGroup.selectAll('.link')
            .attr('d', d3.linkHorizontal<any, any>()
              .x((d: any) => d.y)
              .y((d: any) => d.x));
        }
      })
      .on('end', (event: any) => {
        d3.select(event.sourceEvent.target.parentNode).classed('dragging', false);
      });

    // Apply drag to nodes
    node.call(this.drag as any);
    
    // Update cursor style based on lock state
    this.updateNodeCursors();

    // Zoom behavior
    this.zoom = d3.zoom()
      .scaleExtent([0.25, 3])
      .filter((event: any) => {
        // When locked, prevent all mouse-based pan/zoom interactions
        // Programmatic zoom (from buttons) bypasses filter
        if (this.isLocked()) {
          return false;
        }
        return true;
      })
      .on('zoom', (event: any) => {
        this.zoomGroup.attr('transform', `translate(${margin.left + event.transform.x},${margin.top + event.transform.y}) scale(${event.transform.k})`);
      });

    this.svg.call(this.zoom);
  }

  private updateNodeCursors(): void {
    if (this.zoomGroup) {
      this.zoomGroup.selectAll('.node')
        .classed('draggable', !this.isLocked())
        .style('cursor', this.isLocked() ? 'default' : 'move');
    }
  }

  private getColor(type: string): string {
    const colors: Record<string, string> = {
      'system': '#fef3c7',
      'release': '#e0e7ff',
      'env': '#dbeafe',
      'sub-release': '#d1fae5',
      'test': '#e9d5ff',
      'stage': '#f0f9ff'
    };
    return colors[type] || '#f3f4f6';
  }

  zoomIn(): void {
    if (this.svg) {
      this.svg.transition().duration(300).call(this.zoom.scaleBy, 1.3);
    }
  }

  zoomOut(): void {
    if (this.svg) {
      this.svg.transition().duration(300).call(this.zoom.scaleBy, 0.7);
    }
  }

  fitToScreen(): void {
    if (this.svg) {
      this.svg.transition().duration(300).call(this.zoom.transform, d3.zoomIdentity);
    }
  }

  toggleLock(): void {
    this.isLocked.update(v => !v);
    this.updateNodeCursors();
  }

  advanceSelectedStage(): void {
    if (this.selectedNode && this.isStageNode(this.selectedNode)) {
      const productId = this.getProductIdFromNode(this.selectedNode);
      if (productId) {
        this.advanceStage.emit(productId);
      }
    }
  }

  editSelectedStageDate(): void {
    if (this.selectedNode && this.isStageNode(this.selectedNode)) {
      const productId = this.getProductIdFromNode(this.selectedNode);
      const stageIndex = this.getStageIndexFromNode(this.selectedNode);
      if (productId !== null && stageIndex !== null) {
        this.editStageDate.emit({ productId, stageIndex });
      }
    }
  }

  addSelectedAttachment(): void {
    if (this.selectedNode && this.isStageNode(this.selectedNode)) {
      const productId = this.getProductIdFromNode(this.selectedNode);
      const stageIndex = this.getStageIndexFromNode(this.selectedNode);
      if (productId !== null && stageIndex !== null) {
        this.addAttachment.emit({ productId, stageIndex });
      }
    }
  }

  canAdvanceStage(): boolean {
    if (!this.selectedNode || !this.release || !this.workflow) return false;
    
    const productId = this.getProductIdFromNode(this.selectedNode);
    if (!productId) return false;

    const currentState = this.release.product_workflow_states?.[productId];
    if (!currentState) return false;

    // Can advance if not at the last stage
    return currentState.current_stage_index < this.workflow.stages.length - 1;
  }

  closeActions(): void {
    this.selectedNode = null;
  }

  private isStageNode(node: ReleaseNode): boolean {
    return node.type === 'stage';
  }

  private getProductIdFromNode(node: ReleaseNode): string | null {
    // Extract product ID from node ID (format: productId-stage-index)
    const parts = node.id.split('-stage-');
    return parts.length > 0 ? parts[0] : null;
  }

  private getStageIndexFromNode(node: ReleaseNode): number | null {
    // Extract stage index from node ID (format: productId-stage-index)
    const parts = node.id.split('-stage-');
    return parts.length > 1 ? parseInt(parts[1], 10) : null;
  }
}
