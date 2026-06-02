import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuctionService } from '../../service/auction.service';
import { RtmWindow, RtmOffer } from '../../models/rtm.model';
import { Team } from '../../models/team.model';
import { Player } from '../../models/player.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-rtm-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './rtm-modal.component.html',
  styleUrls: ['./rtm-modal.component.css']
})
export class RtmModalComponent implements OnInit, OnDestroy {
  rtmWindow: RtmWindow | null = null;
  rtmOffers: Map<number, RtmOffer[]> = new Map();
  eligiblePlayers: Player[] = [];
  teams: Team[] = [];
  selectedTeam: Team | null = null;
  selectedPlayerId: number | null = null;
  rtmForm: FormGroup;

  private destroy$ = new Subject<void>();
  private selectedPlayerBidForm: FormGroup;

  constructor(
    public auctionService: AuctionService,
    private fb: FormBuilder
  ) {
    this.rtmForm = this.fb.group({
      playerId: [null, Validators.required],
      teamId: [null, Validators.required],
      bidAmount: [null, [Validators.required, Validators.min(1)]]
    });

    this.selectedPlayerBidForm = this.fb.group({
      bidAmount: [null, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.auctionService.rtmWindow$
      .pipe(takeUntil(this.destroy$))
      .subscribe(window => {
        this.rtmWindow = window;
        if (window) {
          this.loadEligiblePlayers();
        }
      });

    this.auctionService.rtmOffers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(offers => {
        this.rtmOffers = offers;
      });

    this.auctionService.teams$
      .pipe(takeUntil(this.destroy$))
      .subscribe(teams => {
        this.teams = teams;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadEligiblePlayers(): void {
    if (!this.rtmWindow) return;

    const allTeams = this.teams;
    const allPlayers: Player[] = [];

    allTeams.forEach(team => {
      allPlayers.push(...team.players);
    });

    this.eligiblePlayers = allPlayers.filter(p => this.rtmWindow?.playerIds.includes(p.id));
  }

  selectPlayer(playerId: number): void {
    this.selectedPlayerId = playerId;
    const basePrice = this.auctionService.getRtmBasePrice(playerId);
    this.selectedPlayerBidForm.patchValue({
      bidAmount: basePrice
    });
  }

  placeBid(): void {
    if (!this.selectedTeam || !this.selectedPlayerId) {
      alert('Please select a team and player');
      return;
    }

    const bidAmount = this.selectedPlayerBidForm.get('bidAmount')?.value;
    if (!bidAmount) {
      alert('Please enter a bid amount');
      return;
    }

    const result = this.auctionService.placeRtmBid(
      this.selectedPlayerId,
      this.selectedTeam.id,
      bidAmount
    );

    if (result.success) {
      alert(`✅ RTM bid placed for $${bidAmount}`);
      this.selectedPlayerBidForm.reset();
    } else {
      alert(`❌ ${result.message}`);
    }
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
  }

  getHighestBidForPlayer(playerId: number): RtmOffer | null {
    return this.auctionService.getHighestRtmBid(playerId);
  }

  getBidsForPlayer(playerId: number): RtmOffer[] {
    return this.auctionService.getRtmBidsForPlayer(playerId);
  }

  getRtmBasePrice(playerId: number): number {
    return this.auctionService.getRtmBasePrice(playerId);
  }

  canTeamBidRtm(teamId: number): boolean {
    const team = this.teams.find(t => t.id === teamId);
    return team ? team.rtmAvailable : false;
  }

  getTeamName(teamId: number): string {
    return this.teams.find(t => t.id === teamId)?.name || 'Unknown';
  }

  async closeRtmForPlayer(playerId: number): Promise<void> {
    const result = await this.auctionService.closeRtmForPlayer(playerId);
    if (result?.success) {
      alert(`✅ RTM completed! Team ${result.winnerId} won Player ${playerId} for $${result.finalAmount}`);
    }
  }

  isRtmWindowActive(): boolean {
    return this.rtmWindow?.active ?? false;
  }
}
