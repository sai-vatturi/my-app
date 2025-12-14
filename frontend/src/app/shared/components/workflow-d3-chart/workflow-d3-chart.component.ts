import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, ElementRef, ViewChild, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { WorkflowTemplate, WorkflowStage } from '../../../core/models/workflow.model';
import { Release, ReleaseProduct } from '../../../core/models/release.model';
import { Product } from '../../../core/models/product.model';

interface WorkflowNode {
  id: string;
  label: string;
  type: 'release' | 'product' | 'stage';
  status?: 'completed' | 'current' | 'upcoming';
  deadline?: string;
  children?: WorkflowNode[];
}

@Component({
  selector: 'app-workflow-d3-chart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workflow-d3-chart.component.html',
  styleUrls: ['./workflow-d3-chart.component.scss']
})
export class WorkflowD3ChartComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;
  @Input() release?: Release;
  @Input() workflow!: WorkflowTemplate;
  @Input() products?: Product[];
  @Input() productMap?: Map<string, string>;
  @Output() advanceStage = new EventEmitter<{ productId: string; stageOrder: number }>();
  @Output() editStageDate = new EventEmitter<{ productId: string; stageOrder: number }>();
  @Output() addAttachment = new EventEmitter<{ productId: string; stageOrder: number }>();
  @Output() productClicked = new EventEmitter<string>();
  @Output() stageClicked = new EventEmitter<{
    productId: string,
    stageOrder: number,
    event: MouseEvent,
    element: HTMLElement
  }>();

  private svg: any;
  private zoom: any;
  private zoomGroup: any;
  private width = 1200;
  private height = 600;
  isLocked = signal(false);
  private animationIntervals: any[] = [];

  workflowData = computed(() => {
    // If release is provided, show release -> products -> stages (horizontal for stages)
    if (this.release && this.workflow) {
      const sortedStages = [...this.workflow.stages].sort((a, b) => a.order - b.order);
      const productNodes: WorkflowNode[] = [];

      this.release.products.forEach((product, idx) => {
        const productName = this.productMap?.get(product.product_id) || product.product_id;
        const workflowStates = product.workflow_states || {};

        const stageNodes: WorkflowNode[] = sortedStages.map(stage => {
          const state = workflowStates[stage.order.toString()] || null;
          let status: 'completed' | 'current' | 'upcoming' = 'upcoming';

          if (state?.status) {
            status = 'completed';
          } else {
            // Find first incomplete stage
            const firstIncomplete = sortedStages.find(s => {
              const sState = workflowStates[s.order.toString()];
              return !sState || !sState.status;
            });
            if (firstIncomplete?.order === stage.order) {
              status = 'current';
            }
          }

          return {
            id: `product-${idx}-stage-${stage.order}`,
            label: stage.name,
            type: 'stage',
            status,
            deadline: state?.deadline
          } as WorkflowNode;
        });

        productNodes.push({
          id: `product-${idx}`,
          label: productName,
          type: 'product',
          children: stageNodes
        });
      });

      return {
        id: 'release',
        label: this.release.name,
        type: 'release',
        children: productNodes
      } as WorkflowNode;
    }

    // If only workflow is provided (for workflow management page), show workflow -> stages directly
    if (this.workflow && !this.release) {
      const sortedStages = [...this.workflow.stages].sort((a, b) => a.order - b.order);
      const stageNodes: WorkflowNode[] = sortedStages.map(stage => ({
        id: `stage-${stage.order}`,
        label: stage.name,
        type: 'stage'
      }));

      return {
        id: 'workflow',
        label: this.workflow.name,
        type: 'release',
        children: stageNodes  // Direct children, no intermediate "Stages" node
      } as WorkflowNode;
    }

    return null;
  });

  ngOnInit(): void {
    if (this.workflowData()) {
      this.renderChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['release'] || changes['workflow'] || changes['productMap']) && this.workflowData()) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.animationIntervals.forEach(interval => clearInterval(interval));
    this.animationIntervals = [];
  }

  renderChart(): void {
    const data = this.workflowData();
    if (!data) return;

    const element = this.chartContainer.nativeElement;
    if (!element) return;

    // Clear any existing animation intervals
    this.animationIntervals.forEach(interval => clearInterval(interval));
    this.animationIntervals = [];

    d3.select(element).selectAll('svg').remove();

    this.width = element.offsetWidth || 1200;
    if (this.release && this.release.products) {
      // For release view with products, calculate height based on number of products
      // Reduced padding since we removed release box
      this.height = Math.max(element.offsetHeight || 600, this.release.products.length * 180 + 50);
    } else {
      // For workflow-only view, use container height or default
      this.height = element.offsetHeight || 400;
    }

    this.svg = d3.select(element)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('background', '#ffffff');

    // Add ruler/grid pattern
    const defs = this.svg.append('defs');

    // Create grid pattern
    const gridPattern = defs.append('pattern')
      .attr('id', 'grid')
      .attr('width', 20)
      .attr('height', 20)
      .attr('patternUnits', 'userSpaceOnUse');

    gridPattern.append('rect')
      .attr('width', 20)
      .attr('height', 20)
      .attr('fill', '#ffffff');

    gridPattern.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 20)
      .attr('y2', 0)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1);

    gridPattern.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', 20)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1);

    this.svg.append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'url(#grid)');

    this.zoomGroup = this.svg.append('g').attr('class', 'zoom-group');

    // For release view with products, use custom layout (horizontal stages)
    if (this.release && this.workflow) {
      this.renderReleaseView(data);
    } else {
      // For workflow-only view, use tree layout
      this.renderWorkflowView(data);
    }

    // Setup zoom
    this.zoom = d3.zoom()
      .scaleExtent([0.25, 2.5])
      .on('zoom', (event: any) => {
        if (!this.isLocked()) {
          this.zoomGroup.attr('transform', event.transform);
        }
      });

    this.svg.call(this.zoom);

    // Reset zoom to identity (no transform) to ensure content is visible
    this.svg.call(this.zoom.transform, d3.zoomIdentity);
  }

  renderReleaseView(data: WorkflowNode): void {
    const sortedStages = [...this.workflow.stages].sort((a, b) => a.order - b.order);
    const nodeWidth = 150;
    const nodeHeight = 60;
    const spacing = 20; // Consistent spacing between all boxes
    const productSpacing = 180;

    const productsCount = this.release!.products.length;

    // Start products from the left side (no release box)
    const startX = 200;
    const branchStartY = 100;
    const branchEndY = branchStartY + (productsCount - 1) * productSpacing;

    // Draw vertical branch line connecting all products (if multiple)
    if (productsCount > 1) {
      this.zoomGroup.append('line')
        .attr('x1', startX)
        .attr('y1', branchStartY)
        .attr('x2', startX)
        .attr('y2', branchEndY)
        .attr('stroke', '#9ca3af')
        .attr('stroke-width', 2);
    }

    // Draw products and their stages horizontally
    this.release!.products.forEach((product, productIdx) => {
      const productName = this.productMap?.get(product.product_id) || product.product_id;
      const workflowStates = product.workflow_states || {};
      const productY = branchStartY + productIdx * productSpacing;
      const productX = startX + spacing; // Start after branch point

      // Draw horizontal line from branch to product (if multiple products)
      if (productsCount > 1) {
        this.zoomGroup.append('line')
          .attr('x1', startX)
          .attr('y1', productY)
          .attr('x2', productX - nodeWidth / 2)
          .attr('y2', productY)
          .attr('stroke', '#9ca3af')
          .attr('stroke-width', 2);
      }

      // Draw product node
      const productGroup = this.zoomGroup.append('g')
        .attr('class', 'product-node')
        .attr('transform', `translate(${productX}, ${productY})`)
        .style('cursor', 'pointer')
        .on('click', (event: any) => {
          event.stopPropagation();
          this.productClicked.emit(product.product_id);
        });

      productGroup.append('rect')
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('x', -nodeWidth / 2)
        .attr('y', -nodeHeight / 2)
        .attr('fill', '#fefce8')  // Light yellow background
        .attr('stroke', '#9ca3af')
        .attr('stroke-width', 2);

      // Product text with truncation
      const maxProductTextWidth = nodeWidth - 20;
      let displayProductText = productName;
      const tempProductText = productGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 5)
        .text(displayProductText)
        .style('font-size', '14px')
        .style('font-weight', 'normal')
        .style('fill', '#1f2937')
        .style('opacity', 0);

      const productTextWidth = (tempProductText.node() as SVGTextElement)?.getBBox().width || 0;
      if (productTextWidth > maxProductTextWidth) {
        let truncated = productName;
        while (truncated.length > 0) {
          tempProductText.text(truncated + '...');
          const width = (tempProductText.node() as SVGTextElement)?.getBBox().width || 0;
          if (width <= maxProductTextWidth) break;
          truncated = truncated.slice(0, -1);
        }
        displayProductText = truncated + (truncated.length < productName.length ? '...' : '');
      }
      tempProductText.remove();

      productGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 5)
        .text(displayProductText)
        .style('font-size', '14px')
        .style('font-weight', 'normal')
        .style('fill', '#1f2937');

      // Draw stages horizontally from product
      // Calculate all stage widths and statuses first
      const stageData: Array<{ width: number; status: 'completed' | 'current' | 'upcoming' }> = [];
      sortedStages.forEach((stage) => {
        const state = workflowStates[stage.order.toString()] || null;
        let status: 'completed' | 'current' | 'upcoming' = 'upcoming';

        if (state?.status) {
          status = 'completed';
        } else {
          const firstIncomplete = sortedStages.find(s => {
            const sState = workflowStates[s.order.toString()];
            return !sState || !sState.status;
          });
          if (firstIncomplete?.order === stage.order) {
            status = 'current';
          }
        }

        // Calculate stage box width based on text size
        const tempText = this.zoomGroup.append('text')
          .attr('text-anchor', 'middle')
          .text(stage.name)
          .style('font-size', '14px')
          .style('opacity', 0);

        const textWidth = (tempText.node() as SVGTextElement)?.getBBox().width || 0;
        tempText.remove();

        // Enlarge box if text is too large (minimum width is nodeWidth, add padding)
        const actualStageWidth = Math.max(nodeWidth, textWidth + 30);
        stageData.push({ width: actualStageWidth, status });
      });

      // Start first stage after product box with proper spacing
      // First stage's left edge should be at: productX + nodeWidth / 2 + spacing
      // So first stage's center should be at: productX + nodeWidth / 2 + spacing + firstStageWidth / 2
      const firstStageWidth = stageData[0]?.width || nodeWidth;
      let stageX = productX + nodeWidth / 2 + spacing + firstStageWidth / 2;

      sortedStages.forEach((stage, stageIdx) => {
        const { width: actualStageWidth, status } = stageData[stageIdx];

        const state = workflowStates[stage.order.toString()] || null;

        // Stage box with dynamic width
        const stageGroup = this.zoomGroup.append('g')
          .attr('class', 'stage-node')
          .attr('transform', `translate(${stageX}, ${productY})`);

        // Stage box with dynamic width
        const stageRect = stageGroup.append('rect')
          .attr('width', actualStageWidth)
          .attr('height', nodeHeight)
          .attr('x', -actualStageWidth / 2)
          .attr('y', -nodeHeight / 2)
          .attr('fill', this.getStageColor(status))
          .attr('stroke', this.getStageBorderColor(status))
          .attr('stroke-width', 2);

        // Add text - bold only for current stage
        stageGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', 5)
          .text(stage.name)
          .style('font-size', '14px')
          .style('font-weight', status === 'current' ? 'bold' : 'normal')
          .style('fill', '#1f2937');

        // Status indicator circle (Removed in favor of icons/background, but keeping the circle for the icon background if needed, or just icons)
        // Original code had a circle here. We replaced it with icon logic but broke the chain.
        // Let's add a small circle background for the icon if it's a status icon

        stageGroup.append('circle')
          .attr('cx', actualStageWidth / 2 - 12)
          .attr('cy', -nodeHeight / 2 + 12)
          .attr('r', 8) // Slightly larger for icon bg
          .attr('fill', this.getStatusColor(status))
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);

        // Attachment Icon Logic
        const requiresAttachment = stage.requires_attachment;
        const isMandatory = stage.attachment_mandatory;
        const hasAttachment = !!state?.attachment_id;

        if (requiresAttachment) {
          // Determine Styles - Seamless look
          let fill = '#fff';
          let stroke = '#d1d5db'; // gray-300
          let strokeWidth = 1.5; // Match status circle
          let iconColor = '#9ca3af'; // gray-400

          if (hasAttachment) {
            fill = '#10b981'; // Green (Uploaded)
            stroke = '#10b981';
            iconColor = '#ffffff';
          } else if (isMandatory) {
            fill = '#fee2e2'; // Light Red
            stroke = '#ef4444'; // Red
            iconColor = '#ef4444';
          } else {
            fill = '#fef9c3'; // Light Yellow
            stroke = '#eab308'; // Yellow
            iconColor = '#ca8a04';
          }

          // Position: Left of the status circle
          // Status circle is at: actualStageWidth / 2 - 12
          // Radius = 8. Gap = 4. Offset = 12 + 16 + 4 = 32.
          const attachGroup = stageGroup.append('g')
            .attr('transform', `translate(${actualStageWidth / 2 - 32}, ${-nodeHeight / 2 + 12})`);

          // Circle (Same size as status circle)
          attachGroup.append('circle')
            .attr('r', 8)
            .attr('fill', fill)
            .attr('stroke', stroke)
            .attr('stroke-width', strokeWidth);

          // Clip Icon (SVG Path for perfect alignment)
          // Path visual center analysis: X ≈ 8, Y ≈ 12
          // Scale: 0.55 (Increased size)
          // Translate X: -8 * 0.55 = -4.4
          // Translate Y: -12 * 0.55 = -6.6
          attachGroup.append('path')
            .attr('d', 'M12.5 7.5v8a4.5 4.5 0 0 1-9 0v-8a2.5 2.5 0 0 1 5 0v8a.5.5 0 0 1-1 0v-8a1.5 1.5 0 0 0-3 0v8a3.5 3.5 0 0 0 7 0v-8a2.5 2.5 0 0 0-5 0v8a1 1 0 0 0 2 0v-8a.5.5 0 0 1 1 0')
            .attr('transform', 'translate(-4.4, -6.6) scale(0.55)')
            .attr('stroke', iconColor)
            .attr('stroke-width', 1.4) // Reduced stroke for cleaner look
            .attr('fill', 'none')
            .attr('stroke-linecap', 'round');
        }

        // Status Icon Logic (Existing)
        let statusIconType = '';
        if (status === 'completed') statusIconType = 'check';
        else if (status === 'current') statusIconType = 'loading';

        if (statusIconType) {
          const iconGroup = stageGroup.append('g')
            .attr('transform', `translate(${actualStageWidth / 2 - 12}, ${-nodeHeight / 2 + 12})`);

          if (statusIconType === 'check') {
            iconGroup.append('path')
              .attr('d', 'M-3 0 L-1 2 L3 -2')
              .attr('stroke', 'white')
              .attr('stroke-width', 1.5)
              .attr('fill', 'none');
          }
          // Loading spinner could be added here if we had an animation, 
          // but for now the 'current' status has a pulsing border/blue color.
        }

        // Add Click Interaction
        stageGroup
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            event.stopPropagation();
            this.stageClicked.emit({
              productId: product.product_id,
              stageOrder: stage.order,
              event: event,
              element: (event.target as Element).getBoundingClientRect() as any
            });
          })
          .on('mouseover', function (this: SVGElement, event: MouseEvent) {
            d3.select(this).select('rect').attr('filter', 'brightness(0.95)');
          })
          .on('mouseout', function (this: SVGElement, event: MouseEvent) {
            d3.select(this).select('rect').attr('filter', null);
          });

        // Connection line to next stage (straight line)
        if (stageIdx < sortedStages.length - 1) {
          const isCurrent = status === 'current';
          const nextStageWidth = stageData[stageIdx + 1]?.width || nodeWidth;
          // Calculate next stage center position
          const nextStageX = stageX + actualStageWidth / 2 + spacing + nextStageWidth / 2;
          // Line from current stage right edge to next stage left edge
          const line = this.zoomGroup.append('line')
            .attr('x1', stageX + actualStageWidth / 2)
            .attr('y1', productY)
            .attr('x2', nextStageX - nextStageWidth / 2)
            .attr('y2', productY)
            .attr('stroke', isCurrent ? '#3b82f6' : '#9ca3af')
            .attr('stroke-width', isCurrent ? 3 : 2);

          if (isCurrent) {
            // Animated dashed line for current stage
            line.attr('stroke-dasharray', '5,5');
            let dashOffset = 0;
            const interval = setInterval(() => {
              dashOffset = (dashOffset - 1) % 10;
              line.attr('stroke-dashoffset', dashOffset);
            }, 50);
            this.animationIntervals.push(interval);
          }

          // Move to next stage position (center of next stage)
          stageX = nextStageX;
        }
      });
    });
  }

  renderWorkflowView(data: WorkflowNode): void {
    const sortedStages = [...this.workflow.stages].sort((a, b) => a.order - b.order);
    const nodeWidth = 150;
    const nodeHeight = 60;
    const spacing = 20; // Consistent spacing

    // Calculate all stage widths first
    const stageWidths: number[] = [];
    sortedStages.forEach((stage) => {
      const tempText = this.zoomGroup.append('text')
        .attr('text-anchor', 'middle')
        .text(stage.name)
        .style('font-size', '14px')
        .style('opacity', 0);
      const textWidth = (tempText.node() as SVGTextElement)?.getBBox().width || 0;
      tempText.remove();
      const actualStageWidth = Math.max(nodeWidth, textWidth + 30);
      stageWidths.push(actualStageWidth);
    });

    // Calculate total width needed: workflow box + spacing + all stages
    const totalContentWidth = nodeWidth + spacing + stageWidths.reduce((sum, width, idx) =>
      sum + width + (idx < stageWidths.length - 1 ? spacing : 0), 0
    );

    // Start workflow from left with padding, centered if content is smaller than container
    const padding = 50;
    const workflowX = totalContentWidth < this.width
      ? Math.max(padding, (this.width - totalContentWidth) / 2)
      : padding;
    const workflowY = this.height / 2;

    // Draw workflow node
    const workflowGroup = this.zoomGroup.append('g')
      .attr('class', 'workflow-node')
      .attr('transform', `translate(${workflowX}, ${workflowY})`);

    workflowGroup.append('rect')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('fill', '#ede9fe')  // Light violet background
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 2);

    // Workflow text with truncation
    const maxTextWidth = nodeWidth - 20;
    let workflowText = data.label;
    const tempWorkflowText = workflowGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .text(workflowText)
      .style('font-size', '14px')
      .style('font-weight', 'normal')
      .style('fill', '#1f2937')
      .style('opacity', 0);

    const workflowTextWidth = (tempWorkflowText.node() as SVGTextElement)?.getBBox().width || 0;
    if (workflowTextWidth > maxTextWidth) {
      let truncated = data.label;
      while (truncated.length > 0) {
        tempWorkflowText.text(truncated + '...');
        const width = (tempWorkflowText.node() as SVGTextElement)?.getBBox().width || 0;
        if (width <= maxTextWidth) break;
        truncated = truncated.slice(0, -1);
      }
      workflowText = truncated + (truncated.length < data.label.length ? '...' : '');
    }
    tempWorkflowText.remove();

    workflowGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .text(workflowText)
      .style('font-size', '14px')
      .style('font-weight', 'normal')
      .style('fill', '#1f2937');

    // Draw horizontal line from workflow to stages
    const stagesStartX = workflowX + nodeWidth / 2 + spacing;
    this.zoomGroup.append('line')
      .attr('x1', workflowX + nodeWidth / 2)
      .attr('y1', workflowY)
      .attr('x2', stagesStartX)
      .attr('y2', workflowY)
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 2);

    // Start first stage after workflow box with proper spacing
    // First stage's left edge should be at: workflowX + nodeWidth / 2 + spacing
    // So first stage's center should be at: workflowX + nodeWidth / 2 + spacing + firstStageWidth / 2
    const firstStageWidth = stageWidths[0] || nodeWidth;
    let stageX = stagesStartX + firstStageWidth / 2;

    sortedStages.forEach((stage, stageIdx) => {
      const actualStageWidth = stageWidths[stageIdx];

      const stageGroup = this.zoomGroup.append('g')
        .attr('class', 'stage-node')
        .attr('transform', `translate(${stageX}, ${workflowY})`);

      // Stage box with dynamic width
      stageGroup.append('rect')
        .attr('width', actualStageWidth)
        .attr('height', nodeHeight)
        .attr('x', -actualStageWidth / 2)
        .attr('y', -nodeHeight / 2)
        .attr('fill', '#f3f4f6')
        .attr('stroke', '#9ca3af')
        .attr('stroke-width', 2);

      stageGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 5)
        .text(stage.name)
        .style('font-size', '14px')
        .style('font-weight', 'normal')
        .style('fill', '#1f2937');

      // Connection line to next stage
      if (stageIdx < sortedStages.length - 1) {
        const nextStageWidth = stageWidths[stageIdx + 1] || nodeWidth;
        // Calculate next stage center position
        const nextStageX = stageX + actualStageWidth / 2 + spacing + nextStageWidth / 2;
        // Line from current stage right edge to next stage left edge
        this.zoomGroup.append('line')
          .attr('x1', stageX + actualStageWidth / 2)
          .attr('y1', workflowY)
          .attr('x2', nextStageX - nextStageWidth / 2)
          .attr('y2', workflowY)
          .attr('stroke', '#9ca3af')
          .attr('stroke-width', 2);

        // Move to next stage position (center of next stage)
        stageX = nextStageX;
      }
    });
  }

  getColor(data: WorkflowNode): string {
    switch (data.type) {
      case 'release': return '#e0e7ff';  // Light indigo instead of dark
      case 'product': return '#f3f4f6';  // Light gray
      case 'stage':
        if (data.status === 'completed') return '#d1fae5';
        if (data.status === 'current') return '#dbeafe';
        return '#f3f4f6';
      default: return '#f3f4f6';
    }
  }

  getStageColor(status: 'completed' | 'current' | 'upcoming'): string {
    switch (status) {
      case 'completed': return '#d1fae5';  // Light green
      case 'current': return '#dbeafe';    // Light blue
      default: return '#f3f4f6';          // Light gray
    }
  }

  getStageBorderColor(status: 'completed' | 'current' | 'upcoming'): string {
    switch (status) {
      case 'completed': return '#10b981';  // Green
      case 'current': return '#3b82f6';    // Blue
      default: return '#9ca3af';           // Gray
    }
  }

  getStatusColor(status: 'completed' | 'current' | 'upcoming'): string {
    switch (status) {
      case 'completed': return '#10b981';
      case 'current': return '#3b82f6';
      default: return '#d1d5db';
    }
  }

  zoomIn(): void {
    this.svg.transition().call(this.zoom.scaleBy, 1.2);
  }

  zoomOut(): void {
    this.svg.transition().call(this.zoom.scaleBy, 0.8);
  }

  fitToScreen(): void {
    this.svg.transition().call(this.zoom.transform, d3.zoomIdentity);
  }

  toggleLock(): void {
    this.isLocked.update(v => !v);
  }
}
