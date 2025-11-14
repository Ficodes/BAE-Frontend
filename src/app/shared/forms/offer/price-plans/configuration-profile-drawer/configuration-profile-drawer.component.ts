import { Component, EventEmitter, Input, Output, OnInit, HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import {NgClass, NgForOf, NgIf} from "@angular/common";
import { certifications } from 'src/app/models/certification-standards.const';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-configuration-profile-drawer',
  standalone: true,
  templateUrl: './configuration-profile-drawer.component.html',
  imports: [
    NgClass,
    NgIf,
    NgForOf,
    TranslateModule
  ],
  styleUrl: './configuration-profile-drawer.component.css'
})
export class ConfigurationProfileDrawerComponent implements OnInit {
  @Input() profileData: any[] = []; // Array of prodSpecCharValueUse
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  isOpen = false;
  initialized = false;
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    console.log('Profile Data:', this.profileData);

    // Guard...
    //const characteristicsData = this.profileData || [];
    let profileChars = [];
    for(let i=0;i<this.profileData.length;i++){
      if (!certifications.some(certification => certification.name === this.profileData[i].name)
          && this.profileData[i].name != 'Compliance:SelfAtt'
          && this.profileData[i].valueType != 'credentialsConfiguration'
          && this.profileData[i].valueType != 'authorizationPolicy') {
        profileChars.push(this.profileData[i]);
      }
    }
    const characteristicsData = profileChars || [];

    this.form = this.fb.group({
      characteristics: this.fb.array(characteristicsData.map(char => this.createCharacteristicForm(char)))
    });

    setTimeout(() => {
      this.isOpen = true;
      this.initialized = true;
    }, 50);
  }


  private createCharacteristicForm(char: any): FormGroup {
    return this.fb.group({
      id: new FormControl(char.id),
      name: new FormControl(char.name),
      selectedValue: new FormControl(
        char.productSpecCharacteristicValue.find((v: any) => v.isDefault)?.value || ''
      ),
      options: new FormControl(char.productSpecCharacteristicValue || [])
    });
  }

  get characteristics(): FormArray {
    return this.form.get('characteristics') as FormArray;
  }

  changeProfileValue(index: number, event: any) {
    this.characteristics.at(index).patchValue({ selectedValue: event.target.value });
    console.log(this.characteristics.at(index))
  }

  private mapFormToProfile(): any[] {
    const profileArray = this.characteristics.value;  
    return profileArray.map((char: any) => ({
      id: char.id,
      name: char.name,
      description: char.description || '',
      productSpecCharacteristicValue: char.options.map((opt: any) => {
        if (!("value" in opt) || "valueFrom" in opt) {
          opt.value = "unitOfMeasure" in opt ? Number(char.selectedValue) : char.selectedValue;
        }
        return {
          ...opt,
          isDefault: String(opt.value) === String(char.selectedValue),
        };
      })
    }));
  }
  

  hasKey(obj: any, key: string): boolean {
    return obj?.hasOwnProperty(key);
  }

  saveProfile() {
    if (this.form.invalid) return;

    const formattedProfile = this.mapFormToProfile();
    this.save.emit(formattedProfile);

    this.closeDrawer();
  }


  closeDrawer() {
    this.isOpen = false;
    setTimeout(() => this.close.emit(), 500);
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    this.closeDrawer();
  }
}
