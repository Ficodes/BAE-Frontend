import { Component, HostListener, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgClass, NgIf } from "@angular/common";
import { MarkdownComponent } from "ngx-markdown";
import { PickerComponent } from "@ctrl/ngx-emoji-mart";
import {SharedModule} from "../../shared.module";

@Component({
  selector: 'app-markdown-textarea',
  templateUrl: './markdown-textarea.component.html',
  styleUrls: ['./markdown-textarea.component.css'],
  standalone: true,
  imports: [
    NgIf,
    MarkdownComponent,
    NgClass,
    PickerComponent,
    SharedModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownTextareaComponent),
      multi: true
    }
  ]
})
export class MarkdownTextareaComponent implements ControlValueAccessor {
  @Input() placeholder: string = 'Write your description here...';
  @Input() rows: number = 8;
  value: string = '';
  showPreview = false;
  showEmoji = false;

  @HostListener('document:click')
  onClick() {
    if (this.showEmoji == true) {
      this.showEmoji = false;
    }
  }

  onChange = (_: any) => {};
  onTouched = () => {};

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  updateValue(event: Event): void {
    const newValue = (event.target as HTMLTextAreaElement).value;
    this.value = newValue;
    this.onChange(newValue);
    this.onTouched();
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  //Markdown actions:
  addList(){
      this.value += '\n- First item\n- Second item'
  }

  addOrderedList(){
      this.value += '\n1. First item\n2. Second item'
  }

  addCode(){
      this.value += '\n`code`'
  }

  addCodeBlock(){
      this.value += '\n```\ncode\n```'
  }

  addBlockquote(){
      this.value += '\n> blockquote'
  }

  addTable(){
      this.value += '\n| Syntax | Description |\n| ----------- | ----------- |\n| Header | Title |\n| Paragraph | Text |'
  }

  addEmoji(event:any){
      this.showEmoji=false;
      this.value += event.emoji.native
  }

  addMarkdownTag(tag: string): void {
    const textarea = document.getElementById('editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const beforeText = this.value.substring(0, selectionStart);
    let selectedText = this.value.substring(selectionStart, selectionEnd);
    const afterText = this.value.substring(selectionEnd);

    switch (tag) {
      case 'bold':
        selectedText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        selectedText = `*${selectedText || 'italic text'}*`;
        break;
      case 'link':
        selectedText = `[${selectedText || 'link text'}](http://)`;
        break;
      case 'list':
        selectedText = `- ${selectedText || 'list item'}`;
        break;
      case 'orderedList':
        selectedText = `1. ${selectedText || 'ordered item'}`;
        break;
      case 'blockquote':
        selectedText = `> ${selectedText || 'blockquote'}`;
        break;
      case 'code':
        selectedText = `\`${selectedText || 'inline code'}\``;
        break;
      case 'codeBlock':
        selectedText = `\`\`\`\n${selectedText || 'code block'}\n\`\`\``;
        break;
      case 'table':
        selectedText = `| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| ${selectedText || 'data'} | data | data |`;
        break;
    }

    this.value = beforeText + selectedText + afterText;
    this.onChange(this.value);

    // Restaurar el cursor al final del texto insertado
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = selectionStart + selectedText.length;
      textarea.focus();
    }, 0);
  }

}
