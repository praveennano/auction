import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Dream8Service, Dream8Player, Dream8Team, Dream8TeamAdmin, TournamentPlayerPoints, TournamentTeamResult, PlayerPopularity } from '../../service/dream8.service';
import { PredictionGameService } from '../../service/prediction-game.service';
import { AuctionService } from '../../service/auction.service';
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
  showAdminView = false;
  isLoggedIn = false;
  adminTeams: Dream8TeamAdmin[] = [];
  isLoadingAdmin = false;

  // Lock state
  isDream8Locked = false;
  isTogglingLock = false;
  isResettingDream8 = false;
  isResettingAuction = false;

  // Stats tab (all users)
  showStatsView = false;
  playerPopularity: PlayerPopularity[] = [];
  topBatsmen: TournamentPlayerPoints[] = [];
  topBowlers: TournamentPlayerPoints[] = [];
  topFielders: TournamentPlayerPoints[] = [];
  isLoadingStats = false;
  statsViewLoaded = false;

  // Admin sub-tabs
  adminSubTab: 'teams' | 'results' = 'teams';

  // Tournament results state
  tournamentName = 'T14';
  tournamentPlayers: TournamentPlayerPoints[] = [];
  teamLeaderboard: TournamentTeamResult[] = [];
  isUploadingStats = false;
  isLoadingResults = false;
  statsLoaded = false;
  expandedTeamUserId: string | null = null;

  readonly BUDGET = 2500;
  readonly TEAM_SIZE = 8;

  private subscriptions = new Subscription();

  constructor(
    private dream8Service: Dream8Service,
    private pgService: PredictionGameService,
    private auctionService: AuctionService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.dream8Service.loadDream8Lock().then(locked => {
      this.isDream8Locked = locked;
    });

    this.subscriptions.add(
      this.pgService.userProfile$.subscribe(profile => {
        this.isLoggedIn = !!profile;
        this.displayName = profile?.display_name || profile?.username || '';
        if (profile) this.dream8Service.initialize(profile.id);
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

  get isAdmin(): boolean {
    return this.pgService.isAdmin;
  }

  displayName = '';

  @Output() goToLogin = new EventEmitter<void>();

  logout(): void {
    this.pgService.clearSession();
  }

  async resetDream8(): Promise<void> {
    const confirmed = window.confirm(
      '⚠️ RESET DREAM 8?\n\nThis will permanently delete:\n• All user fantasy teams\n• All tournament stats & points\n• Unlock Dream 8\n\nThis cannot be undone. Are you sure?'
    );
    if (!confirmed) return;

    this.isResettingDream8 = true;
    const ok = await this.dream8Service.resetAllDream8Teams();
    if (ok) {
      // Clear local state
      this.adminTeams = [];
      this.tournamentPlayers = [];
      this.teamLeaderboard = [];
      this.statsLoaded = false;
      this.topBatsmen = [];
      this.topBowlers = [];
      this.topFielders = [];
      this.playerPopularity = [];
      this.statsViewLoaded = false;
      this.isDream8Locked = false;
      this.expandedTeamUserId = null;
      this.messageService.add({
        severity: 'success',
        summary: '✅ Dream 8 Reset',
        detail: 'All teams and tournament stats cleared. Dream 8 is unlocked.',
        life: 5000
      });
    } else {
      this.messageService.add({ severity: 'error', summary: '❌ Reset Failed', detail: 'Could not reset Dream 8. Try again.', life: 3000 });
    }
    this.isResettingDream8 = false;
  }

  async resetAuction(): Promise<void> {
    const confirmed = window.confirm(
      '⚠️ RESET AUCTION?\n\nThis will permanently:\n• Reset all player sold prices\n• Clear all team rosters\n• Clear RTM history\n• Clear saved auction progress\n\nThis cannot be undone. Are you sure?'
    );
    if (!confirmed) return;

    this.isResettingAuction = true;
    const ok = await this.dream8Service.resetAuctionDB();
    if (ok) {
      // Clear localStorage auction state
      this.auctionService.clearAuctionState();
      this.messageService.add({
        severity: 'success',
        summary: '✅ Auction Reset',
        detail: 'All player prices, team rosters and RTM history cleared.',
        life: 5000
      });
    } else {
      this.messageService.add({ severity: 'error', summary: '❌ Reset Failed', detail: 'Could not reset auction. Try again.', life: 3000 });
    }
    this.isResettingAuction = false;
  }

  async toggleLock(): Promise<void> {
    this.isTogglingLock = true;
    const newLocked = !this.isDream8Locked;
    const ok = await this.dream8Service.setDream8Lock(newLocked);
    if (ok) {
      this.isDream8Locked = newLocked;
      this.messageService.add({
        severity: newLocked ? 'warn' : 'success',
        summary: newLocked ? '🔒 Dream 8 Locked' : '🔓 Dream 8 Unlocked',
        detail: newLocked
          ? 'Users can no longer create or edit teams.'
          : 'Users can now create and edit teams again.',
        life: 4000
      });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Could not update lock state.', life: 3000 });
    }
    this.isTogglingLock = false;
  }

  async toggleStatsView(): Promise<void> {
    if (this.showStatsView) {
      this.showStatsView = false;
      return;
    }
    this.showStatsView = true;
    this.showPreview = false;
    this.showAdminView = false;
    if (!this.statsViewLoaded) await this.loadStatsData();
  }

  async loadStatsData(): Promise<void> {
    this.isLoadingStats = true;
    try {
      this.playerPopularity = await this.dream8Service.loadPlayerPopularity();

      const performers = await this.dream8Service.loadTournamentResults(this.tournamentName);
      this.topBatsmen  = [...performers].sort((a, b) => b.battingPoints  - a.battingPoints).slice(0, 5);
      this.topBowlers  = [...performers].sort((a, b) => b.bowlingPoints  - a.bowlingPoints).slice(0, 5);
      this.topFielders = [...performers].sort((a, b) => b.fieldingPoints - a.fieldingPoints).slice(0, 5);

      this.statsViewLoaded = true;
    } finally {
      this.isLoadingStats = false;
    }
  }

  async toggleAdminView(): Promise<void> {
    if (this.showAdminView) {
      this.showAdminView = false;
      return;
    }
    this.showAdminView = true;
    this.showPreview = false;
    this.showStatsView = false;
    this.adminSubTab = 'teams';
    this.isLoadingAdmin = true;
    this.adminTeams = await this.dream8Service.loadAllTeams();
    this.isLoadingAdmin = false;
  }

  closeAdminView(): void {
    this.showAdminView = false;
  }

  async refreshAdminView(): Promise<void> {
    this.isLoadingAdmin = true;
    this.adminTeams = await this.dream8Service.loadAllTeams();
    this.isLoadingAdmin = false;
  }

  async switchAdminTab(tab: 'teams' | 'results'): Promise<void> {
    this.adminSubTab = tab;
    if (tab === 'results' && !this.statsLoaded) {
      await this.loadExistingResults();
    }
  }

  async loadExistingResults(): Promise<void> {
    this.isLoadingResults = true;
    this.tournamentPlayers = await this.dream8Service.loadTournamentResults(this.tournamentName);
    if (this.tournamentPlayers.length > 0) {
      this.teamLeaderboard = await this.dream8Service.calculateTeamLeaderboard(this.tournamentPlayers);
      this.statsLoaded = true;
    }
    this.isLoadingResults = false;
  }

  async clearResults(): Promise<void> {
    const confirmed = window.confirm(`Clear all uploaded stats for "${this.tournamentName}"? User teams will NOT be affected.`);
    if (!confirmed) return;

    const ok = await this.dream8Service.clearTournamentStats(this.tournamentName);
    if (ok) {
      this.tournamentPlayers = [];
      this.teamLeaderboard = [];
      this.statsLoaded = false;
      this.expandedTeamUserId = null;
      // also reset stats tab
      this.topBatsmen = [];
      this.topBowlers = [];
      this.topFielders = [];
      this.playerPopularity = [];
      this.statsViewLoaded = false;
      this.messageService.add({ severity: 'info', summary: 'Cleared', detail: 'Tournament stats removed. User teams are untouched.', life: 3000 });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Could not clear stats. Try again.', life: 3000 });
    }
  }

  triggerFileUpload(): void {
    const input = document.getElementById('statsFileInput') as HTMLInputElement;
    input?.click();
  }

  async onStatsFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Reset input so same file can be re-uploaded
    (event.target as HTMLInputElement).value = '';

    if (!file.name.endsWith('.csv')) {
      this.messageService.add({ severity: 'warn', summary: 'Invalid File', detail: 'Please upload a .csv file', life: 3000 });
      return;
    }

    this.isUploadingStats = true;
    try {
      const text = await file.text();
      const players = this.dream8Service.parseCsvAndCalculate(text);

      if (players.length === 0) {
        this.messageService.add({ severity: 'warn', summary: 'No Data', detail: 'No player data found in the CSV', life: 3000 });
        return;
      }

      const saved = await this.dream8Service.saveTournamentStats(players, this.tournamentName);
      if (!saved) throw new Error('Save failed');

      this.tournamentPlayers = players;
      this.teamLeaderboard = await this.dream8Service.calculateTeamLeaderboard(players);
      this.statsLoaded = true;

      this.messageService.add({
        severity: 'success',
        summary: 'Stats Uploaded',
        detail: `${players.length} players processed. Team leaderboard updated.`,
        life: 4000
      });
    } catch (err: any) {
      console.error('❌ Stats upload failed:', err);
      this.messageService.add({ severity: 'error', summary: 'Upload Failed', detail: err?.message || 'Could not process the CSV', life: 4000 });
    } finally {
      this.isUploadingStats = false;
    }
  }

  toggleTeamExpand(userId: string): void {
    this.expandedTeamUserId = this.expandedTeamUserId === userId ? null : userId;
  }

  get topCaptains(): PlayerPopularity[] {
    return [...this.playerPopularity].sort((a, b) => b.captainCount - a.captainCount).filter(p => p.captainCount > 0).slice(0, 5);
  }

  get topVCs(): PlayerPopularity[] {
    return [...this.playerPopularity].sort((a, b) => b.vcCount - a.vcCount).filter(p => p.vcCount > 0).slice(0, 5);
  }

  get topSelected(): PlayerPopularity[] {
    return [...this.playerPopularity].sort((a, b) => b.totalSelections - a.totalSelections).slice(0, 5);
  }

  get totalTeams(): number {
    return this.playerPopularity.length > 0
      ? Math.max(...this.playerPopularity.map(p => p.captainCount + p.vcCount + p.playerCount))
      : 0;
  }

  get totalTeamCount(): number {
    return this.adminTeams.length || this.playerPopularity.reduce((max, p) => Math.max(max, p.captainCount), 0);
  }

  getPaddedPlayers(players: Dream8Player[]): (Dream8Player | null)[] {
    const result: (Dream8Player | null)[] = players.slice(0, 6);
    while (result.length < 6) result.push(null);
    return result;
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
    return this.isTeamComplete && this.totalCost <= this.BUDGET && !!this.captainId && !!this.viceCaptainId;
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
        this.messageService.add({ severity: 'warn', summary: 'Team Full', detail: `You can only select ${this.TEAM_SIZE} players`, life: 2000 });
        return;
      }
      if (this.totalCost + player.soldPrice > this.BUDGET) {
        this.messageService.add({ severity: 'warn', summary: 'Over Budget!', detail: `Adding ${player.name} (₹${player.soldPrice}) exceeds the ₹${this.BUDGET} budget`, life: 2500 });
        return;
      }
      this.selectedPlayerIds.add(player.supabaseId);
    }
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
    if (this.captainId === playerId) { this.captainId = null; return; }
    if (this.viceCaptainId === playerId) this.viceCaptainId = null;
    this.captainId = playerId;
  }

  setViceCaptain(playerId: string): void {
    if (this.viceCaptainId === playerId) { this.viceCaptainId = null; return; }
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
    const success = await this.dream8Service.saveTeam(
      Array.from(this.selectedPlayerIds), this.totalCost,
      this.captainId ?? undefined, this.viceCaptainId ?? undefined
    );
    if (success) {
      this.messageService.add({ severity: 'success', summary: '✅ Team Saved!', detail: `Your Dream 8 team has been saved (₹${this.totalCost}/${this.BUDGET})`, life: 3000 });
    } else {
      this.messageService.add({ severity: 'error', summary: '❌ Save Failed', detail: 'Could not save your team. Please try again.', life: 3000 });
    }
    this.isSaving = false;
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
    if (this.showPreview) this.showStatsView = false;
  }

  applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredPlayers = [...this.allPlayers];
    } else {
      this.filteredPlayers = this.allPlayers.filter(p =>
        p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
      );
    }
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  getRoleIcon(_role: string): string {
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
