import { Directive, HostListener, ElementRef, OnInit, AfterViewInit } from '@angular/core';

@Directive({
    selector: '[appAutoResize]',
    standalone: true
})
export class AutoResizeDirective implements OnInit, AfterViewInit {
    constructor(private elementRef: ElementRef) { }

    @HostListener('input')
    onInput(): void {
        this.resize();
    }

    ngOnInit(): void {
    }

    ngAfterViewInit(): void {
        // Delay to let values bind
        setTimeout(() => this.resize(), 100);
    }

    resize(): void {
        const el = this.elementRef.nativeElement;
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight + 2) + 'px'; // +2 for border
    }
}
