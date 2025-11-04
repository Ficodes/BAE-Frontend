import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import {LocalStorageService} from "../services/local-storage.service";
import { Observable } from 'rxjs';
import { LoginInfo } from '../models/interfaces';
import * as moment from 'moment';

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
    let userRoles: string | any[] = [];

    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as == aux.id){
        userRoles.push('individual')
        for(let i=0; i < aux.roles.length; i++){
          userRoles.push(aux.roles[i].name)
        }
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        for(let i=0;i<loggedOrg.roles.length;i++){
          userRoles.push(loggedOrg.roles[i].name)
        }
        if(aux.roles.some(role => role.name === 'admin')){
          userRoles.push('admin')
        }
      }
    } else {
      this.router.navigate(['/dashboard']);
      return false;
    }

    if (requiredRoles.length != 0) {
      const hasRequiredRoles = requiredRoles.some(role => userRoles.includes(role));

      if (!hasRequiredRoles) {
        this.router.navigate(['/dashboard']);  // Navigate to an access denied page or login page
        return false;
      }
    }
    
    return true;
  }
}
