import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {catchError, lastValueFrom, map, of} from 'rxjs';
import { Category, LoginInfo } from '../models/interfaces';
import { environment } from 'src/environments/environment';
import {components} from "../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import {LocalStorageService} from "./local-storage.service";
import * as moment from 'moment';
import { jwtDecode } from "jwt-decode";

@Injectable({
  providedIn: 'root'
})
export class ApiServiceService {
  public static BASE_URL: String = environment.BASE_URL;
  public static API_PRODUCT: String = environment.PRODUCT_CATALOG;
  public static PRODUCT_LIMIT: number = environment.PRODUCT_LIMIT;
  public static CATALOG_LIMIT: number= environment.CATALOG_LIMIT;
  public static CATEGORY_LIMIT: number = environment.CATEGORY_LIMIT;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  getProducts(page:any,keywords:any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering?limit=${ApiServiceService.PRODUCT_LIMIT}&offset=${page}&lifecycleStatus=Launched`;
    if(keywords!=undefined){
      url=url+'&keyword='+keywords;
    }

    return lastValueFrom(this.http.get<any[]>(url));
  }

  getProductsByCategory(ids:Category[],page:any,keywords:any) {
    let id_str='';
    for(let i = 0; i < ids.length; i++){
      if(i == 0){
        id_str = 'category.id=' + ids[i].id
      } else {
        id_str = id_str + ',' + ids[i].id
      }
    }

    const baseUrl = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering`;
    const query = `limit=${ApiServiceService.PRODUCT_LIMIT}&offset=${page}&lifecycleStatus=Launched`;

    // Add the ID string only when some categories are selected
    let url;
    if (id_str !== '') {
      url = `${baseUrl}?${id_str}&${query}`;
    } else {
      url = `${baseUrl}?${query}`
    }
    if(keywords!=undefined){
      url=url+'&keyword='+keywords;
    }
    return lastValueFrom(this.http.get<any[]>(url));
  }

  getProductsByCatalog(catalogId:any,page:any){
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${catalogId}/productOffering?lifecycleStatus=Launched&limit=${ApiServiceService.PRODUCT_LIMIT}&offset=${page}`

    return lastValueFrom(this.http.get<any[]>(url));
  }

  getProductsByCategoryAndCatalog(ids:Category[],catalogId:any,page:any) {
    let id_str='';
    for(let i=0; i<ids.length;i++){
      if(i==0){
        id_str = 'category.id='+ids[i].id
      } else {
        id_str = id_str+','+ids[i].id
      }
    }
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${catalogId}/productOffering?lifecycleStatus=Launched&${id_str}&limit=${ApiServiceService.PRODUCT_LIMIT}&offset=${page}`;

    return lastValueFrom(this.http.get<any[]>(url));
  }

