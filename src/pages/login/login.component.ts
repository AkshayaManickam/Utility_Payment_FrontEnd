import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router'; 
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  otpForm: FormGroup;
  isOtpGenerated = false;
  email: string = '';

    constructor(
      private fb: FormBuilder,
      private router: Router,
      private toastr: ToastrService,
      private authService: AuthService
    ) {
      this.loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
      });

      this.otpForm = this.fb.group({
        otp: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      });
    }

    ngOnInit(): void {

      window.addEventListener('storage', (event) => {
        if (event.key === 'logout-event') {
          localStorage.clear();
          sessionStorage.clear();
          this.router.navigate(['/login']);
        }
      });
  
      this.authService.isLoggedIn().subscribe({
        next: (response: any) => {
          if (response.isLoggedIn) {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          console.log('Not logged in or session expired');
        }
      });
  
    }

    generateOtp() {
      console.log('generateOtp() function is triggered');
  
      if (this.loginForm.valid) {
        this.email = this.loginForm.value.email;
  
        this.authService.generateOtp(this.email).subscribe(
          (otpResponse) => {
            if (otpResponse.message === 'User already has an active session.') {
              this.toastr.warning(otpResponse.message, 'Session Active');
            } else if (otpResponse.message === 'OTP Sent Successfully') {
              this.isOtpGenerated = true;
              this.otpForm.patchValue({ otp: otpResponse.otp });
              this.toastr.success(`OTP has been sent! OTP: ${otpResponse.otp}`, 'Success');
            }
          },
          (error) => {
            if (error.status === 409 && error.error?.message === 'User already has an active session.') {
              this.toastr.warning(error.error.message, 'Session Conflict');
            } else {
              this.toastr.error('Error generating OTP. Try again!', 'Error');
            }
            console.error('OTP Generation Error:', error);
          }
        );
      } else {
        this.toastr.warning('Please enter a valid email.', 'Warning');
      }
    }
  

  verifyOtp() {
  if (this.otpForm.valid) {
    const enteredOtp = this.otpForm.value.otp;
    this.authService.verifyOtp(this.email, enteredOtp).subscribe(
      (response) => {
        console.log('OTP verification response:', response);  
        if (response.valid) {
          this.toastr.success('Login successful!', 'Success');
          localStorage.setItem('sessionId', response.sessionId); 
          console.log(response.sessionId);
          localStorage.setItem('userId', response.userId); 
          console.log('User ID set in localStorage:', response.userId);
          localStorage.setItem('userEmail', this.email);
          console.log(this.email);
          this.router.navigate(['/dashboard']);
          console.log("Hii");
        } else {
          this.toastr.error('Invalid OTP! Try Again.', 'Error');
        }
      },
      (error) => {
        console.error('Error verifying OTP:', error);  
        this.toastr.error('Error verifying OTP. Try again!', 'Error');
      }
    );
  } else {
    this.toastr.warning('Please enter a valid 6-digit OTP.', 'Warning');
  }
}

}
