import {Injectable} from '@angular/core';
import {Category} from '../models/interfaces';
import {ApiServiceService} from 'src/app/services/product-service.service';
import {AccountServiceService} from 'src/app/services/account-service.service';
import {ProductOrderService} from 'src/app/services/product-order-service.service';
import {ProductInventoryServiceService} from 'src/app/services/product-inventory-service.service';
import {environment} from 'src/environments/environment';
import {components} from "../models/product-catalog";
import {InvoicesService} from "./invoices-service";

type ProductOffering = components["schemas"]["ProductOffering"];

@Injectable({
  providedIn: 'root'
})
export class PaginationService {
  PRODUCT_LIMIT: number = environment.PRODUCT_LIMIT;
  CATALOG_LIMIT: number = environment.CATALOG_LIMIT;

  constructor(
    private api: ApiServiceService,
    private accountService: AccountServiceService,
    private orderService: ProductOrderService,
    private inventoryService: ProductInventoryServiceService,
    private invoicesService: InvoicesService
  ) { }

  async getItemsPaginated(page:number, pageSize:any, next:boolean, items:any[], nextItems:any[], options:any,
    handler: (...params: any[]) => Promise<any>): Promise<any> {

      console.log('options')
      console.log(options)

    let exhausted = false;
    try {
      let params: any[] = [page];
      if("keywords" in options){
        params.push(options.keywords)
      }

      if("filters" in options){
        params.push(options.filters)
      }
      if("partyId" in options && options.partyId != null){
        params.push(options.partyId.toString())
      }
      if("catalogId" in options && options.catalogId != null){
        params.push(options.catalogId.toString())
      }
      if("sort" in options){
        params.push(options.sort)
      }
      if("isBundle" in options){
        params.push(options.isBundle)
      }
      if("selectedDate" in options){
        params.push(options.selectedDate)
      }
      if("orders" in options){
        params.push(options.orders)
      }
      if("role" in options){
        params.push(options.role)
      }
      if("actionFilters" in options){
        params.push(options.actionFilters)
      }

      if(!next){
        items=[];
        nextItems=[];
        page=0;
        params[0]=page;

        console.log('------ Calling handler')
        console.log(params)
        let data = await handler(...params)
        items=data;
        page=page+pageSize;

        exhausted = !!options.stopOnShortPage && data.length < pageSize;

      } else {
        for(let i=0; i<nextItems.length; i++){
          items.push(nextItems[i])
        }

        exhausted = !!options.stopOnShortPage && nextItems.length < pageSize;
        if (exhausted) {
          nextItems=[];
        }
      }

      if (!exhausted) {
        params[0]=page;
        let data = await handler(...params)
        nextItems = data;
        page = page + pageSize;
      }

    } catch(err) {
      console.log(err)
    } finally {
      let page_check = nextItems.some(item => item != null);

      let info = {
        "page": page,
        "items": items,
        "nextItems": nextItems,
        "page_check": page_check
      }

      return info
    }
  }

