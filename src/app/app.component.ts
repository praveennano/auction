// app.component.ts - Updated with safe storage loading
import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuctionService } from './service/auction.service';
//import { AuctionStorageService, AuctionState } from './service/auction-storage.service';
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
  teams: Team[] = [];
  availablePlayers: Player[] = [];
  soldPlayers: Player[] = [];
  unsoldPlayers: Player[] = [];
  currentPlayer: Player | null = null;
  auctionInProgress: boolean = false;
  currentBid: number = 0;
  currentTeam: Team | null = null;
  
  private subscriptions: Subscription = new Subscription();
  private autoSaveInterval: any;
  private hasLoadedFromStorage = false;
  private isBrowser: boolean;
  private buttonLoadingStates: { [key: string]: boolean } = {};

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private auctionService: AuctionService,
   // private storageService: AuctionStorageService,
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
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        this.loadSavedState();
        this.setupAutoSave();
      }, 100);
    } else {
      console.log('🖥️ Running in server environment, skipping localStorage operations');
      this.hasLoadedFromStorage = true; // Allow normal operation without storage
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions and auto-save
    this.subscriptions.unsubscribe();
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    // Save state before component destruction (only in browser)
    if (this.isBrowser) {
      this.saveCurrentState();
    }
  }

private loadSavedState(): void {
  if (!this.isBrowser) {
    console.log('⚠️ Skipping loadSavedState: not in browser environment');
    return;
  }

  try {
    const savedState = this.auctionService.loadAuctionState();
    if (savedState) {
      console.log('📂 Loading saved auction state...');
      
      // Use your existing restoreState method signature
      this.auctionService.restoreState(
        savedState.teams,
        savedState.availablePlayers,
        savedState.unsoldPlayers,
        savedState.currentPlayer,
        savedState.currentBid,
        savedState.currentTeam,
        savedState.auctionInProgress
      );
      
      this.hasLoadedFromStorage = true;
      
      // Show notification with player info
      const playerNames = savedState.availablePlayers?.map((p: any) => p.name).slice(0, 3).join(', ') || 'custom players';
      this.messageService.add({
        severity: 'success',
        summary: 'Data Restored',
        detail: `Auction data loaded with players: ${playerNames}...`
      });
    } else {
      console.log('🆕 Starting fresh auction with custom players');
      this.hasLoadedFromStorage = true;
      
      this.messageService.add({
        severity: 'info',
        summary: 'Fresh Start', 
        detail: 'Starting with custom players: Sharan, Saravanan, SNK, DG...'
      });
    }
  } catch (error) {
    console.error('❌ Error during loadSavedState:', error);
    this.hasLoadedFromStorage = true;
    
    this.messageService.add({
      severity: 'warn',
      summary: 'Storage Error',
      detail: 'Could not load saved data. Starting with fresh custom players.'
    });
  }
}

  private subscribeToAuctionUpdates(): void {
    // Subscribe to teams
    this.subscriptions.add(
      this.auctionService.teams$.subscribe(teams => {
        this.teams = teams;
        
        // Calculate sold players by collecting all players across teams
        this.soldPlayers = [];
        teams.forEach(team => {
          this.soldPlayers = [...this.soldPlayers, ...team.players];
        });
        
        // Auto-save when teams update (but not during initial load)
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

    // Auto-save every 10 seconds
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
      lastUpdated: new Date().toISOString()
    };
    
    this.auctionService.saveAuctionState(currentState);
  } catch (error) {
    console.error('❌ Error saving current state:', error);
  }
}

  // Reset auction with confirmation
resetAuction(): void {
  this.confirmationService.confirm({
    message: 'Are you sure you want to reset the entire auction? This will load your custom players (Sharan, Saravanan, SNK, DG, Pradeep, Nagi, Umesh, Sarath) and clear all team data. This action cannot be undone!',
    header: '🔄 Reset Auction',
    icon: 'pi pi-exclamation-triangle',
    acceptButtonStyleClass: 'p-button-danger',
    rejectButtonStyleClass: 'p-button-secondary',
    acceptLabel: 'Yes, Reset Everything',
    rejectLabel: 'Cancel',
    accept: () => {
      // Add loading state to reset button
      this.setButtonLoading('reset', true);
      
      try {
        // Show initial toast
        this.messageService.add({
          severity: 'info',
          summary: 'Resetting Auction',
          detail: 'Clearing data and loading custom players...',
          life: 2000
        });
        
        // CRITICAL: Clear storage FIRST to remove old cached data
        if (this.isBrowser) {
          try {
            localStorage.removeItem('cwf_auction_data');
            console.log('🗑️ Cleared old auction data from localStorage');
          } catch (error) {
            console.error('Error clearing localStorage:', error);
          }
        }
        
        // Reset auction service (this will initialize with custom players)
        this.auctionService.resetAuction();
        
        // Reset component state
        this.hasLoadedFromStorage = true;
        
        // Success feedback with delay for better UX
        setTimeout(() => {
          this.messageService.add({
            severity: 'success',
            summary: '✅ Auction Reset Complete',
            detail: 'Custom players loaded: Sharan, Saravanan, SNK, DG, Pradeep, Nagi, Umesh, Sarath',
            life: 5000
          });
          
          this.setButtonLoading('reset', false);
          
          // Force refresh of available players display
          console.log('🔄 Current available players:', this.availablePlayers.map(p => p.name));
        }, 1000);
        
        console.log('🔄 Auction completely reset with custom players');
        
      } catch (error) {
        console.error('❌ Error during reset:', error);
        
        this.messageService.add({
          severity: 'error',
          summary: '❌ Reset Failed',
          detail: 'Could not reset auction completely. Please try again.',
          life: 5000
        });
        
        this.setButtonLoading('reset', false);
      }
    },
    reject: () => {
      // Show cancel feedback
      this.messageService.add({
        severity: 'info',
        summary: 'Reset Cancelled',
        detail: 'Auction data remains unchanged.',
        life: 2000
      });
    }
  });
}


// CORRECTED - Manual save
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

  // Add loading state
  this.setButtonLoading('save', true);

  try {
    // Show saving toast
    this.messageService.add({
      severity: 'info',
      summary: '💾 Saving Data',
      detail: 'Storing auction state...',
      life: 1500
    });

    this.saveCurrentState();
    
    // Success feedback with delay
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

  // Get storage info for display
  getStorageInfo(): any {
    if (!this.isBrowser) {
      return null;
    }
    return this.auctionService.getSavedStateSummary();
  }

  setButtonLoading(buttonType: string, loading: boolean): void {
  this.buttonLoadingStates[buttonType] = loading;
  
  // Update DOM classes for visual feedback
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


  // Debug method to check storage status
  getStorageStatus(): any {
    return this.auctionService.getBrowserStatus();
  }

  // All your existing methods remain the same...
  getBidIncrement(currentBid: number): number {
    if (currentBid < 250) {
      return 10;
    } else if (currentBid >= 250 && currentBid < 400) {
      return 20;
    } else {
      return 30;
    }
  }

  getNextBidAmount(): number {
    return this.currentBid + this.getBidIncrement(this.currentBid);
  }

  placeBid(teamId: number, amount?: number): void {
    const bidAmount = amount || this.getNextBidAmount();
    this.auctionService.placeBid(teamId, bidAmount);
  }

  canTeamAffordNextBid(team: Team): boolean {
    const nextBidAmount = this.getNextBidAmount();
    return team.budget >= nextBidAmount;
  }

  startAuction(): void {
    this.auctionService.startPlayerAuction();
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

// Add these methods to your app.component.ts

// Helper method to get position text for non-bowlers
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

// Enhanced method to format large numbers
formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

// Method to get player performance rating based on stats
getPlayerRating(player: Player): string {
  let rating = 0;
  
  // MVP ranking contributes to rating (lower rank = higher rating)
  if (player.mvpRanking) {
    rating += (30 - player.mvpRanking) / 30 * 40; // Max 40 points from MVP
  }
  
  // Batting stats contribute
  const strikeRatePoints = Math.min(player.battingStats.strikeRate / 100 * 30, 30); // Max 30 points
  rating += strikeRatePoints;
  
  // Bowling stats contribute (if available)
  if (player.bowlingStats) {
    const economyPoints = Math.max(0, (8 - player.bowlingStats.economy) / 8 * 30); // Max 30 points
    rating += economyPoints;
  }
  
  if (rating >= 80) return 'Excellent';
  if (rating >= 60) return 'Good';
  if (rating >= 40) return 'Average';
  return 'Developing';
}

// Method to get stat color class
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

// Method to check if player is a premium player
isPremiumPlayer(player: Player): boolean {
  return player.mvpRanking <= 10 || 
         player.battingStats.strikeRate >= 150 || 
         (player.bowlingStats?.economy !== undefined && player.bowlingStats.economy <= 8);
}

// Method to get team strength based on players
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
    : 50; // Default if no bowlers
  
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

  // Computed properties
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
}