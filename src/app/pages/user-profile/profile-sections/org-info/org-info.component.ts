import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit, HostListener, OnChanges } from '@angular/core';
import { LoginInfo } from 'src/app/models/interfaces';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';
import { phoneNumbers, countries } from 'src/app/models/country.const'
import {EventMessageService} from "src/app/services/event-message.service";
import { initFlowbite } from 'flowbite';
import * as moment from 'moment';
import {components} from "../../../../models/party-catalog";
import { v4 as uuidv4 } from 'uuid';
import {getCountries, getCountryCallingCode, CountryCode} from 'libphonenumber-js'
import {parsePhoneNumber} from 'libphonenumber-js/max'
import {AttachmentServiceService} from "src/app/services/attachment-service.service";
import { NgxFileDropEntry, FileSystemFileEntry, FileSystemDirectoryEntry } from 'ngx-file-drop';
import { environment } from 'src/environments/environment';

type OrganizationUpdate = components["schemas"]["Organization_Update"];

@Component({
  selector: 'org-info',
  templateUrl: './org-info.component.html',
  styleUrl: './org-info.component.css'
})
export class OrgInfoComponent implements OnInit {
  loading: boolean = false;
  orders:any[]=[];
  profile:any;
  partyId:any='';
  token:string='';
  email:string='';
  selectedDate:any;
  isReadOnly:boolean=false;
  profileForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    website: new FormControl(''),
    description: new FormControl(''),
    country: new FormControl('',[Validators.required]),
  });
  mediumForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'), Validators.maxLength(320)]),
    country: new FormControl('', Validators.maxLength(250)),
    city: new FormControl('', Validators.maxLength(250)),
    stateOrProvince: new FormControl('', Validators.maxLength(250)),
    postCode: new FormControl('', Validators.maxLength(250)),
    street: new FormControl('', Validators.maxLength(1000)),
    telephoneNumber: new FormControl(''),
    telephoneType: new FormControl('Mobile')
  });
  contactmediums:any[]=[];
  emailSelected:boolean=true;
  addressSelected:boolean=false;
  phoneSelected:boolean=false;
  prefixes: any[] = phoneNumbers;
  countries: any[] = countries;
  phonePrefix: any = phoneNumbers[0];
  prefixCheck: boolean = false;
  showEditMedium: boolean = false;
  selectedMedium:any;
  selectedMediumType:any;
  toastVisibility: boolean = false;
  successVisibility: boolean = false;

  errorMessage:any='';
  showError:boolean=false;
  showPreview:boolean=false;
  showEmoji:boolean=false;
  description:string='';
  showImgPreview:boolean=false;
  imgPreview:any='';
  attFileName = new FormControl('', [Validators.required, Validators.pattern('[a-zA-Z0-9 _.-]*')]);
  attImageName = new FormControl('', [Validators.required, Validators.pattern('^https?:\\/\\/.*\\.(?:png|jpg|jpeg|gif|bmp|webp)$')])
  filenameRegex = /^[A-Za-z0-9_.-]+$/;
  MAX_FILE_SIZE: number=environment.MAX_FILE_SIZE;

  selectedCountry: string = ''; // Stores the selected country code

  euCountries = [
    { code: 'AT', name: 'Austria' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'HR', name: 'Croatia' },
    { code: 'CY', name: 'Cyprus' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'DK', name: 'Denmark' },
    { code: 'EE', name: 'Estonia' },
    { code: 'FI', name: 'Finland' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
    { code: 'GR', name: 'Greece' },
    { code: 'HU', name: 'Hungary' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IT', name: 'Italy' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'MT', name: 'Malta' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'RO', name: 'Romania' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'ES', name: 'Spain' },
    { code: 'SE', name: 'Sweden' }
  ];

  @ViewChild('imgURL') imgURL!: ElementRef;

  public files: NgxFileDropEntry[] = [];

  constructor(
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private accountService: AccountServiceService,
    private eventMessage: EventMessageService,
    private attachmentService: AttachmentServiceService,
  ) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initPartyInfo();
      }
    })
  }

  ngOnInit() {
    this.loading=true;
    let today = new Date();
    today.setMonth(today.getMonth()-1);
    this.selectedDate = today.toISOString();
    this.initPartyInfo();
    if(this.isReadOnly && this.profileForm.value.description) {
      this.description = this.profileForm.value.description;
    }
    setTimeout(() => {
      initFlowbite();
    }, 500);
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if (aux.logged_as !== aux.id) {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId;

        // Check if user has orgAdmin role for edit permission
        if(loggedOrg && loggedOrg.roles){
          const orgRoles = loggedOrg.roles.map((role: any) => role.name);
          const hasOrgAdminRole = orgRoles.some((role: any) => role === environment.ORG_ADMIN_ROLE);
          this.isReadOnly = !hasOrgAdminRole;
        }
      } else {
        this.partyId = aux.partyId;
        this.isReadOnly = false;
      }

      this.token=aux.token;
      this.email=aux.email;
      this.profileForm.reset();
      this.getProfile();
    }
    initFlowbite();
  }

  getProfile(){
    this.contactmediums=[];
    this.accountService.getOrgInfo(this.partyId).then(data=> {
      console.log('--org info--')
      console.log(data)
      this.profile=data;
      this.loadProfileData(this.profile)
      this.loading=false;
      this.cdr.detectChanges();
    })
    this.cdr.detectChanges();
    initFlowbite();
  }

  updateProfile(){
    let mediums = [];
    let chars = [];
    if(this.imgPreview!=''){
      chars.push({
        name: 'logo',
        value: this.imgPreview
      })
    }
    if(this.profileForm.value.description!=''){
      chars.push({
        name: 'description',
        value: this.profileForm.value.description
      })      
    }
    if(this.profileForm.value.website!=''){
      chars.push({
        name: 'website',
        value: this.profileForm.value.website
      })       
    }
    if(this.profileForm.value.country != ''){
      chars.push({
        name: 'country',
        value: this.profileForm.value.country
      })       
    }
    for(let i=0; i<this.contactmediums.length; i++){
      console.log(this.contactmediums)
      if(this.contactmediums[i].mediumType == 'Email'){
        mediums.push({
          mediumType: 'Email',
          preferred: this.contactmediums[i].preferred,
          characteristic: {
            contactType: this.contactmediums[i].characteristic.contactType,
            emailAddress: this.contactmediums[i].characteristic.emailAddress
          }
        })
        console.log(this.contactmediums[i])
      } else if(this.contactmediums[i].mediumType == 'PostalAddress'){
        mediums.push({
          mediumType: this.contactmediums[i].mediumType,
          preferred: this.contactmediums[i].preferred,
          characteristic: {
            contactType: 'PostalAddress',
            city: this.contactmediums[i].characteristic.city,
            country: this.contactmediums[i].characteristic.country,
            postCode: this.contactmediums[i].characteristic.postCode,
            stateOrProvince: this.contactmediums[i].characteristic.stateOrProvince,
            street1: this.contactmediums[i].characteristic.street1
          }
        })
      } else {
        mediums.push({
          mediumType: this.contactmediums[i].mediumType,
          preferred: this.contactmediums[i].preferred,
          characteristic: {
            contactType: this.contactmediums[i].characteristic.contactType,
            phoneNumber: this.contactmediums[i].characteristic.phoneNumber
          }
        })          
      }
    }
    
    let profile = {
      "tradingName": this.profileForm.value.name,
      "contactMedium": mediums,
      "partyCharacteristic": chars
    }
    console.log(profile)
    this.accountService.updateOrgInfo(this.partyId,profile).subscribe({
      next: data => {
        this.profileForm.reset();
        this.getProfile();
        this.successVisibility = true;
        setTimeout(() => {
          this.successVisibility = false;
        }, 2000); 
        this.mediumForm.reset();      
      },
      error: error => {
          console.error('There was an error while updating!', error);
          if(error.error.error){
            console.log(error)
            this.errorMessage='Error: '+error.error.error;
          } else {
            this.errorMessage='There was an error while updating profile!';
          }
          this.showError=true;
          setTimeout(() => {
            this.showError = false;
          }, 3000);
      }
    });
  }

  loadProfileData(profile:any){
    this.profileForm.controls['name'].setValue(profile.tradingName);
    if(profile.contactMedium){
      for(let i=0; i<this.profile.contactMedium.length; i++){
        if(profile.contactMedium[i].mediumType == 'Email'){
          this.contactmediums.push({
            id: uuidv4(),
            mediumType: 'Email',
            preferred: profile.contactMedium[i].preferred,
            characteristic: {
              contactType: profile.contactMedium[i].characteristic?.contactType,
              emailAddress: profile.contactMedium[i].characteristic.emailAddress
            }
          })
        } else if(profile.contactMedium[i].mediumType == 'PostalAddress'){
          this.contactmediums.push({
            id: uuidv4(),
            mediumType: profile.contactMedium[i].mediumType,
            preferred: profile.contactMedium[i].preferred,
            characteristic: {
              contactType: 'PostalAddress',
              city: profile.contactMedium[i].characteristic.city,
              country: profile.contactMedium[i].characteristic.country,
              postCode: profile.contactMedium[i].characteristic.postCode,
              stateOrProvince: profile.contactMedium[i].characteristic.stateOrProvince,
              street1: profile.contactMedium[i].characteristic.street1
            }
          })
        } else {
          this.contactmediums.push({
            id: uuidv4(),
            mediumType: profile.contactMedium[i].mediumType,
            preferred: profile.contactMedium[i].preferred,
            characteristic: {
              contactType: profile.contactMedium[i].characteristic.contactType,
              phoneNumber: profile.contactMedium[i].characteristic.phoneNumber
            }
          })          
        }
      }
    }
    if(profile.partyCharacteristic){
      for(let i=0;i<profile.partyCharacteristic.length;i++){
        if(profile.partyCharacteristic[i].name == 'logo'){
          this.imgPreview=profile.partyCharacteristic[i].value
          this.showImgPreview=true;
        } else if(profile.partyCharacteristic[i].name=='description') {
          this.profileForm.controls['description'].setValue(profile.partyCharacteristic[i].value);
          this.description=profile.partyCharacteristic[i].value;
        }else if(profile.partyCharacteristic[i].name=='website') {
          this.profileForm.controls['website'].setValue(profile.partyCharacteristic[i].value);    
        } else if(profile.partyCharacteristic[i].name=='country') {
          this.profileForm.controls['country'].setValue(profile.partyCharacteristic[i].value);
        }
      }
    }
  }

  saveMedium(){
    if(this.phoneSelected){
        try{
            const phoneNumber = parsePhoneNumber(this.phonePrefix.code + this.mediumForm.value.telephoneNumber);
            if (phoneNumber) {
            if (!phoneNumber.isValid()) {
                console.log('NUMERO INVALIDO')
                this.mediumForm.controls['telephoneNumber'].setErrors({'invalidPhoneNumber': true});
                this.toastVisibility = true;
                setTimeout(() => {
                this.toastVisibility = false
                }, 2000);
                return;
            } else {
                this.mediumForm.controls['telephoneNumber'].setErrors(null);
                this.toastVisibility = false;
            }
            }
        }catch (e : any){
            this.mediumForm.controls['telephoneNumber'].setErrors({'invalidPhoneNumber': true});
            this.toastVisibility = true;
            setTimeout(() => {
            this.toastVisibility = false
            }, 2000);
            return;
        }
    }

    if (this.mediumForm.invalid) {
      this.toastVisibility = true;
      setTimeout(() => {
        this.toastVisibility = false
      }, 2000);
      return;
    } else {
      if(this.emailSelected){
        this.contactmediums.push({
          id: uuidv4(),
          mediumType: 'Email',
          preferred: false,
          characteristic: {
            contactType: 'Email',
            emailAddress: this.mediumForm.value.email
          }
        })
      } else if(this.addressSelected){
        this.contactmediums.push({
          id: uuidv4(),
          mediumType: 'PostalAddress',
          preferred: false,
          characteristic: {
            contactType: 'PostalAddress',
            city: this.mediumForm.value.city,
            country: this.mediumForm.value.country,
            postCode: this.mediumForm.value.postCode,
            stateOrProvince: this.mediumForm.value.stateOrProvince,
            street1: this.mediumForm.value.street
          }
        })
      } else {
        this.contactmediums.push({
          id: uuidv4(),
          mediumType: 'TelephoneNumber',
          preferred: false,
          characteristic: {
            contactType: this.mediumForm.value.telephoneType,
            phoneNumber: this.phonePrefix.code + this.mediumForm.value.telephoneNumber
          }
        })
      }
    }
    this.mediumForm.reset();
    console.log(this.contactmediums)
  }

  removeMedium(medium:any){
    const index = this.contactmediums.findIndex(item => item.id === medium.id);
    if (index !== -1) {
      this.contactmediums.splice(index, 1);
    }
  }

  editMedium(){

    const index = this.contactmediums.findIndex(item => item.id === this.selectedMedium.id);
      if (index !== -1) {
        if(this.selectedMedium.mediumType=='Email'){
          if (this.mediumForm.get('email')?.invalid) {
            this.toastVisibility = true;
            setTimeout(() => {
              this.toastVisibility = false
            }, 2000);
            return;
          }
          this.contactmediums[index]={
            id: this.contactmediums[index].id,
            mediumType: 'Email',
            preferred: false,
            characteristic: {
              contactType: 'Email',
              emailAddress: this.mediumForm.value.email
            }
          }
        } else if(this.selectedMedium.mediumType=='PostalAddress'){
          let fieldsToCheck = ['country', 'city', 'stateOrProvince', 'street'];

          fieldsToCheck.forEach(fieldName => {
            const control = this.mediumForm.get(fieldName);
            if (control?.invalid) {
              this.toastVisibility = true;
              setTimeout(() => {
                this.toastVisibility = false
              }, 2000);
              return;
            }
          });
          this.contactmediums[index]={
            id: this.contactmediums[index].id,
            mediumType: 'PostalAddress',
            preferred: false,
            characteristic: {
              contactType: 'PostalAddress',
              city: this.mediumForm.value.city,
              country: this.mediumForm.value.country,
              postCode: this.mediumForm.value.postCode,
              stateOrProvince: this.mediumForm.value.stateOrProvince,
              street1: this.mediumForm.value.street
            }
          }
        } else {
            try{
                const phoneNumber = parsePhoneNumber(this.phonePrefix.code + this.mediumForm.value.telephoneNumber);
                if (phoneNumber) {
                  if (!phoneNumber.isValid()) {
                    console.log('NUMERO INVALIDO')
                    this.mediumForm.controls['telephoneNumber'].setErrors({'invalidPhoneNumber': true});
                    this.toastVisibility = true;
                    setTimeout(() => {
                      this.toastVisibility = false
                    }, 2000);
                    return;
                  } else {
                    this.mediumForm.controls['telephoneNumber'].setErrors(null);
                    this.toastVisibility = false;
                  }
                }
            }
            catch(error){
                this.mediumForm.controls['telephoneNumber'].setErrors({'invalidPhoneNumber': true});
                    this.toastVisibility = true;
                    setTimeout(() => {
                      this.toastVisibility = false
                    }, 2000);
                    return;
            }
          this.contactmediums[index]={
            id: this.contactmediums[index].id,
            mediumType: 'TelephoneNumber',
            preferred: false,
            characteristic: {
              contactType: this.mediumForm.value.telephoneType,
              phoneNumber: this.phonePrefix.code + this.mediumForm.value.telephoneNumber
            }
          }
        }
        this.mediumForm.reset();
        this.showEditMedium=false;
      }
  }

  showEdit(medium:any){
    this.selectedMedium=medium;
    if(this.selectedMedium.mediumType=='Email'){
      this.selectedMediumType='email';
      this.mediumForm.controls['email'].setValue(this.selectedMedium.characteristic.emailAddress);
    } else if(this.selectedMedium.mediumType=='PostalAddress'){
      this.selectedMediumType='address';
      this.mediumForm.controls['country'].setValue(this.selectedMedium.characteristic.country);
      this.mediumForm.controls['city'].setValue(this.selectedMedium.characteristic.city);
      this.mediumForm.controls['stateOrProvince'].setValue(this.selectedMedium.characteristic.stateOrProvince);
      this.mediumForm.controls['postCode'].setValue(this.selectedMedium.characteristic.postCode);
      this.mediumForm.controls['street'].setValue(this.selectedMedium.characteristic.street1);
    } else {
      this.selectedMediumType='phone';
      const phoneNumber = parsePhoneNumber(this.selectedMedium.characteristic.phoneNumber)
      if (phoneNumber) {
        let pref = this.prefixes.filter(item => item.code === '+' + phoneNumber.countryCallingCode);
        if (pref.length > 0) {
          this.phonePrefix = pref[0];
        }
        this.mediumForm.controls['telephoneNumber'].setValue(phoneNumber.nationalNumber);
      }
      this.mediumForm.controls['telephoneType'].setValue(this.selectedMedium.characteristic.contactType);     
    }
    this.showEditMedium=true;
  }

  selectPrefix(pref:any) {
    console.log(pref)
    this.prefixCheck = false;
    this.phonePrefix = pref;
  }

  onTypeChange(event: any) {
    this.mediumForm.reset();
    if(event.target.value=='email'){
      this.emailSelected=true;
      this.addressSelected=false;
      this.phoneSelected=false;
      this.mediumForm.get('country')?.clearValidators();
      this.mediumForm.get('country')?.setValue('');
      this.mediumForm.get('city')?.clearValidators();
      this.mediumForm.get('city')?.setValue('');
      this.mediumForm.get('stateOrProvince')?.clearValidators();
      this.mediumForm.get('stateOrProvince')?.setValue('');
      this.mediumForm.get('postCode')?.clearValidators();
      this.mediumForm.get('postCode')?.setValue('');
      this.mediumForm.get('stateOrProvince')?.setValue('');
      this.mediumForm.get('street')?.clearValidators();
      this.mediumForm.get('street')?.setValue('');
      this.mediumForm.get('telephoneNumber')?.clearValidators();
      this.mediumForm.get('telephoneNumber')?.setValue('');
      this.mediumForm.get('email')?.setValidators([Validators.required,Validators.email, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]);
      this.mediumForm.get('email')?.markAsUntouched();
      this.mediumForm.get('email')?.setValue('');
      this.cdr.detectChanges();
    }else if (event.target.value=='address'){
      this.emailSelected=false;
      this.addressSelected=true;
      this.phoneSelected=false;
      this.mediumForm.get('telephoneNumber')?.clearValidators();
      this.mediumForm.get('telephoneNumber')?.setValue('');
      this.mediumForm.get('email')?.clearValidators();
      this.mediumForm.get('email')?.setValue('');
      this.mediumForm.get('country')?.setValidators([Validators.required]);
      this.mediumForm.get('country')?.markAsUntouched();
      this.mediumForm.get('country')?.setValue('');
      this.mediumForm.get('city')?.setValidators([Validators.required]);
      this.mediumForm.get('city')?.markAsUntouched();
      this.mediumForm.get('city')?.setValue('');
      this.mediumForm.get('stateOrProvince')?.setValidators([Validators.required]);
      this.mediumForm.get('stateOrProvince')?.markAsUntouched();
      this.mediumForm.get('stateOrProvince')?.setValue('');
      this.mediumForm.get('postCode')?.setValidators([Validators.required]);
      this.mediumForm.get('postCode')?.markAsUntouched();
      this.mediumForm.get('postCode')?.setValue('');
      this.mediumForm.get('street')?.setValidators([Validators.required]);
      this.mediumForm.get('street')?.markAsUntouched();
      this.mediumForm.get('street')?.setValue('');
      this.cdr.detectChanges();
    }else{
      this.emailSelected=false;
      this.addressSelected=false;
      this.phoneSelected=true;
      this.mediumForm.get('country')?.clearValidators();
      this.mediumForm.get('country')?.setValue('');
      this.mediumForm.get('city')?.clearValidators();
      this.mediumForm.get('city')?.setValue('');
      this.mediumForm.get('stateOrProvince')?.clearValidators();
      this.mediumForm.get('stateOrProvince')?.setValue('');
      this.mediumForm.get('postCode')?.clearValidators();
      this.mediumForm.get('postCode')?.setValue('');
      this.mediumForm.get('street')?.clearValidators();
      this.mediumForm.get('street')?.setValue('');
      this.mediumForm.get('email')?.clearValidators();
      this.mediumForm.get('email')?.setValue('');
      this.mediumForm.get('telephoneNumber')?.setValidators([Validators.required]);
      this.mediumForm.get('telephoneNumber')?.markAsUntouched();
      this.mediumForm.get('telephoneNumber')?.setValue('');
      this.cdr.detectChanges();
    }
    console.log(this.mediumForm)
    console.log(this.printAllActiveValidators());

  }
  showMedium(){
    console.log('--- SHOW MEDIUM')
    console.log(this.mediumForm)
    console.log(this.printAllActiveValidators());
    console.log('--value')
    console.log(this.mediumForm.get('email')?.value)
  }

  printActiveValidators(controlName: string) {
    const control = this.mediumForm.get(controlName);
    if (!control || !control.validator) {
      console.log(`No active validators for ${controlName}`);
      return;
    }
  
    const validatorFn = control.validator({} as AbstractControl);
    if (!validatorFn) {
      console.log(`No active validators for ${controlName}`);
      return;
    }
  
    console.log(`Active validators for ${controlName}:`, Object.keys(validatorFn));
  }

  printAllActiveValidators() {
    Object.keys(this.mediumForm.controls).forEach(controlName => {
      this.printActiveValidators(controlName);
    });
  }
  


  public dropped(files: NgxFileDropEntry[],sel:any) {
    this.files = files;
    for (const droppedFile of files) {
 
      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          console.log('dropped')       

          if (file) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
              const base64String: string = e.target.result.split(',')[1];
              console.log('BASE 64....')
              console.log(base64String); // You can use this base64 string as needed
              let fileBody = {
                content: {
                  name: 'orglogo'+file.name,
                  data: base64String
                },
                contentType: file.type,
                isPublic: true
              }
              if(!this.isValidFilename(fileBody.content.name)){
                this.errorMessage='File names can only include alphabetical characters (A-Z, a-z) and a limited set of symbols, such as underscores (_), hyphens (-), and periods (.)';
                console.error('There was an error while uploading file!');
                this.showError=true;
                setTimeout(() => {
                  this.showError = false;
                }, 3000);
                return;
              }
              //IF FILES ARE HIGHER THAN 3MB THROW AN ERROR
              if(file.size>this.MAX_FILE_SIZE){
                this.errorMessage='File size must be under 3MB.';
                console.error('There was an error while uploading file!');
                this.showError=true;
                setTimeout(() => {
                  this.showError = false;
                }, 3000);
                return;
              }
              this.attachmentService.uploadFile(fileBody).subscribe({
                next: data => {
                    console.log(data)
                    if(sel=='img'){
                      if(file.type.startsWith("image")){
                        this.showImgPreview=true;
                        this.imgPreview=data.content;
                      } else {
                        this.errorMessage='File must have a valid image format!';
                        this.showError=true;
                        setTimeout(() => {
                          this.showError = false;
                        }, 3000);
                      }
                    }
                    this.cdr.detectChanges();
                    console.log('uploaded')
                },
                error: error => {
                    console.error('There was an error while uploading!', error);
                    if(error.error.error){
                      console.log(error)
                      this.errorMessage='Error: '+error.error.error;
                    } else {
                      this.errorMessage='There was an error while uploading the file!';
                    }
                    if (error.status === 413) {
                      this.errorMessage='File size too large! Must be under 3MB.';
                    }
                    this.showError=true;
                    setTimeout(() => {
                      this.showError = false;
                    }, 3000);
                }
              });
            };
            reader.readAsDataURL(file);
          }
 
        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
      }
    }
  }

  isValidFilename(filename: string): boolean {
    return this.filenameRegex.test(filename);
  }
 
  public fileOver(event: any){
    console.log(event);
  }
 
  public fileLeave(event: any){
    console.log('leave')
    console.log(event);
  }

  saveImgFromURL(){
    this.showImgPreview=true;
    this.imgPreview=this.imgURL.nativeElement.value;
    this.attImageName.reset();
    this.cdr.detectChanges();
  }

  removeImg(){    
    this.showImgPreview=false;
    this.imgPreview='';
    this.cdr.detectChanges();
  }

    //Markdown actions:
    addBold() {
      const currentText = this.profileForm.value.description;
      this.profileForm.patchValue({
        description: currentText + ' **bold text** '
      });  
    }
  
    addItalic() {
      const currentText = this.profileForm.value.description;
      this.profileForm.patchValue({
        description: currentText + ' _italicized text_ '
      });
    }
  
    addList(){
      const currentText = this.profileForm.value.description;
      this.profileForm.patchValue({
        description: currentText + '\n- First item\n- Second item'
      });
    }
  
    addOrderedList(){
      const currentText = this.profileForm.value.description;
      this.profileForm.patchValue({
        description: currentText + '\n1. First item\n2. Second item'
      });
    }
  
    addCode(){
      const currentText = this.profileForm.value.description;
      this.profileForm.patchValue({
        description: currentText + '\n`code`'
      });
    }
  
    addCodeBlock(){
      const currentText = this.profileForm.value.description;
      this.profileForm.patchValue({
        description: currentText + '\n```\ncode\n```'
      });
    }
  
    addBlockquote(){
      const currentText = this.profileForm.value.description;
      this.profileForm.patchValue({
        description: currentText + '\n> blockquote'
      });   
    }
  
    addLink(){
      const currentText = this.profileForm.value.description;
      this.profileForm.patchValue({
        description: currentText + ' [title](https://www.example.com) '
      }); 
    } 
  
    addTable(){
      const currentText = this.profileForm.value.description;
      this.profileForm.patchValue({
        description: currentText + '\n| Syntax | Description |\n| ----------- | ----------- |\n| Header | Title |\n| Paragraph | Text |'
      });
    }
  
    addEmoji(event:any){
      this.showEmoji=false;
      const currentText = this.profileForm.value.description;
      this.profileForm.patchValue({
        description: currentText + event.emoji.native
      });
    }
  
    togglePreview(){
      if(this.profileForm.value.description){
        this.description=this.profileForm.value.description;
      } else {
        this.description=''
      }
    }

    hasLongWord(str: string | undefined, threshold = 20) {
      if(str){
        return str.split(/\s+/).some(word => word.length > threshold);
      } else {
        return false
      }   
    }

}
