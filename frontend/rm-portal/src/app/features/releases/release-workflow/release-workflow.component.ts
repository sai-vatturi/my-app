import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, input, ViewChild, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPlus, heroMinus, heroArrowsPointingOut, heroLockClosed, heroLockOpen } from '@ng-icons/heroicons/outline';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import * as d3 from 'd3';

export interface ReleaseNode {
  id: string;
  label: string;
  type: 'system' | 'release' | 'env' | 'sub-release' | 'test';
  children?: ReleaseNode[];
}

@Component({
  selector: 'app-release-workflow',
  standalone: true,
  imports: [CommonModule, NgIconComponent, ButtonComponent],
  providers: [provideIcons({ heroPlus, heroMinus, heroArrowsPointingOut, heroLockClosed, heroLockOpen })],
  templateUrl: './release-workflow.component.html',
  styles: [`
    :host {
      display: block;
      position: relative;
    }
    .workflow-container {
      position: relative;
      width: 100%;
      height: 500px;
      overflow: hidden;
      background: linear-gradient(90deg, rgba(200,200,200,.1) 1px, transparent 1px),
                  linear-gradient(rgba(200,200,200,.1) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .toolbar {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 10;
      display: flex;
      gap: 0.5rem;
      background: white;
      padding: 0.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReleaseWorkflowComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  
  @ViewChild('svgContainer', { static: false }) svgContainer!: ElementRef<HTMLDivElement>;

  releaseData = input.required<ReleaseNode[]>();
  protected readonly isLocked = signal(false);

  private svg: any;
  private zoomBehavior: any;
  private zoomGroup: any;

  ngAfterViewInit() {
    if (this.isBrowser) {
      setTimeout(() => this.renderChart(), 0);
    }
  }

  private renderChart() {
    if (!this.svgContainer?.nativeElement) {
      return;
    }

    const container = this.svgContainer.nativeElement;
    const width = container.offsetWidth || 900;
    const height = 500;

    // Clear previous content
    d3.select(container).selectAll('svg').remove();

    this.svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    this.zoomGroup = this.svg.append('g').attr('class', 'zoom-group');

    const root = d3.hierarchy({
      id: 'root',
      label: 'Root',
      children: this.releaseData()
    } as any);

    const treeLayout = d3.tree<any>().size([height - 100, width - 200]);
    treeLayout(root);

    // Draw links
    this.zoomGroup.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 2)
      .attr('d', (d3 as any).linkHorizontal()
        .x((d: any) => d.y + 100)
        .y((d: any) => d.x + 50)
      );

    // Draw nodes
    const node = this.zoomGroup.selectAll('.node')
      .data(root.descendants().filter((d: any) => d.data.id !== 'root'))
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.y + 100},${d.x + 50})`);

    node.append('rect')
      .attr('width', 150)
      .attr('height', 50)
      .attr('x', -75)
      .attr('y', -25)
      .attr('rx', 8)
      .attr('fill', (d: any) => this.getNodeColor(d.data.type))
      .attr('stroke', '#64748b')
      .attr('stroke-width', 2);

    node.append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.label)
      .style('font-size', '14px')
      .style('fill', '#1e293b')
      .style('font-weight', '500');

    // Setup zoom
    this.zoomBehavior = d3.zoom()
      .scaleExtent([0.25, 2.5])
      .on('zoom', (event: any) => {
        if (!this.isLocked()) {
          this.zoomGroup.attr('transform', event.transform);
        }
      });

    this.svg.call(this.zoomBehavior);
  }

  private getNodeColor(type: string): string {
    const colors: Record<string, string> = {
      system: '#fef3c7',
      release: '#e0e7ff',
      env: '#dbeafe',
      'sub-release': '#d1fae5',
      test: '#e9d5ff'
    };
    return colors[type] || '#f5f5f5';
  }

  zoomIn() {
    this.svg?.transition().call(this.zoomBehavior.scaleBy, 1.2);
  }

  zoomOut() {
    this.svg?.transition().call(this.zoomBehavior.scaleBy, 0.8);
  }

  fitToScreen() {
    this.svg?.transition().call(this.zoomBehavior.transform, d3.zoomIdentity);
  }

  toggleLock() {
    this.isLocked.update(v => !v);
  }
}
