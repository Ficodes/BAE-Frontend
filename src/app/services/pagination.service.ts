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

    try {
      let params: any[] = [page];
      if("keywords" in options){
        params.push(options.keywords)
      }

      if("filters" in options){
        params.push(options.filters)
      }
      if("partyId" in options){
        params.push(options.partyId.toString())
      }
      if("catalogId" in options){
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

      if(next == false){
        items=[];
        nextItems=[];
        page=0;
        params[0]=page;

        console.log('------ Calling handler')
        console.log(params)
        let data = await handler(...params)
        items=data;
        page=page+pageSize;

      } else {
        for(let i=0; i<nextItems.length; i++){
          items.push(nextItems[i])
        }
      }

      params[0]=page;
      let data = await handler(...params)
      nextItems = data;
      page=page+pageSize;

    } catch(err) {
      console.log(err)
    } finally {
      let page_check=true;
      if(nextItems.length>0){
        page_check=true;
      } else {
        page_check=false;
      }

      let info = {
        "page": page,
        "items": items,
        "nextItems": nextItems,
        "page_check": page_check
      }

      return info
    }
  }

  /*
  async getProducts(page:number,keywords:any,filters?:Category[]): Promise<ProductOffering[]> {
    let products:ProductOffering[]=[];
    try{
      if(filters)
      if(filters.length == 0){
        let data = await this.api.getProducts(page,keywords)
        //GET PRODUCT INNER INFO
        for(let i=0; i < data.length; i++){
            let attachment: any[]= []
            let spec = await this.api.getProductSpecification(data[i].productSpecification.id)
            attachment = spec.attachment
            let prodPrices: any[] | undefined= data[i].productOfferingPrice;
            let prices: any[]=[];
            if(prodPrices!== undefined){
              if(prodPrices.length>0){
                for(let j=0; j < prodPrices.length; j++){
                  let price = await this.api.getProductPrice(prodPrices[j].id)
                  prices.push(price);
                  if(j+1==prodPrices?.length){
                    products.push(
                      {
                        id: data[i].id,
                        name: data[i].name,
                        category: data[i].category,
                        description: data[i].description,
                        lastUpdate: data[i].lastUpdate,
                        attachment: attachment,
                        productOfferingPrice: prices,
                        productSpecification: data[i].productSpecification,
                        productOfferingTerm: data[i].productOfferingTerm,
                        version: data[i].version
                      }
                    )
                  }
                }
              } else {
                products.push(
                  {
                    id: data[i].id,
                    name: data[i].name,
                    category: data[i].category,
                    description: data[i].description,
                    lastUpdate: data[i].lastUpdate,
                    attachment: attachment,
                    productOfferingPrice: prices,
                    productSpecification: data[i].productSpecification,
                    productOfferingTerm: data[i].productOfferingTerm,
                    version: data[i].version
                  }
                )
              }
            } else {
              products.push(
                {
                  id: data[i].id,
                  name: data[i].name,
                  category: data[i].category,
                  description: data[i].description,
                  lastUpdate: data[i].lastUpdate,
                  attachment: attachment,
                  productOfferingPrice: prices,
                  productSpecification: data[i].productSpecification,
                  productOfferingTerm: data[i].productOfferingTerm,
                  version: data[i].version
                }
              )
            }
          }
      } else {
        let data = await this.api.getProductsByCategory(filters,page,keywords)
          for(let i=0; i < data.length; i++){
            let attachment: any[]= []
            let spec = await this.api.getProductSpecification(data[i].productSpecification.id)
            attachment = spec.attachment
            let prodPrices: any[] | undefined= data[i].productOfferingPrice;
            let prices: any[]=[];
            if(prodPrices!== undefined){
              if(prodPrices.length>0){
                for(let j=0; j < prodPrices.length; j++){
                  let price = await this.api.getProductPrice(prodPrices[j].id)
                  prices.push(price);
                  if(j+1==prodPrices?.length){
                    products.push(
                      {
                        id: data[i].id,
                        name: data[i].name,
                        category: data[i].category,
                        description: data[i].description,
                        lastUpdate: data[i].lastUpdate,
                        attachment: attachment,
                        productOfferingPrice: prices,
                        productSpecification: data[i].productSpecification,
                        productOfferingTerm: data[i].productOfferingTerm,
                        version: data[i].version
                      }
                    )
                  }
                }
              } else {
                products.push(
                  {
                    id: data[i].id,
                    name: data[i].name,
                    category: data[i].category,
                    description: data[i].description,
                    lastUpdate: data[i].lastUpdate,
                    attachment: attachment,
                    productOfferingPrice: prices,
                    productSpecification: data[i].productSpecification,
                    productOfferingTerm: data[i].productOfferingTerm,
                    version: data[i].version
                  }
                )
              }
            } else {
              products.push(
                {
                  id: data[i].id,
                  name: data[i].name,
                  category: data[i].category,
                  description: data[i].description,
                  lastUpdate: data[i].lastUpdate,
                  attachment: attachment,
                  productOfferingPrice: prices,
                  productSpecification: data[i].productSpecification,
                  productOfferingTerm: data[i].productOfferingTerm,
                  version: data[i].version
                }
              )
          }
        }
      }
    } finally {
      return products
    }
  } */

  async getProducts(page: number, keywords: any, filters?: Category[]): Promise<ProductOffering[]> {
    try {
      console.log('-------------------------- getProducts ----------------------------');
      // Get data from API
      const productOfferings: ProductOffering[] = filters && filters.length > 0
        ? await this.api.getProductsByCategory(filters, page, keywords)
        : await this.api.getProducts(page, keywords);

      // Get Product Details in parallel
      return await Promise.all(
        productOfferings.map(async (offer): Promise<ProductOffering> => {
          try {
            // Getting specs and prices in parallel
            const [spec, prodPrices] = await Promise.all([
              offer.productSpecification?.id
                ? this.api.getProductSpecification(offer.productSpecification.id)
                : Promise.resolve(undefined),
              offer.productOfferingPrice
                ? Promise.all(offer.productOfferingPrice.map(p => this.api.getProductPrice(p.id)))
                : Promise.resolve([])
            ]);

            // Building `ProductOffering` object
            return {
              id: offer.id,
              href: offer.href,
              name: offer.name,
              description: offer.description,
              isBundle: offer.isBundle,
              isSellable: offer.isSellable,
              lastUpdate: offer.lastUpdate,
              lifecycleStatus: offer.lifecycleStatus,
              statusReason: offer.statusReason,
              version: offer.version,
              agreement: offer.agreement ?? [],
              attachment: spec?.attachment ?? [],
              bundledProductOffering: offer.bundledProductOffering ?? [],
              category: offer.category ?? [],
              channel: offer.channel ?? [],
              marketSegment: offer.marketSegment ?? [],
              place: offer.place ?? [],
              prodSpecCharValueUse: offer.prodSpecCharValueUse ?? [],
              productOfferingPrice: prodPrices ?? [],
              productOfferingRelationship: offer.productOfferingRelationship ?? [],
              productOfferingTerm: offer.productOfferingTerm ?? [],
              productSpecification: spec ?? offer.productSpecification,
              resourceCandidate: offer.resourceCandidate,
              serviceCandidate: offer.serviceCandidate,
              serviceLevelAgreement: offer.serviceLevelAgreement,
              validFor: offer.validFor,
              "@baseType": offer["@baseType"],
              "@schemaLocation": offer["@schemaLocation"],
              "@type": offer["@type"]
            };
          } catch (error) {
            console.error(`Error processing product ${offer.id}:`, error);
            return offer; // If error returns the original offer
          }
        })
      );

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
        ? await this.api.getProductsByCategoryAndCatalog(filters, id, page)
        : await this.api.getProductsByCatalog(id, page);

      // Process product offerings in parallel
      return await Promise.all(
        productOfferings.map(async (offer): Promise<ProductOffering> => {
          try {
            // Getting specs and prices in parallel
            const [spec, prodPrices] = await Promise.all([
              offer.productSpecification?.id
                ? this.api.getProductSpecification(offer.productSpecification.id)
                : Promise.resolve(undefined),
              offer.productOfferingPrice
                ? Promise.all(offer.productOfferingPrice.map(p => this.api.getProductPrice(p.id)))
                : Promise.resolve([])
            ]);

            return {
              id: offer.id,
              name: offer.name,
              category: offer.category ?? [],
              description: offer.description,
              lastUpdate: offer.lastUpdate,
              attachment: spec?.attachment ?? [],
              productOfferingPrice: prodPrices ?? [],
              productSpecification: offer.productSpecification,
              productOfferingTerm: offer.productOfferingTerm ?? [],
              version: offer.version
            };
          } catch (error) {
            console.error(`Error processing product ${offer.id}:`, error);
            return offer; // If error returns the original offer
          }
        })
      );
    } catch (error) {
      console.error('Error fetching products:', error);
      return []; // Returns [] if error
    }
  }


  /*
  async getProductsByCatalog(page:number,keywords:any,filters?:Category[],id?:any): Promise<ProductOffering[]> {
    let products:ProductOffering[]=[];
    try{
      if(filters)
      if(filters.length == 0){
        let data = await this.api.getProductsByCatalog(id,page)
        for(let i=0; i < data.length; i++){
            let attachment: any[]= []
            let spec = await this.api.getProductSpecification(data[i].productSpecification.id)
            attachment = spec.attachment
            let prodPrices: any[] | undefined= data[i].productOfferingPrice;
            let prices: any[]=[];
            if(prodPrices!== undefined){
              if(prodPrices.length>0){
                for(let j=0; j < prodPrices.length; j++){
                  let price = await this.api.getProductPrice(prodPrices[j].id)
                  prices.push(price);
                  if(j+1==prodPrices?.length){
                    products.push(
                      {
                        id: data[i].id,
                        name: data[i].name,
                        category: data[i].category,
                        description: data[i].description,
                        lastUpdate: data[i].lastUpdate,
                        attachment: attachment,
                        productOfferingPrice: prices,
                        productSpecification: data[i].productSpecification,
                        productOfferingTerm: data[i].productOfferingTerm,
                        version: data[i].version
                      }
                    )
                  }
                }
              } else {
                products.push(
                  {
                    id: data[i].id,
                    name: data[i].name,
                    category: data[i].category,
                    description: data[i].description,
                    lastUpdate: data[i].lastUpdate,
                    attachment: attachment,
                    productOfferingPrice: prices,
                    productSpecification: data[i].productSpecification,
                    productOfferingTerm: data[i].productOfferingTerm,
                    version: data[i].version
                  })
              }
            } else {
              products.push(
                {
                  id: data[i].id,
                  name: data[i].name,
                  category: data[i].category,
                  description: data[i].description,
                  lastUpdate: data[i].lastUpdate,
                  attachment: attachment,
                  productOfferingPrice: prices,
                  productSpecification: data[i].productSpecification,
                  productOfferingTerm: data[i].productOfferingTerm,
                  version: data[i].version
                }
              )
            }
        }
      } else {
        let data = await this.api.getProductsByCategoryAndCatalog(filters,id,page)
        for(let i=0; i < data.length; i++){
          let attachment: any[]= []
          let spec = await this.api.getProductSpecification(data[i].productSpecification.id)
          attachment = spec.attachment
          let prodPrices: any[] | undefined= data[i].productOfferingPrice;
          let prices: any[]=[];
          if(prodPrices!== undefined){
            if(prodPrices.length>0){
              for(let j=0; j < prodPrices.length; j++){
                let price = await this.api.getProductPrice(prodPrices[j].id)
                prices.push(price);
                if(j+1==prodPrices?.length){
                  products.push(
                    {
                      id: data[i].id,
                      name: data[i].name,
                      category: data[i].category,
                      description: data[i].description,
                      lastUpdate: data[i].lastUpdate,
                      attachment: attachment,
                      productOfferingPrice: prices,
                      productSpecification: data[i].productSpecification,
                      productOfferingTerm: data[i].productOfferingTerm,
                      version: data[i].version
                    }
                  )
                }
              }
            } else {
              products.push(
                {
                  id: data[i].id,
                  name: data[i].name,
                  category: data[i].category,
                  description: data[i].description,
                  lastUpdate: data[i].lastUpdate,
                  attachment: attachment,
                  productOfferingPrice: prices,
                  productSpecification: data[i].productSpecification,
                  productOfferingTerm: data[i].productOfferingTerm,
                  version: data[i].version
                }
              )
            }
          } else {
            products.push(
              {
                id: data[i].id,
                name: data[i].name,
                category: data[i].category,
                description: data[i].description,
                lastUpdate: data[i].lastUpdate,
                attachment: attachment,
                productOfferingPrice: prices,
                productSpecification: data[i].productSpecification,
                productOfferingTerm: data[i].productOfferingTerm,
                version: data[i].version
              }
            )
          }
        }
      }
    } catch (err) {
      console.log(err)
    } finally {
      return products
    }
  }*/

  /*async getOrders(page:number,filters:Category[],partyId:any,selectedDate:any,orders:any[],role:any): Promise<any[]> {
    try{
      orders = await this.orderService.getProductOrders(partyId,page,filters,selectedDate,role)
      for(let i=0;i<orders.length;i++){
        let items:any[] = [];
        let bill = await this.accountService.getBillingAccountById(orders[i].billingAccount.id)
        for(let j=0;j<orders[i].productOrderItem.length;j++){
          let item = await this.api.getProductById(orders[i].productOrderItem[j].id)
          let spec  = await this.api.getProductSpecification(item.productSpecification.id)
          if(item.productOfferingPrice == undefined ||  item.productOfferingPrice.length == 0){
            items.push({
              id: item.id,
              name: item.name,
              category: item.category,
              description: item.description,
              lastUpdate: item.lastUpdate,
              attachment: spec.attachment,
              productSpecification: item.productSpecification,
              productOfferingTerm: item.productOfferingTerm,
              version: item.version
            })
          } else {
            let prodprice = await this.api.getProductPrice(item.productOfferingPrice[0].id)
            items.push({
              id: item.id,
              name: item.name,
              category: item.category,
              description: item.description,
              lastUpdate: item.lastUpdate,
              attachment: spec.attachment,
              productOfferingPrice: {
                "price": prodprice.price.value,
                "unit": prodprice.price.unit,
                "priceType": prodprice.priceType,
                "text": prodprice.unitOfMeasure != undefined ? '/'+prodprice.unitOfMeasure.units : prodprice.recurringChargePeriodType
              },
              productSpecification: item.productSpecification,
              productOfferingTerm: item.productOfferingTerm,
              version: item.version
            })
          }
        }
        orders[i]['billingAccount']=bill;
        orders[i].productOrderItem=items;
      }
    } finally {
      console.log('finally')
      console.log(orders)
      return orders
    }
  }*/

  async getOrders(page: number, filters: Category[], partyId: any, selectedDate: any, orders: any[], role: any): Promise<any[]> {
    try {
      // Get Orders
      orders = await this.orderService.getProductOrders(partyId, page, filters, selectedDate, role);
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
      try {
        // Process inventory items concurrently
        const processedInventory = await Promise.all(
          inventory.map(async (item) => {
            const offering = await this.api.getProductById(item.productOffering.id);
            const productSpec = await this.api.getProductSpecification(offering.productSpecification.id);
            
            // Attachments
            const attachments = productSpec?.attachment ?? [];
    
            // Construct product object
            item['product'] = {
              id: item.id,
              name: offering.name,
              category: offering.category,
              description: offering.description,
              lastUpdate: offering.lastUpdate,
              attachment: attachments,
              productSpecification: offering.productSpecification,
              productOfferingTerm: offering.productOfferingTerm,
              version: offering.version
            };
            return item;
          })
        );
    
        return processedInventory;
      } catch (error) {
        console.error("Error fetching offers:", error);
        throw error;
      }
    }
  
  /*
  async getInventory(page:number,keywords:any,filters:Category[],partyId:any): Promise<any[]>{
    let inv:any[]=[]
    try {
      let data = await this.inventoryService.getInventory(page,partyId,filters,keywords)
      console.log('inv request')
      console.log(data)
      inv = await this.getOffers(data);
    } finally {
      return inv
    }
  }*/

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
