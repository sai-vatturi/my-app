import * as d3 from 'd3';
import { WorkflowNode, StageClickEvent } from './models';
import { WorkflowTemplate } from '../../../../core/models/workflow.model';
import { Release, ReleaseProduct } from '../../../../core/models/release.model';

export class WorkflowRenderer {
    private svg: any;
    private zoom: any;
    private zoomGroup: any;
    private width = 1200;
    private height = 600;
    private animationIntervals: any[] = [];

    // Callbacks
    onProductClick?: (productId: string) => void;
    onStageClick?: (event: StageClickEvent) => void;

    constructor(private containerElement: HTMLElement) { }

    public get isInitialized(): boolean {
        return !!this.svg;
    }

    public initialize(width?: number, height?: number): void {
        // Clear existing
        this.cleanup();

        this.width = width || this.containerElement.offsetWidth || 1200;
        this.height = height || this.containerElement.offsetHeight || 600;

        this.svg = d3.select(this.containerElement)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('background', '#ffffff');

        this.setupGrid();
        this.zoomGroup = this.svg.append('g').attr('class', 'zoom-group');
        this.setupZoom();
    }

    public render(
        data: WorkflowNode,
        release: Release | undefined,
        workflow: WorkflowTemplate,
        productMap: Map<string, string> | undefined,
        isLocked: boolean
    ): void {
        if (!this.svg) this.initialize();

        // Clear previous content in zoomGroup
        this.zoomGroup.selectAll('*').remove();
        this.clearAnimations();

        // Recalculate height based on data
        if (release && release.products) {
            this.height = Math.max(this.containerElement.offsetHeight || 600, release.products.length * 180 + 50);
        } else {
            this.height = this.containerElement.offsetHeight || 400;
        }
        this.svg.attr('height', this.height).attr('viewBox', `0 0 ${this.width} ${this.height}`);

        if (release && workflow) {
            this.renderReleaseView(data, release, workflow, productMap);
        } else {
            this.renderWorkflowView(data, workflow);
        }

        // Update zoom lock state if needed (handled in zoom event primarily, but good to store)
        this.isZoomLocked = isLocked;
    }

    private isZoomLocked = false;

    public setZoomLock(locked: boolean) {
        this.isZoomLocked = locked;
    }

    public zoomIn() {
        if (this.svg && this.zoom) this.svg.transition().call(this.zoom.scaleBy, 1.2);
    }

    public zoomOut() {
        if (this.svg && this.zoom) this.svg.transition().call(this.zoom.scaleBy, 0.8);
    }

    public fitToScreen() {
        if (this.svg && this.zoom) this.svg.transition().call(this.zoom.transform, d3.zoomIdentity);
    }

    public cleanup(): void {
        this.clearAnimations();
        d3.select(this.containerElement).selectAll('svg').remove();
        this.svg = null;
    }

    private clearAnimations() {
        this.animationIntervals.forEach(interval => clearInterval(interval));
        this.animationIntervals = [];
    }

    private setupGrid() {
        const defs = this.svg.append('defs');
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
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', 20).attr('y2', 0)
            .attr('stroke', '#e5e7eb').attr('stroke-width', 1);

        gridPattern.append('line')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', 0).attr('y2', 20)
            .attr('stroke', '#e5e7eb').attr('stroke-width', 1);

        this.svg.append('rect')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('fill', 'url(#grid)');
    }

    private setupZoom() {
        this.zoom = d3.zoom()
            .scaleExtent([0.25, 2.5])
            .on('zoom', (event: any) => {
                if (!this.isZoomLocked) {
                    this.zoomGroup.attr('transform', event.transform);
                }
            });

        this.svg.call(this.zoom);
        this.svg.call(this.zoom.transform, d3.zoomIdentity);
    }


