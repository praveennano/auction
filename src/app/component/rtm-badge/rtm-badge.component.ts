import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Team } from '../../models/team.model';

@Component({
  selector: 'app-rtm-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rtm-badge" [class.rtm-available]="team.rtmAvailable" [class.rtm-used]="!team.rtmAvailable">
      <span class="rtm-icon">{{ team.rtmAvailable ? '🎯' : '✓' }}</span>
      <span class="rtm-text">{{ team.rtmAvailable ? 'RTM Available' : 'RTM Used' }}</span>
      <span class="rtm-timestamp" *ngIf="team.rtmUsedAt">
        Used: {{ formatDate(team.rtmUsedAt) }}
      </span>
    </div>
  `,
  styles: [`
    .rtm-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .rtm-badge.rtm-available {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .rtm-badge.rtm-used {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .rtm-icon {
      font-size: 14px;
    }

    .rtm-text {
      white-space: nowrap;
    }

    .rtm-timestamp {
      font-size: 11px;
      opacity: 0.8;
    }
  `]
})
export class RtmBadgeComponent {
  @Input() team!: Team;

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  }
}
