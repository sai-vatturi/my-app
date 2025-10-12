import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit click event when clicked', () => {
    let clicked = false;
    component.clicked.subscribe(() => {
      clicked = true;
    });

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(clicked).toBe(true);
  });

  it('should not emit click when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    let clicked = false;
    component.clicked.subscribe(() => {
      clicked = true;
    });

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(clicked).toBe(false);
  });

  it('should apply correct variant classes', () => {
    fixture.componentRef.setInput('variant', 'primary');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button.className).toContain('bg-primary-600');
  });
});