    private renderReleaseView(
        data: WorkflowNode,
        release: Release,
        workflow: WorkflowTemplate,
        productMap: Map<string, string> | undefined
    ): void {
        const sortedStages = [...workflow.stages].sort((a, b) => a.order - b.order);
        const nodeWidth = 150;
        const nodeHeight = 60;
        const spacing = 20;
        const productSpacing = 180;

        const productsCount = release.products.length;

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
        release.products.forEach((product, productIdx) => {
            const productName = productMap?.get(product.product_id) || product.product_id;
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
                    if (this.onProductClick) this.onProductClick(product.product_id);
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
            const firstStageWidth = stageData[0]?.width || nodeWidth;
            let stageX = productX + nodeWidth / 2 + spacing + firstStageWidth / 2;

            sortedStages.forEach((stage, stageIdx) => {
                const { width: actualStageWidth, status } = stageData[stageIdx];
                const state = workflowStates[stage.order.toString()] || null;

                // Stage box with dynamic width
                const stageGroup = this.zoomGroup.append('g')
                    .attr('class', 'stage-node')
                    .attr('transform', `translate(${stageX}, ${productY})`);

                // Check for Overdue
                const deadline = state?.deadline;
                let isOverdue = false;
                if (deadline && status !== 'completed') {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // compare dates only
                    const dDate = new Date(deadline);
                    dDate.setHours(0, 0, 0, 0);
                    if (dDate < today) {
                        isOverdue = true;
                    }
                }

                // Stage box with dynamic width
                stageGroup.append('rect')
                    .attr('width', actualStageWidth)
                    .attr('height', nodeHeight)
                    .attr('x', -actualStageWidth / 2)
                    .attr('y', -nodeHeight / 2)
                    .attr('fill', this.getStageColor(status))
                    .attr('stroke', isOverdue ? '#f87171' : this.getStageBorderColor(status)) // Softer red (red-400)
                    .attr('stroke-width', isOverdue ? 2.5 : 2); // Thicker border for overdue

                // Add text - bold only for current stage
                stageGroup.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', 5)
                    .text(stage.name)
                    .style('font-size', '14px')
                    .style('font-weight', status === 'current' ? 'bold' : 'normal')
                    .style('fill', '#1f2937');

                // Product Name (User Request: "respective product name in the top left corner in small light text")
                if (productName) {
                    stageGroup.append('text')
                        .attr('x', -actualStageWidth / 2 + 5) // Left aligned with padding
                        .attr('y', -nodeHeight / 2 - 8)       // Above the box
                        .text(productName)
                        .style('font-size', '10px')
                        .style('fill', '#6b7280') // Light gray
                        .style('text-anchor', 'start');
                }

                // Deadline (User Request: "outside and bottom left", same color as product name)
                if (deadline) {
                    // format date - assuming ISO string YYYY-MM-DD
                    const dateObj = new Date(deadline);
                    const formattedDate = !isNaN(dateObj.getTime())
                        ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : deadline;

                    stageGroup.append('text')
                        .attr('x', -actualStageWidth / 2 + 5) // Left aligned
                        .attr('y', nodeHeight / 2 + 12)       // Below the box (outside)
                        .text(formattedDate) // Just the date
                        .style('font-size', '10px')
                        .style('fill', isOverdue ? '#f87171' : '#6b7280') // Softer red if overdue, else gray like product
                        .style('font-weight', isOverdue ? 'bold' : 'normal')
                        .style('text-anchor', 'start');
                }

                // Status indicator circle background
                stageGroup.append('circle')
                    .attr('cx', actualStageWidth / 2 - 12)
                    .attr('cy', -nodeHeight / 2 + 12)
                    .attr('r', 8)
                    .attr('fill', this.getStatusColor(status))
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1);

                // Attachment Icon Logic
                const requiresAttachment = stage.requires_attachment;
                const isMandatory = stage.attachment_mandatory;
                const hasAttachment = !!state?.attachment_id;

                if (requiresAttachment) {
                    let fill = '#fff';
                    let stroke = '#d1d5db';
                    let strokeWidth = 1.5;
                    let iconColor = '#9ca3af';

                    if (hasAttachment) {
                        fill = '#10b981';
                        stroke = '#10b981';
                        iconColor = '#ffffff';
                    } else if (isMandatory) {
                        fill = '#fee2e2';
                        stroke = '#ef4444';
                        iconColor = '#ef4444';
                    } else {
                        fill = '#fef9c3';
                        stroke = '#eab308';
                        iconColor = '#ca8a04';
                    }

                    const attachGroup = stageGroup.append('g')
                        .attr('transform', `translate(${actualStageWidth / 2 - 32}, ${-nodeHeight / 2 + 12})`);

                    attachGroup.append('circle')
                        .attr('r', 8)
                        .attr('fill', fill)
                        .attr('stroke', stroke)
                        .attr('stroke-width', strokeWidth);

                    attachGroup.append('path')
                        .attr('d', 'M12.5 7.5v8a4.5 4.5 0 0 1-9 0v-8a2.5 2.5 0 0 1 5 0v8a.5.5 0 0 1-1 0v-8a1.5 1.5 0 0 0-3 0v8a3.5 3.5 0 0 0 7 0v-8a2.5 2.5 0 0 0-5 0v8a1 1 0 0 0 2 0v-8a.5.5 0 0 1 1 0')
                        .attr('transform', 'translate(-4.4, -6.6) scale(0.55)')
                        .attr('stroke', iconColor)
                        .attr('stroke-width', 1.4)
                        .attr('fill', 'none')
                        .attr('stroke-linecap', 'round');
                }

                // Status Icon Logic
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
                }

                // Add Click Interaction
                // We must capture 'this' for hover effects, but arrow function for click uses class method
                const that = this;
                stageGroup
                    .style('cursor', 'pointer')
                    .on('click', (event: MouseEvent) => {
                        event.stopPropagation();
                        if (that.onStageClick) {
                            that.onStageClick({
                                productId: product.product_id,
                                stageOrder: stage.order,
                                event: event,
                                element: (event.target as Element).getBoundingClientRect() as any
                            });
                        }
                    })
                    .on('mouseover', function (this: SVGElement, event: MouseEvent) {
                        d3.select(this).select('rect').attr('filter', 'brightness(0.95)');
                    })
                    .on('mouseout', function (this: SVGElement, event: MouseEvent) {
                        d3.select(this).select('rect').attr('filter', null);
                    });

                // Connection line to next stage
                if (stageIdx < sortedStages.length - 1) {
                    const isCurrent = status === 'current';
                    const nextStageWidth = stageData[stageIdx + 1]?.width || nodeWidth;
                    const nextStageX = stageX + actualStageWidth / 2 + spacing + nextStageWidth / 2;

                    const line = this.zoomGroup.append('line')
                        .attr('x1', stageX + actualStageWidth / 2)
                        .attr('y1', productY)
                        .attr('x2', nextStageX - nextStageWidth / 2)
                        .attr('y2', productY)
                        .attr('stroke', isCurrent ? '#3b82f6' : '#9ca3af')
                        .attr('stroke-width', isCurrent ? 3 : 2);

                    if (isCurrent) {
                        // Dash animation
                        line.attr('stroke-dasharray', '5,5');
                        let dashOffset = 0;
                        const interval = setInterval(() => {
                            dashOffset = (dashOffset - 1) % 10;
                            line.attr('stroke-dashoffset', dashOffset);
                        }, 50);
                        this.animationIntervals.push(interval);
                    }

                    stageX = nextStageX;
                }
            });
        });
    }

    private renderWorkflowView(data: WorkflowNode, workflow: WorkflowTemplate): void {
        const sortedStages = [...workflow.stages].sort((a, b) => a.order - b.order);
        const nodeWidth = 150;
        const nodeHeight = 60;
        const spacing = 20;

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

        const totalContentWidth = nodeWidth + spacing + stageWidths.reduce((sum, width, idx) =>
            sum + width + (idx < stageWidths.length - 1 ? spacing : 0), 0
        );

        const padding = 50;
        const workflowX = totalContentWidth < this.width
            ? Math.max(padding, (this.width - totalContentWidth) / 2)
            : padding;
        const workflowY = this.height / 2;

        const workflowGroup = this.zoomGroup.append('g')
            .attr('class', 'workflow-node')
            .attr('transform', `translate(${workflowX}, ${workflowY})`);

        workflowGroup.append('rect')
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('x', -nodeWidth / 2)
            .attr('y', -nodeHeight / 2)
            .attr('fill', '#ede9fe')
            .attr('stroke', '#9ca3af')
            .attr('stroke-width', 2);

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

        const stagesStartX = workflowX + nodeWidth / 2 + spacing;
        this.zoomGroup.append('line')
            .attr('x1', workflowX + nodeWidth / 2)
            .attr('y1', workflowY)
            .attr('x2', stagesStartX)
            .attr('y2', workflowY)
            .attr('stroke', '#9ca3af')
            .attr('stroke-width', 2);

        const firstStageWidth = stageWidths[0] || nodeWidth;
        let stageX = stagesStartX + firstStageWidth / 2;

        sortedStages.forEach((stage, stageIdx) => {
            const actualStageWidth = stageWidths[stageIdx];

            const stageGroup = this.zoomGroup.append('g')
                .attr('class', 'stage-node')
                .attr('transform', `translate(${stageX}, ${workflowY})`);

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

            if (stageIdx < sortedStages.length - 1) {
                const nextStageWidth = stageWidths[stageIdx + 1] || nodeWidth;
                const nextStageX = stageX + actualStageWidth / 2 + spacing + nextStageWidth / 2;
                this.zoomGroup.append('line')
                    .attr('x1', stageX + actualStageWidth / 2)
                    .attr('y1', workflowY)
                    .attr('x2', nextStageX - nextStageWidth / 2)
                    .attr('y2', workflowY)
                    .attr('stroke', '#9ca3af')
                    .attr('stroke-width', 2);
                stageX = nextStageX;
            }
        });
    }

    private getStageColor(status: 'completed' | 'current' | 'upcoming'): string {
        switch (status) {
            case 'completed': return '#d1fae5';
            case 'current': return '#dbeafe';
            default: return '#f3f4f6';
        }
    }

    private getStageBorderColor(status: 'completed' | 'current' | 'upcoming'): string {
        switch (status) {
            case 'completed': return '#10b981';
            case 'current': return '#3b82f6';
            default: return '#9ca3af';
        }
    }

    private getStatusColor(status: 'completed' | 'current' | 'upcoming'): string {
        switch (status) {
            case 'completed': return '#10b981';
            case 'current': return '#3b82f6';
            default: return '#d1d5db';
        }
    }
}
