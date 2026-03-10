import {
    Directive,
    HostListener,
    Output,
    Input,
    OnChanges,
    SimpleChanges,
    OnDestroy,
    EventEmitter,
    Optional,
    Inject,
  } from '@angular/core';
  import { DOCUMENT } from '@angular/common';
  import { coerceBooleanProperty } from '@angular/cdk/coercion';
  
  @Directive({
    selector: '[appFilePicker]',
    exportAs: 'appFilePicker',
  })
  export class FilePickerDirective implements OnDestroy, OnChanges {
  
    private _form: HTMLFormElement | undefined;
  
    /**
     * Prevent dragover event so drop events register.
     **/
    @HostListener('dragover', ['$event'])
    _onDragOver(event: DragEvent) {
      event.preventDefault();
    }
  
    /**
     * Set files on drop.
     * Emit selected files.
     **/
    @HostListener('drop', ['$event'])
    _drop(event: DragEvent) {
      event.preventDefault();
      const files = event.dataTransfer?.files;
      if(files!=null && this._nativeFileElement){
        this._nativeFileElement.files = files;
      }
      this._onFilesChanged();
    }
    
    /**
     * Invoke file browse on click.
     **/
    @HostListener('click', ['$event'])
    _onClick(event: Event) {
      event.preventDefault();
      if(this._nativeFileElement){
        this._nativeFileElement.click();
      }      
    }
    
    /**
     * Allow multiple file selection. Defaults to `false`.
     * **/
    @Input()
    set multiple(val: boolean) {
      this._multiple = coerceBooleanProperty(val);
    }
    get multiple() {
      return this._multiple;
    }
    private _multiple = false;
  
    /**
     * File list emitted on change.
     * **/
    @Output()
    filesChanged = new EventEmitter<FileList>();
  
    /**
     * File list emitted on change.
     * **/
    @Output()
    filesReset = new EventEmitter();
  
    /**
     * Selected Files
     **/
     get files(): FileList | undefined {
      if(this._nativeFileElement && this._nativeFileElement.files != null){
        return this._nativeFileElement.files;
      } else {
        return undefined
      }       
     }
  
    /**
     * Native input[type=file] element.
     **/
    get nativeFileElement() {
      return this._nativeFileElement;
    }
    private _nativeFileElement: HTMLInputElement | undefined;
  
    private _onFilesChanged = () => {
      if(this._nativeFileElement && this._nativeFileElement.files != null){
        this.filesChanged.emit(this._nativeFileElement.files);
      }
    };
  
    constructor(
      @Optional() @Inject(DOCUMENT) private _document: Document,
    ) {
      if (this._document) {
        this._form = this._document.createElement('form');
        this._nativeFileElement = this._document.createElement('input');
        this._nativeFileElement.type = 'file';
        this._nativeFileElement.multiple = this.multiple;
        this._nativeFileElement.addEventListener('change', this._onFilesChanged);
        if(this.nativeFileElement){
          this._form.appendChild(this.nativeFileElement);
        }        
      }
    }
  
    ngOnChanges(changes: SimpleChanges) {
      if (changes['multiple'] && this._nativeFileElement) {
        this._nativeFileElement.multiple = this.multiple;
      }
    }
  
    ngOnDestroy() {
      if(this._nativeFileElement && this._form){
        this._nativeFileElement.removeEventListener('change', this._onFilesChanged);
        this._nativeFileElement.remove();
        this._form.remove();
      }
    }
  
    /**
     * Reset file list.
     **/
    reset() {
      if(this._form){
        this._form.reset();
      }      
      this.filesReset.emit();
    }
  }