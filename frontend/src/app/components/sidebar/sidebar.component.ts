import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface NavigationItem {
  id: string;
  label: string;
  path: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() isCollapsed = false;
  @Output() toggle = new EventEmitter<void>();

  navigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      path: '/'
    }
    // Future navigation items can be added here
  ];

  onToggle() {
    this.toggle.emit();
  }

  onSidebarClick() {
    if (this.isCollapsed) {
      this.toggle.emit();
    }
  }
}

