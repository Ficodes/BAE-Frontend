import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class quoteGuardGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean {
    if (!environment.QUOTES_ENABLED) {
      this.router.navigate(['/dashboard']);  // redirect somewhere safe
      return false;
    }
    return true;
  }
}
