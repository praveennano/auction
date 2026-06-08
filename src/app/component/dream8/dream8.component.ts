import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Dream8Service, Dream8Player, Dream8Team } from '../../service/dream8.service';
import { PredictionGameService } from '../../service/prediction-game.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-dream8',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './dream8.component.html',
  styleUrl: './dream8.component.scss'
})
export class Dream8Component implements OnInit, OnDestroy {
  allPlayers: Dream8Player[] = [];
  filteredPlayers: Dream8Player[] = [];
  selectedPlayerIds = new Set<string>();
  captainId: string | null = null;
  viceCaptainId: string | null = null;
  searchQuery = '';
  isLoading = false;
  isSaving = false;
  savedTeam: Dream8Team | null = null;
  showPreview = false;
  isLoggedIn = false;

  readonly BUDGET = 2500;
  readonly TEAM_SIZE = 8;

  private subscriptions = new Subscription();

  constructor(
    private dream8Service: Dream8Service,
    private pgService: PredictionGameService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.pgService.userProfile$.subscribe(profile => {
        this.isLoggedIn = !!profile;
        if (profile) {
          this.dream8Service.initialize(profile.id);
        }
      })
    );

    this.subscriptions.add(
      this.dream8Service.players$.subscribe(players => {
        this.allPlayers = players;
        this.applyFilter();
      })
    );

    this.subscriptions.add(
      this.dream8Service.myTeam$.subscribe(team => {
        this.savedTeam = team;
        if (team) {
          this.selectedPlayerIds = new Set(team.playerIds);
          this.captainId = team.captainId ?? null;
          this.viceCaptainId = team.viceCaptainId ?? null;
        }
      })
    );

    this.subscriptions.add(
      this.dream8Service.loading$.subscribe(loading => {
        this.isLoading = loading;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ── Computed properties ──

  get selectedPlayers(): Dream8Player[] {
    return this.allPlayers.filter(p => this.selectedPlayerIds.has(p.supabaseId));
  }

  get totalCost(): number {
    return this.selectedPlayers.reduce((sum, p) => sum + p.soldPrice, 0);
  }

  get remainingBudget(): number {
    return this.BUDGET - this.totalCost;
  }

  get budgetPercentage(): number {
    return (this.totalCost / this.BUDGET) * 100;
  }

  get isTeamComplete(): boolean {
    return this.selectedPlayerIds.size === this.TEAM_SIZE;
  }

  get canSave(): boolean {
    return this.isTeamComplete && this.totalCost <= this.BUDGET
      && !!this.captainId && !!this.viceCaptainId;
  }

  get captainVcSelected(): boolean {
    return !!this.captainId && !!this.viceCaptainId;
  }

  get hasChanges(): boolean {
    if (!this.savedTeam) return this.selectedPlayerIds.size > 0;
    const savedSet = new Set(this.savedTeam.playerIds);
    if (savedSet.size !== this.selectedPlayerIds.size) return true;
    for (const id of this.selectedPlayerIds) {
      if (!savedSet.has(id)) return true;
    }
    // Also detect C / VC changes
    if (this.captainId !== (this.savedTeam.captainId ?? null)) return true;
    if (this.viceCaptainId !== (this.savedTeam.viceCaptainId ?? null)) return true;
    return false;
  }

  // ── Actions ──

  togglePlayer(player: Dream8Player): void {
    if (this.selectedPlayerIds.has(player.supabaseId)) {
      this.selectedPlayerIds.delete(player.supabaseId);
    } else {
      if (this.selectedPlayerIds.size >= this.TEAM_SIZE) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Team Full',
          detail: `You can only select ${this.TEAM_SIZE} players`,
          life: 2000
        });
        return;
      }
      if (this.totalCost + player.soldPrice > this.BUDGET) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Over Budget!',
          detail: `Adding ${player.name} (₹${player.soldPrice}) exceeds the ₹${this.BUDGET} budget`,
          life: 2500
        });
        return;
      }
      this.selectedPlayerIds.add(player.supabaseId);
    }
    // Force change detection for Set
    this.selectedPlayerIds = new Set(this.selectedPlayerIds);
  }

  isSelected(player: Dream8Player): boolean {
    return this.selectedPlayerIds.has(player.supabaseId);
  }

  canAfford(player: Dream8Player): boolean {
    if (this.isSelected(player)) return true;
    return this.totalCost + player.soldPrice <= this.BUDGET;
  }

  removePlayer(playerId: string): void {
    this.selectedPlayerIds.delete(playerId);
    this.selectedPlayerIds = new Set(this.selectedPlayerIds);
    if (this.captainId === playerId) this.captainId = null;
    if (this.viceCaptainId === playerId) this.viceCaptainId = null;
  }

  setCaptain(playerId: string): void {
    if (this.captainId === playerId) {
      this.captainId = null;
      return;
    }
    if (this.viceCaptainId === playerId) this.viceCaptainId = null;
    this.captainId = playerId;
  }

  setViceCaptain(playerId: string): void {
    if (this.viceCaptainId === playerId) {
      this.viceCaptainId = null;
      return;
    }
    if (this.captainId === playerId) this.captainId = null;
    this.viceCaptainId = playerId;
  }

  isCaptain(playerId: string): boolean { return this.captainId === playerId; }
  isViceCaptain(playerId: string): boolean { return this.viceCaptainId === playerId; }

  clearTeam(): void {
    this.selectedPlayerIds = new Set();
    this.captainId = null;
    this.viceCaptainId = null;
  }

  async saveTeam(): Promise<void> {
    if (!this.canSave) return;

    this.isSaving = true;
    const playerIds = Array.from(this.selectedPlayerIds);
    const success = await this.dream8Service.saveTeam(
      playerIds, this.totalCost,
      this.captainId ?? undefined,
      this.viceCaptainId ?? undefined
    );

    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: '✅ Team Saved!',
        detail: `Your Dream 8 team has been saved (₹${this.totalCost}/${this.BUDGET})`,
        life: 3000
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: '❌ Save Failed',
        detail: 'Could not save your team. Please try again.',
        life: 3000
      });
    }
    this.isSaving = false;
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  // ── Filter ──

  applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredPlayers = [...this.allPlayers];
    } else {
      this.filteredPlayers = this.allPlayers.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q)
      );
    }
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  // ── Helpers ──

  getRoleIcon(role: string): string {
    return '⚡';
  }

  getRoleClass(role: string): string {
    switch (role.toLowerCase()) {
      case 'batsman': return 'role-bat';
      case 'bowler': return 'role-bowl';
      case 'wicket keeper': return 'role-wk';
      default: return 'role-ar';
    }
  }
}