  async getProducts(page: number, keywords: any, filters?: Category[], sort?: any): Promise<ProductOffering[]> {
    try {
      console.log('-------------------------- getProducts ----------------------------');
      // Get data from API
      const productOfferings: ProductOffering[] = filters && filters.length > 0
        ? await this.api.getProductsByCategory(filters, page, keywords, sort)
        : await this.api.getProducts(page, keywords, sort);
        return productOfferings

    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async getProductsByCatalog(page: number, keywords: any, filters?: Category[], id?: any): Promise<ProductOffering[]> {
    try {
      console.log('-------------------------- getProductsByCatalog ----------------------------');
      console.log(page)
      // Get data from API
      const productOfferings: ProductOffering[] = filters && filters.length > 0
        ? await this.api.getProductsByCategoryAndCatalog(filters, id, page, keywords)
        : await this.api.getProductsByCatalog(id, page, keywords);
        return productOfferings

    } catch (error) {
      console.error('Error fetching products:', error);
      return []; // Returns [] if error
    }
  }

  async getOrders(page: number, filters: Category[], partyId: any, orders: any[], role: any, actionFilters: string[] = []): Promise<any[]> {
    try {
      // Get Orders
      orders = await this.orderService.getProductOrders(partyId, page, filters, role, actionFilters);
      console.log('getOrders', orders);
      // Obtener todas las cuentas de facturación en paralelo
      const billingAccounts = await Promise.all(orders.map(order => this.accountService.getBillingAccountById(order.billingAccount.id)));

      // Procesar los pedidos en paralelo
      const ordersWithDetails = await Promise.all(orders.map(async (order, i) => {
        // Obtener detalles de los productos en paralelo
        const items = await Promise.all(order.productOrderItem.map(async (productOrderItem:any) => {
          try {
            console.log('Soy un productOrderItem???????: ', productOrderItem);
            const offer = await this.api.getProductById(productOrderItem.productOffering.id);
            const spec = await this.api.getProductSpecification(offer.productSpecification.id);

            if (!offer.productOfferingPrice || offer.productOfferingPrice.length === 0) {
              return {
                id: offer.id,
                name: offer.name,
                category: offer.category,
                description: offer.description,
                lastUpdate: offer.lastUpdate,
                attachment: spec.attachment,
                productSpecification: offer.productSpecification,
                productOfferingTerm: offer.productOfferingTerm,
                version: offer.version,
                productOrderItem
              };
            }

            let result: any = {}
            result = {
              id: offer.id,
              name: offer.name,
              category: offer.category,
              description: offer.description,
              lastUpdate: offer.lastUpdate,
              attachment: spec.attachment,
              productSpecification: offer.productSpecification,
              productOfferingTerm: offer.productOfferingTerm,
              version: offer.version,
              productOrderItem
            };

            if(offer.productOfferingPrice?.[0]) {
              const prodprice = await this.api.getProductPrice(offer.productOfferingPrice[0].id);
              result['productOfferingPrice'] = prodprice
              if(prodprice.priceType) result['priceType'] = prodprice.priceType;
            }
            return result;
          } catch (error) {
            console.error(`Error fetching product details for ${productOrderItem.id}:`, error);
            return null; // Manejo de errores sin detener toda la ejecución
          }
        }));

        return {
          ...order,
          billingAccount: billingAccounts[i],
          productOrderItems: items.filter(Boolean) // Filtra productos nulos en caso de error
        };
      }));

      console.log('Orders processed:', ordersWithDetails);
      return ordersWithDetails;
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

    async getOffers(inventory: any[]): Promise<any[]> {
      const results = await Promise.allSettled(
        inventory.map(async (item) => {
          const offering = await this.api.getProductById(item.productOffering.id);
          const productSpec = await this.api.getProductSpecification(offering.productSpecification.id);

          item['product'] = {
            id: item.id,
            name: offering.name,
            category: offering.category,
            description: offering.description,
            lastUpdate: offering.lastUpdate,
            attachment: productSpec?.attachment ?? [],
            productSpecification: offering.productSpecification,
            productOfferingTerm: offering.productOfferingTerm,
            version: offering.version
          };
          return item;
        })
      );

      return results
        .filter((r): r is PromiseFulfilledResult<any> => {
          if (r.status === 'rejected') {
            console.error('Error fetching offer:', r.reason);
            return false;
          }
          return true;
        })
        .map(r => r.value);
    }

  async getInventory(page: number, keywords: any, filters: Category[], partyId: any): Promise<any[]> {
    try {
      console.log('Fetching inventory...');

      // Obtener inventario desde el servicio
      const data = await this.inventoryService.getInventory(page, partyId, filters, keywords);
      console.log('Inventory received:', data);

      // Obtener ofertas del inventario
      return await this.getOffers(data);

    } catch (error) {
      console.error('Error fetching inventory:', error);
      return []; // Retornar un array vacío en caso de error
    }
  }

  async getInvoices(page:number, filters:Category[], partyId:any, selectedDate:any, role:any): Promise<any[]> {
    console.log("---getInvoices---")
    let invoices = []
    try{
      invoices = await this.invoicesService.getInvoices(partyId,page,filters,selectedDate,role)
    } finally {
      console.log("params:", partyId,page,filters,selectedDate,role)
      console.log("---getInvoices result:---", invoices)
      console.log(invoices)
      return invoices
    }
  }
}
