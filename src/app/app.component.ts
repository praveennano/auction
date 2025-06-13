// app.component.ts - Complete File with Pool Logic Hidden from UI

import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuctionService, PlayerPool } from './service/auction.service';
import { Team } from './models/team.model';
import { Player, PlayerRole } from './models/player.model';
import { combineLatest, Subscription } from 'rxjs';
import { AuctionComponent } from './component/auction/auction.component';
import { AuctionStatsComponent } from './component/auction-stats/auction-stats.component';
import { PlayerListComponent } from './component/player-list/player-list.component';
import { TeamListComponent } from './component/team-list/team-list.component';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PlayerWordcloudComponent } from './player-wordcloud/player-wordcloud.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    CommonModule,
    AuctionComponent,
    AuctionStatsComponent,
    PlayerListComponent,
    TeamListComponent,
    CardModule,
    FormsModule,
    PlayerWordcloudComponent,
    ButtonModule,
    InputTextModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Cricket Player Auction';
  
  // Basic auction properties (visible to UI)
  teams: Team[] = [];
  availablePlayers: Player[] = [];
  soldPlayers: Player[] = [];
  unsoldPlayers: Player[] = [];
   isEditingBid: boolean = false;
  editBidAmount: number = 0;
  currentPlayer: Player | null = null;
  auctionInProgress: boolean = false;
  currentBid: number = 0;
  currentTeam: Team | null = null;
  
  // PRIVATE: Pool-related properties (hidden from UI, used internally)
  private pools: PlayerPool[] = [];
  private currentPool: PlayerPool | null = null;
  
  // System properties
  private subscriptions: Subscription = new Subscription();
  private autoSaveInterval: any;
  private hasLoadedFromStorage = false;
  private isBrowser: boolean;
  private buttonLoadingStates: { [key: string]: boolean } = {};

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private auctionService: AuctionService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
  
  ngOnInit(): void {
    // Initialize subscription to auction updates first
    this.subscribeToAuctionUpdates();
    
    // Load saved state only in browser
    if (this.isBrowser) {
      setTimeout(() => {
        this.loadSavedState();
        this.setupAutoSave();
      }, 100);
    } else {
      this.hasLoadedFromStorage = true;
    }

    // PRIVATE: Subscribe to pool updates (for internal logic only)
    this.subscribeToPoolUpdatesInternal();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    if (this.isBrowser) {
      this.saveCurrentState();
    }
  }

  // ================================
  // PRIVATE POOL METHODS (HIDDEN FROM UI)
  // ================================

  private subscribeToPoolUpdatesInternal(): void {
    // Keep pool state updated internally for logic purposes
    this.subscriptions.add(
      this.auctionService.pools$.subscribe(pools => {
        this.pools = pools;
      })
    );

    this.subscriptions.add(
      this.auctionService.currentPool$.subscribe(currentPool => {
        this.currentPool = currentPool;
      })
    );
  }

  // ================================
  // LOAD/SAVE STATE METHODS
  // ================================

  private loadSavedState(): void {
    if (!this.isBrowser) {
      console.log('⚠️ Skipping loadSavedState: not in browser environment');
      return;
    }

    try {
      const savedState = this.auctionService.loadAuctionState();
      if (savedState) {
        console.log('📂 Loading saved auction state...');
        
        this.auctionService.restoreState(
          savedState.teams,
          savedState.availablePlayers,
          savedState.unsoldPlayers,
          savedState.currentPlayer,
          savedState.currentBid,
          savedState.currentTeam,
          savedState.auctionInProgress,
          savedState.pools,
          savedState.currentPool
        );
        
        this.hasLoadedFromStorage = true;
        
        const playerNames = savedState.availablePlayers?.map((p: any) => p.name).slice(0, 3).join(', ') || 'custom players';
        this.messageService.add({
          severity: 'success',
          summary: 'Data Restored',
          detail: `Auction data loaded with players: ${playerNames}...`
        });
      } else {
        console.log('🆕 Starting fresh auction');
        this.hasLoadedFromStorage = true;
        
        this.messageService.add({
          severity: 'info',
          summary: 'Fresh Auction', 
          detail: 'Starting new auction with all players'
        });
      }
    } catch (error) {
      console.error('❌ Error during loadSavedState:', error);
      this.hasLoadedFromStorage = true;
      
      this.messageService.add({
        severity: 'warn',
        summary: 'Storage Error',
        detail: 'Could not load saved data. Starting fresh auction.'
      });
    }
  }

  private subscribeToAuctionUpdates(): void {
    // Subscribe to teams
    this.subscriptions.add(
      this.auctionService.teams$.subscribe(teams => {
        this.teams = teams;
        
        this.soldPlayers = [];
        teams.forEach(team => {
          this.soldPlayers = [...this.soldPlayers, ...team.players];
        });
        
        if (this.hasLoadedFromStorage && this.isBrowser) {
          this.saveCurrentState();
        }
      })
    );
    
    // Subscribe to available players
    this.subscriptions.add(
      this.auctionService.availablePlayers$.subscribe(players => {
        this.availablePlayers = players;
        if (this.hasLoadedFromStorage && this.isBrowser) {
          this.saveCurrentState();
        }
      })
    );
    
    // Subscribe to unsold players
    this.subscriptions.add(
      this.auctionService.unsoldPlayers$.subscribe(players => {
        this.unsoldPlayers = players;
        if (this.hasLoadedFromStorage && this.isBrowser) {
          this.saveCurrentState();
        }
      })
    );
    
    // Subscribe to current auction state
    this.subscriptions.add(
      combineLatest([
        this.auctionService.currentPlayer$,
        this.auctionService.currentBid$,
        this.auctionService.currentTeam$,
        this.auctionService.auctionInProgress$
      ]).subscribe(([player, bid, team, inProgress]) => {
        this.currentPlayer = player;
        this.currentBid = bid;
        this.currentTeam = team;
        this.auctionInProgress = inProgress;
        
        if (this.hasLoadedFromStorage && this.isBrowser) {
          this.saveCurrentState();
        }
      })
    );
  }

  private setupAutoSave(): void {
    if (!this.isBrowser) {
      console.log('⚠️ Skipping auto-save setup: not in browser environment');
      return;
    }

    this.autoSaveInterval = setInterval(() => {
      if (this.hasLoadedFromStorage) {
        this.saveCurrentState();
      }
    }, 10000);
  }

  private saveCurrentState(): void {
    if (!this.isBrowser) {
      console.log('⚠️ Skipping saveCurrentState: not in browser environment');
      return;
    }

    try {
      const currentState: any = {
        teams: this.teams,
        availablePlayers: this.availablePlayers,
        unsoldPlayers: this.unsoldPlayers,
        currentPlayer: this.currentPlayer,
        currentBid: this.currentBid,
        currentTeam: this.currentTeam,
        auctionInProgress: this.auctionInProgress,
        pools: this.pools,
        currentPool: this.currentPool,
        lastUpdated: new Date().toISOString()
      };
      
      this.auctionService.saveAuctionState(currentState);
    } catch (error) {
      console.error('❌ Error saving current state:', error);
    }
  }

  // ================================
  // PUBLIC AUCTION METHODS (UI VISIBLE)
  // ================================

  startAuction(): void {
    // Pool logic handled internally by service
    this.auctionService.startPlayerAuction();
  }

  resetAuction(): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to reset the entire auction? This will clear all team data and restart with all players. This action cannot be undone!`,
      header: '🔄 Reset Auction',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      acceptLabel: 'Yes, Reset Everything',
      rejectLabel: 'Cancel',
      accept: () => {
        this.setButtonLoading('reset', true);
        
        try {
          this.messageService.add({
            severity: 'info',
            summary: 'Resetting Auction',
            detail: 'Clearing data and restarting...',
            life: 2000
          });
          
          if (this.isBrowser) {
            try {
              localStorage.removeItem('cwf_auction_data');
              console.log('🗑️ Cleared old auction data from localStorage');
            } catch (error) {
              console.error('Error clearing localStorage:', error);
            }
          }
          
          this.auctionService.resetAuction();
          this.hasLoadedFromStorage = true;
          
          setTimeout(() => {
            this.messageService.add({
              severity: 'success',
              summary: '✅ Auction Reset Complete',
              detail: 'Auction reset with all players ready',
              life: 5000
            });
            
            this.setButtonLoading('reset', false);
          }, 1000);
          
        } catch (error) {
          console.error('❌ Error during reset:', error);
          this.messageService.add({
            severity: 'error',
            summary: '❌ Reset Failed',
            detail: 'Could not reset auction. Please try again.',
            life: 5000
          });
          this.setButtonLoading('reset', false);
        }
      },
      reject: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Reset Cancelled',
          detail: 'Auction data remains unchanged.',
          life: 2000
        });
      }
    });
  }

  saveAuctionData(): void {
    if (!this.isBrowser) {
      this.messageService.add({
        severity: 'warn',
        summary: '⚠️ Save Unavailable',
        detail: 'Storage not available in this environment',
        life: 3000
      });
      return;
    }

    this.setButtonLoading('save', true);

    try {
      this.messageService.add({
        severity: 'info',
        summary: '💾 Saving Data',
        detail: 'Storing auction state...',
        life: 1500
      });

      this.saveCurrentState();
      
      setTimeout(() => {
        this.messageService.add({
          severity: 'success',
          summary: '✅ Data Saved Successfully',
          detail: `Auction saved at ${new Date().toLocaleTimeString()}`,
          life: 3000
        });
        
        this.setButtonLoading('save', false);
      }, 800);
      
    } catch (error) {
      console.error('❌ Error during manual save:', error);
      this.messageService.add({
        severity: 'error',
        summary: '❌ Save Failed',
        detail: 'Could not save auction data. Please try again.',
        life: 4000
      });
      this.setButtonLoading('save', false);
    }
  }

  // ================================
  // EXISTING AUCTION METHODS
  // ================================

  getBidIncrement(currentBid: number): number {
    if (currentBid < 250) {
      return 10;
    } else if (currentBid >= 250 && currentBid < 400) {
      return 20;
    } else {
      return 30;
    }
  }

  getMaxBidForTeam(team: Team): number {
  const teamCapacity = this.getTeamCapacityInfo(team);
  
  // If team is full, they can't bid
  if (teamCapacity.full) {
    return 0;
  }
  
  const remainingSlotsAfterBid = teamCapacity.remainingSlots - 1;
  const minimumNeededForRemainingSlots = remainingSlotsAfterBid * 100; // Base price is 100
  const maxBid = team.budget - minimumNeededForRemainingSlots;
  
  // Ensure it's at least 0
  return Math.max(maxBid, 0);
}


  getNextBidAmount(): number {

    if (this.isEditingBid) {
      return this.editBidAmount;
    }
  // Special case: if no one has bid yet (currentTeam is null) and currentBid is base price (100)
  // then the first bid should be the same as base price (100)
  if (!this.currentTeam && this.currentBid === this.currentPlayer?.basePrice) {
    return this.currentBid; // First bid is exactly base price (100)
  }
    return this.currentBid + this.getBidIncrement(this.currentBid);
}
  

  placeBid(teamId: number, amount?: number): void {

     if (this.isEditingBid) {
      this.messageService.add({
        severity: 'info',
        summary: 'Finish Editing',
        detail: 'Please confirm or cancel the bid edit first',
        life: 2000
      });
      return;
    }
    const bidAmount = amount || this.getNextBidAmount();
    this.auctionService.placeBid(teamId, bidAmount);
  }

canTeamAffordNextBid(team: Team): boolean {

     if (this.isEditingBid) {
      return false;
    }

  const nextBidAmount = this.getNextBidAmount();
  const maxBid = this.getMaxBidForTeam(team);
  const teamCapacity = this.getTeamCapacityInfo(team);
  
  // Team is full
  if (teamCapacity.full) {
    return false;
  }
  
  // Check if team can afford the next bid amount
  return maxBid >= nextBidAmount;
}

getBidButtonText(team: Team): string {

  if (this.isEditingBid) {
      return 'Editing...';
    }

  const teamCapacity = this.getTeamCapacityInfo(team);
  const nextBidAmount = this.getNextBidAmount();
  const maxBid = this.getMaxBidForTeam(team);
  
  // Team is full
  if (teamCapacity.full) {
    return 'FULL';
  }
  
  // Team can't afford next bid - show their maximum possible bid
  if (maxBid < nextBidAmount) {
    return `Max ${maxBid}`;
  }
  
  // Normal bid - show next bid amount
  return `Bid ${nextBidAmount}`;
}

getBidButtonTooltip(team: Team): string {

   if (this.isEditingBid) {
      return 'Please finish editing the bid amount first';
    }

  const teamCapacity = this.getTeamCapacityInfo(team);
  const maxBid = this.getMaxBidForTeam(team);
  const nextBidAmount = this.getNextBidAmount();
  
  if (teamCapacity.full) {
    return 'Team Full (8/8 players)';
  }
  
  if (maxBid < nextBidAmount) {
    return `Cannot afford ${nextBidAmount}. Maximum possible bid: ${maxBid}`;
  }
  
  return `Next bid: ${nextBidAmount}. Team can bid up to: ${maxBid}`;
}

  sellPlayer(): void {
    this.auctionService.sellPlayer();
  }

  markUnsold(): void {
    this.auctionService.markUnsold();
  }

  startNextRound(): void {
    this.auctionService.startNextRound();
  }

  // ================================
  // UTILITY METHODS
  // ================================

  getPositionText(role: string | PlayerRole): string {
    switch (role) {
      case PlayerRole.BATSMAN:
      case 'Batsman':
        return 'Top Order';
      case PlayerRole.WICKET_KEEPER:
      case 'Wicket Keeper':
        return 'Keeper';
      case PlayerRole.ALL_ROUNDER:
      case 'All-Rounder':
        return 'All Round';
      default:
        return 'Specialist';
    }
  }

  getRoleClass(role: string | PlayerRole): string {
    switch (role) {
      case PlayerRole.BATSMAN:
      case 'Batsman':
        return 'batsman';
      case PlayerRole.BOWLER:
      case 'Bowler':
        return 'bowler';
      case PlayerRole.ALL_ROUNDER:
      case 'All-Rounder':
        return 'all-rounder';
      case PlayerRole.WICKET_KEEPER:
      case 'Wicket Keeper':
        return 'wicket-keeper';
      default:
        return '';
    }
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  getPlayerRating(player: Player): string {
    let rating = 0;
    
    if (player.mvpRanking) {
      rating += (30 - player.mvpRanking) / 30 * 40;
    }
    
    const strikeRatePoints = Math.min(player.battingStats.strikeRate / 100 * 30, 30);
    rating += strikeRatePoints;
    
    if (player.bowlingStats) {
      const economyPoints = Math.max(0, (8 - player.bowlingStats.economy) / 8 * 30);
      rating += economyPoints;
    }
    
    if (rating >= 80) return 'Excellent';
    if (rating >= 60) return 'Good';
    if (rating >= 40) return 'Average';
    return 'Developing';
  }

  getStatColorClass(statType: string, value: number): string {
    switch (statType) {
      case 'strikeRate':
        if (value >= 120) return 'stat-excellent';
        if (value >= 100) return 'stat-good';
        if (value >= 80) return 'stat-average';
        return 'stat-poor';
      
      case 'economy':
        if (value <= 3) return 'stat-excellent';
        if (value <= 4) return 'stat-good';
        if (value <= 5) return 'stat-average';
        return 'stat-poor';
      
      case 'mvpRanking':
        if (value <= 5) return 'stat-excellent';
        if (value <= 10) return 'stat-good';
        if (value <= 20) return 'stat-average';
        return 'stat-poor';
      
      default:
        return '';
    }
  }

  isPremiumPlayer(player: Player): boolean {
    return player.mvpRanking <= 10 || 
           player.battingStats.strikeRate >= 150 || 
           (player.bowlingStats?.economy !== undefined && player.bowlingStats.economy <= 8);
  }

  getTeamStrength(team: Team): { batting: number, bowling: number, overall: string } {
    if (team.players.length === 0) {
      return { batting: 0, bowling: 0, overall: 'No Players' };
    }
    
    const battingStrength = team.players.reduce((sum, player) => {
      return sum + (player.battingStats.strikeRate / 100);
    }, 0) / team.players.length * 100;
    
    const bowlers = team.players.filter(p => p.bowlingStats);
    const bowlingStrength = bowlers.length > 0 
      ? bowlers.reduce((sum, player) => {
          return sum + (8 - (player.bowlingStats?.economy || 8));
        }, 0) / bowlers.length * 100 / 8 * 100
      : 50;
    
    const overall = (battingStrength + bowlingStrength) / 2;
    
    let overallText = 'Developing';
    if (overall >= 80) overallText = 'Strong';
    else if (overall >= 60) overallText = 'Balanced';
    else if (overall >= 40) overallText = 'Growing';
    
    return {
      batting: Math.round(battingStrength),
      bowling: Math.round(bowlingStrength),
      overall: overallText
    };
  }

  getTeamForPlayer(player: Player): Team | null {
    if (!player.teamId) return null;
    return this.teams.find(team => team.id === player.teamId) || null;
  }

  selectPlayerForAuction(player: Player): void {
    const availablePlayersList = this.availablePlayers.filter(p => p.id !== player.id);
    
    this.currentPlayer = player;
    this.currentBid = player.basePrice;
    this.currentTeam = null;
    this.auctionInProgress = true;
    this.availablePlayers = availablePlayersList;
  }

  // NEW METHOD: Get team capacity info
 getTeamCapacityInfo(team: Team): { 
  current: number; 
  max: number; 
  full: boolean;
  remainingSlots: number;
} {
  const current = team.players.length;
  const max = 8;
  const remainingSlots = max - current;
  
  return {
    current,
    max,
    full: current >= max,
    remainingSlots
  };
}

  // NEW METHOD: Check if auction should end (all teams full)
  shouldEndAuction(): boolean {
    return this.teams.every(team => team.players.length >= 8);
  }

  setButtonLoading(buttonType: string, loading: boolean): void {
    this.buttonLoadingStates[buttonType] = loading;
    
    const buttonElement = document.querySelector(`.btn-${buttonType}`);
    if (buttonElement) {
      if (loading) {
        buttonElement.classList.add('loading');
        buttonElement.setAttribute('disabled', 'true');
      } else {
        buttonElement.classList.remove('loading');
        buttonElement.removeAttribute('disabled');
      }
    }
  }

  isButtonLoading(buttonType: string): boolean {
    return this.buttonLoadingStates[buttonType] || false;
  }

  // ================================
  // COMPUTED PROPERTIES
  // ================================

  get totalPlayers(): number {
    return this.soldPlayers.length + this.unsoldPlayers.length + this.availablePlayers.length;
  }

  get soldPercentage(): number {
    if (this.totalPlayers === 0) return 0;
    return Math.round((this.soldPlayers.length / this.totalPlayers) * 100);
  }

  get unsoldPercentage(): number {
    if (this.totalPlayers === 0) return 0;
    return Math.round((this.unsoldPlayers.length / this.totalPlayers) * 100);
  }

  get pendingPercentage(): number {
    if (this.totalPlayers === 0) return 0;
    return Math.round((this.availablePlayers.length / this.totalPlayers) * 100);
  }

  // ================================
  // DEBUG METHODS
  // ================================

  getStorageInfo(): any {
    if (!this.isBrowser) {
      return null;
    }
    return this.auctionService.getSavedStateSummary();
  }

  getStorageStatus(): any {
    return this.auctionService.getBrowserStatus();
  }

  getSoldPlayersCount(): number {
    return this.teams.reduce(
      (count, team) => count + team.players.length, 
      0
    );
  }

   startEditingBid(): void {
    if (!this.currentPlayer || !this.auctionInProgress) {
      return;
    }
    
    this.isEditingBid = true;
    this.editBidAmount = this.currentBid;
    
    // Focus the input after the view updates
    setTimeout(() => {
      const inputElement = document.querySelector('.bid-input') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }, 100);
  }
  
  confirmBidEdit(): void {
    if (!this.isValidBidAmount(this.editBidAmount)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Bid Amount',
        detail: `Bid must be between ${this.currentPlayer?.basePrice} and ${this.getMaxPossibleBid()}`,
        life: 3000
      });
      return;
    }
    this.currentBid = this.editBidAmount;
      if (this.currentTeam && this.editBidAmount > this.currentBid) {
      this.currentTeam = null;
      this.auctionService['currentTeam'].next(null);
    }
    
    // Update the auction service with the new bid
    this.auctionService['currentBid'].next(this.editBidAmount);
    
    this.isEditingBid = false;
    
    this.messageService.add({
      severity: 'success',
      summary: 'Bid Updated',
      detail: `Current bid set to ${this.editBidAmount}`,
      life: 2000
    });
  }

  cancelBidEdit(): void {
    this.isEditingBid = false;
    this.editBidAmount = this.currentBid;
  }
  
  isValidBidAmount(amount: number): boolean {
    if (!this.currentPlayer) return false;
    
    const minBid = this.currentPlayer.basePrice;
    const maxBid = this.getMaxPossibleBid();
    
    return amount >= minBid && amount <= maxBid && Number.isInteger(amount);
  }

  getMaxPossibleBid(): number {
    if (!this.currentPlayer) return 0;
    
    // Find the team with the highest budget that can still afford players
    let maxPossibleBid = 0;
    
    this.teams.forEach(team => {
      const teamCapacity = this.getTeamCapacityInfo(team);
      
      // Skip teams that are already full
      if (teamCapacity.full) return;
      
      const maxBidForTeam = this.getMaxBidForTeam(team);
      maxPossibleBid = Math.max(maxPossibleBid, maxBidForTeam);
    });
    
    return maxPossibleBid;
  }
}