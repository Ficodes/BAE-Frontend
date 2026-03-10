import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {BehaviorSubject, lastValueFrom, map} from 'rxjs';
import { Category, LoginInfo } from '../models/interfaces';
import { environment } from 'src/environments/environment';
import {components} from "../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import {LocalStorageService} from "./local-storage.service";
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class ShoppingCartServiceService {
  public static BASE_URL: String = environment.BASE_URL;
  public static API_CART: String = environment.SHOPPING_CART;

  private cartSubject = new BehaviorSubject<any[]>([]); // Contiene los productos del carrito
  cart$ = this.cartSubject.asObservable(); // Observable para que otros componentes se suscriban


  constructor(private http: HttpClient) { }


  async getShoppingCart(){
    let url = `${ShoppingCartServiceService.BASE_URL}${ShoppingCartServiceService.API_CART}/item/`;
    const cart = await lastValueFrom(this.http.get<any[]>(url));
    this.cartSubject.next(cart); // updates the Subject with the received cart
    return cart;
  }
  async addItemShoppingCart(item:any){
    console.log('adding to cart')
    console.log(item)
    //POST - El item va en el body de la petición
    let url = `${ShoppingCartServiceService.BASE_URL}${ShoppingCartServiceService.API_CART}/item/`;

    await lastValueFrom(this.http.post<any>(url, item));
    await this.refreshCart(); // Updates cart after operation
    // return this.http.post<any>(url, item);
  }

  async removeItemShoppingCart(id:any){
    //DELETE
    let url = `${ShoppingCartServiceService.BASE_URL}${ShoppingCartServiceService.API_CART}/item/${id}`;
    await lastValueFrom(this.http.delete<any>(url));
    await this.refreshCart(); // Actualiza el carrito tras la operación

    //return this.http.delete<any>(url);
  }

  async emptyShoppingCart(){
    console.log('removing cart')
    //POST - El item va en el body de la petición
    let url = `${ShoppingCartServiceService.BASE_URL}${ShoppingCartServiceService.API_CART}/empty/`;
    await lastValueFrom(this.http.post<any>(url, {}));
    await this.refreshCart(); // Actualiza el carrito tras la operación
    //return this.http.post<any>(url, {});
  }

  // Refreshes the shopping cart from the API
  private async refreshCart(): Promise<void> {
    const cart = await this.getShoppingCart();
    this.cartSubject.next(cart); // Emits the new cart state
  }
}
