import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-session-data-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-data-panel.html',
  styleUrls: ['./session-data-panel.scss']
})
export class SessionDataPanelComponent {
  @Input() data: any = null; // Parsed JSON from agent response representing the consultation structure
  @Input() alerts: any[] = [];
}