  getProductById(id:any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  getProductOfferByOwner(page:any,status:any[],partyId:any,sort:any,isBundle:any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering?limit=${ApiServiceService.PRODUCT_LIMIT}&offset=${page}&relatedParty=${partyId}`;

    if(sort!=undefined){
      url=url+'&sort='+sort
    }
    if(isBundle!=undefined){
      url=url+'&isBundle='+isBundle
    }
    let lifeStatus=''
    if(status.length>0){
      for(let i=0; i < status.length; i++){
        if(i==status.length-1){
          lifeStatus=lifeStatus+status[i]
        } else {
          lifeStatus=lifeStatus+status[i]+','
        }
      }
      url=url+'&lifecycleStatus='+lifeStatus;
    }

    return lastValueFrom(this.http.get<any>(url));
  }

  getProductSpecification(id:any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productSpecification/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  getProductPrice(id:any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOfferingPrice/${id}`

    return lastValueFrom(this.http.get<any>(url));
  }

  getLaunchedCategories() {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/category?limit=${ApiServiceService.CATEGORY_LIMIT}&lifecycleStatus=Launched`;

    return lastValueFrom(
      this.http.get<any[]>(url).pipe(
        catchError(error => {
          console.error("Error getting categories:", error);
          return of([]);
        })
      )
    );
  }

  getCategories(status:any[]){
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/category?limit=${ApiServiceService.CATEGORY_LIMIT}`;
    let lifeStatus=''
    if(status.length>0){
      for(let i=0; i < status.length; i++){
        if(i==status.length-1){
          lifeStatus=lifeStatus+status[i]
        } else {
          lifeStatus=lifeStatus+status[i]+','
        }
      }
      url=url+'&lifecycleStatus='+lifeStatus;
    }

    return lastValueFrom(
      this.http.get<any[]>(url).pipe(
        catchError(error => {
          console.error("Error getting categories:", error);
          return of([]);
        })
      )
    );
  }

  async getDefaultCategories() {
    let categories: any[] = [];
    if (environment.DFT_CATALOG_ID && environment.DFT_CATALOG_ID !== '') {
      // Return the default catalog categories
      const catalog = await this.getCatalog(environment.DFT_CATALOG_ID);
      if(catalog.category) {
        categories = await Promise.all(catalog.category.map(async (category: any) => {
          return this.getCategoryById(category.id)
        }));
      }
    } else {
      // Return all the launched categories
      categories = await this.getLaunchedCategories();
    }

    return categories;
  }

  getCategoryById(id:any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/category/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  getCategoriesByParentId(id:any){
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/category?parentId=${id}`;

    return lastValueFrom(this.http.get<any[]>(url));
  }

  postCategory(category:any){
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/category`;

    return this.http.post<any>(url, category);
  }

  updateCategory(category:any,id:any){
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/category/${id}`;

    return this.http.patch<any>(url, category);
  }

  getCatalogs(page:any,filter:any): Promise<any> {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog?limit=${ApiServiceService.CATALOG_LIMIT}&offset=${page}&lifecycleStatus=Launched`;
    if(filter!=undefined){
      url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog?limit=${ApiServiceService.CATALOG_LIMIT}&offset=${page}&lifecycleStatus=Launched&body=${filter}`;
    }
    console.log('getcatalogs')
    console.log(this)

    return lastValueFrom(this.http.get<any>(url));
  }

  getCatalogsByUser(page:any,filter:any,status:any[],partyId:any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog?limit=${ApiServiceService.CATALOG_LIMIT}&offset=${page}&relatedParty.id=${partyId}`;
    let lifeStatus=''
    if(status)
    if(status.length>0){
      for(let i=0; i < status.length; i++){
        if(i==status.length-1){
          lifeStatus=lifeStatus+status[i]
        } else {
          lifeStatus=lifeStatus+status[i]+','
        }
      }
      url=url+'&lifecycleStatus='+lifeStatus;
    }

    if(filter!=undefined){
      url = url+`&body=${filter}`;
    }

    return lastValueFrom(this.http.get<any>(url));
  }

  getCatalog(id:any){
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  postCatalog(catalog:any){
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog`;

    return this.http.post<any>(url, catalog);
  }

  updateCatalog(catalog:any,id:any){
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${id}`;

    return this.http.patch<any>(url, catalog);
  }

  getServiceSpec(id:any){
    let url = `${ApiServiceService.BASE_URL}/service/serviceSpecification/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  getResourceSpec(id:any){
    let url = `${ApiServiceService.BASE_URL}/resource/resourceSpecification/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  postOfferingPrice(price:any){
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOfferingPrice`;
    return this.http.post<any>(url, price);
  }

  updateOfferingPrice(price:any,id:any){
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOfferingPrice/${id}`;
    return this.http.patch<any>(url, price);
  }

  getOfferingPrice(id:any){
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOfferingPrice/${id}`;
    return lastValueFrom(this.http.get<any>(url));
  }

  postProductOffering(prod:any,catalogId:any){
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${catalogId}/productOffering`;
    return this.http.post<any>(url, prod);
  }

  updateProductOffering(prod:any,id:any){
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering/${id}`;
    return this.http.patch<any>(url, prod);
  }

  postSLA(sla:any){
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}/SLAManagement/sla`;
    return this.http.post<any>(url, sla);
  }

  getSLA(id:any){
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}/SLAManagement/sla/${id}`;
    return lastValueFrom(this.http.get<any>(url));
  }

  getComplianceLevel(prodSpec: any) {
    let level = 'NL';

    if(prodSpec.productSpecCharacteristic != undefined) {
      let vcProf = prodSpec.productSpecCharacteristic.find(((p:any) => {
        return p.name === `Compliance:VC`
      }));

      if (vcProf) {
        const vcToken: any = vcProf.productSpecCharacteristicValue?.at(0)?.value
        const decoded = jwtDecode(vcToken)
        let credential: any = null

        if ('verifiableCredential' in decoded) {
          credential = decoded.verifiableCredential;
        } else if('vc' in decoded) {
          credential = decoded.vc;
        }

        if (credential != null) {
          const subject = credential.credentialSubject;

          if ('gx:labelLevel' in subject) {
            level = subject['gx:labelLevel'];
          }
        }
      }
    }

    return level;
    //return 'BL'
    //return 'P'
    //return 'PP'
  }
}
