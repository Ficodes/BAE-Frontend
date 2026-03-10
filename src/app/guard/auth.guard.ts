import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import {LocalStorageService} from "../services/local-storage.service";
import { Observable } from 'rxjs';
import { LoginInfo } from '../models/interfaces';
import * as moment from 'moment';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {

  constructor(private localStorage: LocalStorageService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    const requiredRoles = route.data['roles'] as Array<string>;
    let userRoles: string[] = [];

    const roleMapper:any = {
      'admin': environment.ADMIN_ROLE.toLowerCase(),
      'seller': environment.SELLER_ROLE.toLowerCase(),
      'buyer': environment.BUYER_ROLE.toLowerCase(),
      'orgAdmin': environment.ORG_ADMIN_ROLE.toLowerCase(),
      'certifier': environment.CERTIFIER_ROLE.toLowerCase(),
      'individual': 'individual'
    }

    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as == aux.id){
        userRoles.push('individual')
        aux.roles.forEach((role: any) => userRoles.push(role.name.toLowerCase()))
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        loggedOrg.roles.forEach((role: any) => userRoles.push(role.name.toLowerCase()))

        if(aux.roles.some(role => role.name.toLowerCase() === environment.ADMIN_ROLE.toLowerCase())){
          userRoles.push(environment.ADMIN_ROLE.toLowerCase())
        }
      }
    } else {
      this.router.navigate(['/dashboard']);
      return false;
    }

    if (requiredRoles.length != 0) {
      const hasRequiredRoles = requiredRoles.some((role: any) => {
        return userRoles.includes(roleMapper[role]);
      });

      if (!hasRequiredRoles) {
        this.router.navigate(['/dashboard']);  // Navigate to an access denied page or login page
        return false;
      }
    }
    
    return true;
  }
}
