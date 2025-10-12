import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.loginForm.getRawValue();
    
    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.router.navigateByUrl('/releases');
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Login failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
