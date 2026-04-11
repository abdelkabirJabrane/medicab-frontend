import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-command-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './command-panel.html',
  styleUrls: ['./command-panel.scss']
})
export class CommandPanelComponent {
  @Input() loading = false;
  @Output() onCommand = new EventEmitter<string>();

  sendCommand(cmd: string) {
    this.onCommand.emit(cmd);
  }
}
