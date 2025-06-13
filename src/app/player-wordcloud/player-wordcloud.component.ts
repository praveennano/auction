import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player, ProcessedPlayer } from '../models/player.model';

@Component({
  selector: 'app-player-wordcloud',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-wordcloud.component.html',
  styleUrl: './player-wordcloud.component.scss'
})
export class PlayerWordcloudComponent implements OnInit, OnChanges {
  @Input() players: Player[] = [];
  @Input() isUnsoldMode: boolean = false;
  @Input() title: string = 'Players';
  
  processedPlayers: ProcessedPlayer[] = [];
  shuffledPlayers: ProcessedPlayer[] = [];

  ngOnInit() {
    console.log('📊 WordCloud initialized with players:', this.players.length);
    this.generateWordCloud();
  }

  ngOnChanges() {
    console.log('🔄 Players changed, regenerating word cloud. Count:', this.players.length);
    this.generateWordCloud();
  }

  private generateWordCloud() {
    if (!this.players || this.players.length === 0) {
      console.log('⚠️ No players available for word cloud');
      this.processedPlayers = [];
      this.shuffledPlayers = [];
      return;
    }

    console.log('🎨 Generating word cloud for players:', this.players.map(p => p.name));

    // Process all players with uniform styling
    this.processedPlayers = this.players.map((player, index) => {
      const score = this.calculatePlayerScore(player);
      
      // Same font size for all players
      const fontSize = this.isUnsoldMode ? 16 : 18;
      
      // Same color for all players
      const color = this.getPlayerColor();
      
      // Same font weight for all players
      const fontWeight = '600';

      return {
        ...player,
        fontSize,
        color,
        fontWeight,
        score,
        position: { left: '0%', top: '0%' } // Not used in flexbox layout
      };
    });

    // Shuffle players for random visual distribution
    this.shuffledPlayers = this.shuffleArray([...this.processedPlayers]);
  }

  private getPlayerColor(): string {
    // Same color for all players
    if (this.isUnsoldMode) {
      return '#dc2626'; // Red for unsold players
    } else {
      return '#2563eb'; // Blue for available players
    }
  }

  private calculatePlayerScore(player: Player): number {
    let score = 0;
    
    // MVP ranking contribution
    if (player.mvpRanking && player.mvpRanking <= 30) {
      score += Math.max(0, 35 - player.mvpRanking);
    }
    
    // Batting stats contribution
    if (player.battingStats?.runs > 0) {
      score += Math.min(15, player.battingStats.runs / 40);
    }
    
    if (player.battingStats?.strikeRate > 0) {
      score += Math.min(10, player.battingStats.strikeRate / 15);
    }
    
    // Bowling stats contribution
    if (player.bowlingStats?.wickets) {
      score += Math.min(10, player.bowlingStats.wickets * 1.5);
    }
    
    if (player.bowlingStats?.economy && player.bowlingStats.economy > 0) {
      score += Math.min(8, Math.max(0, (12 - player.bowlingStats.economy)));
    }
    
    return Math.max(1, Math.round(score));
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  trackByPlayerId(index: number, player: ProcessedPlayer): number {
    return player.id;
  }

 
}