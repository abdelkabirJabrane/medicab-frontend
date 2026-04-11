import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-result-modal',
  standalone: true,
  imports: [CommonModule, DialogModule],
  templateUrl: './result-modal.html',
  styleUrls: ['./result-modal.scss']
})
export class ResultModalComponent {
  @Input() visible = false;
  @Input() content = '';
  @Input() title = 'Document Généré';
  @Output() visibleChange = new EventEmitter<boolean>();

  closeModal() {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }

  printDocument() {
    window.print();
  }
}
