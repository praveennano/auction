# RTM (Right To Match) Feature Documentation

## Overview

The RTM (Right To Match) feature is a cricket auction mechanic that allows teams to reclaim players they've sold for an additional fee at specific auction milestones. This document provides a comprehensive guide to understanding and using the RTM feature.

## Feature Specifications

### RTM Activation Rules

1. **First RTM Window**: Opens after the 5th player is sold
2. **Subsequent Windows**: Open at milestones: 10, 15, 20, 25, 30 players sold
3. **Eligible Players**: Only the last 5 players sold in each milestone group are eligible for RTM

### RTM Bidding Mechanics

- **RTM Price**: 110% of the winning bid for that player
- **Original Owner Benefit**: The team that originally owned the player can use RTM to reclaim them
- **One RTM Per Team**: Each team gets exactly ONE RTM use per auction
- **RTM Consumption**: RTM is only consumed when a team WINS via RTM, not when they bid
- **Loser Retention**: Teams that lose an RTM bid keep their RTM allowance

### RTM Financial Flow

1. Winner team pays RTM price (110% of original bid)
2. Original owner receives the full RTM amount
3. New owner's budget is deducted by RTM amount
4. Original owner loses the player

## User Interface Components

### 1. RTM Modal (`rtm-modal.component.ts`)

**Purpose**: Displays the RTM window and handles bidding

**Features**:
- Shows eligible players for current RTM window
- Displays current highest bid for each player
- Allows teams to place/update RTM bids
- Shows all bids for transparency

**Usage**:
- Automatically opens when RTM window activates
- Overlays the main auction view
- Non-blocking: players can interact with other UI elements

### 2. RTM Badge Component (`rtm-badge.component.ts`)

**Purpose**: Shows RTM status on team cards

**Features**:
- Displays "RTM Available" badge when team hasn't used RTM
- Shows "RTM Used" badge after team uses RTM
- Includes timestamp of RTM usage

**Location**: Team list cards (under team info)

### 3. RTM Integration in Team List

**Location**: `team-list.component.html`

**Changes**:
- Added RTM badge below team header
- Displays before player list
- Visual indicator of RTM status at a glance

## Service Methods

### Core RTM Methods in `AuctionService`

#### `shouldActivateRtm(soldCount: number): boolean`
Checks if RTM should activate at current milestone.

**Parameters**:
- `soldCount`: Number of players sold so far

**Returns**: `true` if milestone reached, `false` otherwise

#### `openRtmWindow(soldCount: number): RtmWindow | null`
Opens a new RTM window with eligible players.

**Parameters**:
- `soldCount`: Number of players sold so far

**Returns**: RTM window object or null if conditions not met

#### `validateRtmBid(playerId: number, teamId: number, bidAmount: number): RtmValidation`
Validates if a team can place an RTM bid.

**Validation Checks**:
- RTM window is active
- Player is eligible for RTM
- Team has RTM available
- Team is not the original owner
- Bid is at least 110% of original price
- Team has sufficient budget

**Returns**: Validation result with status and message

#### `placeRtmBid(playerId: number, teamId: number, bidAmount: number): { success: boolean; message: string }`
Places an RTM bid for a player.

**Parameters**:
- `playerId`: ID of the player
- `teamId`: ID of the bidding team
- `bidAmount`: Amount being bid

**Returns**: Success/failure response

#### `getHighestRtmBid(playerId: number): RtmOffer | null`
Gets the highest bid for a specific player.

**Returns**: Highest bid object or null if no bids

#### `getRtmBidsForPlayer(playerId: number): RtmOffer[]`
Gets all bids for a player, sorted by amount descending.

**Returns**: Array of all bids for the player

#### `closeRtmForPlayer(playerId: number): Promise<RtmResult | null>`
Closes RTM for a player and processes the winner.

**Processing**:
1. Finds highest bid
2. Updates winner team budget
3. Removes player from original owner
4. Credits original owner with RTM amount
5. Transfers player to winner team
6. Marks RTM as used for winner team

**Returns**: Result object with transaction details

#### `getRtmBasePrice(playerId: number): number`
Calculates RTM price (110% of sold price).

**Returns**: Calculated RTM price

### Observable Streams

#### `rtmWindow$: Observable<RtmWindow | null>`
Emits when RTM window opens/closes.

#### `rtmOffers$: Observable<Map<number, RtmOffer[]>>`
Emits when RTM bids are placed/updated.

#### `soldCount$: Observable<number>`
Emits when sold count changes.

#### `rtmStatusChanged$: Subject<RTMStatusEvent>`
Emits RTM status change events (open/closed).

## Data Models

### RtmWindow
```typescript
interface RtmWindow {
  id: string;
  playerIds: number[];
  startSoldCount: number;
  endSoldCount: number;
  active: boolean;
  createdAt: number;
  offers: Map<number, RtmOffer[]>;
}
```

### RtmOffer
```typescript
interface RtmOffer {
  id: string;
  playerId: number;
  teamId: number;
  amount: number;
  createdAt: number;
}
```

### RtmResult
```typescript
interface RtmResult {
  playerId: number;
  winnerId: number;
  finalAmount: number;
  originalOwnerId: number;
  success: boolean;
  message: string;
}
```

### RtmValidation
```typescript
interface RtmValidation {
  valid: boolean;
  message: string;
  basePrice?: number;
}
```

## Team Model Enhancements

### New Team Properties

```typescript
rtmAvailable: boolean;        // Whether team can still use RTM
rtmUsedAt?: string;          // Timestamp of RTM usage
rtmUsedForPlayerId?: number;  // ID of player won via RTM
```

## Player Model Enhancements

### New Player Property

```typescript
ownerId?: number;  // Team that currently owns the player (after sale)
```

## Integration Points

### 1. In Auction Service `sellPlayer()` Method

When a player is sold:
1. Set `ownerId` on the sold player
2. Increment `soldCount`
3. Check if RTM milestone is reached
4. Open RTM window if applicable

### 2. In App Component

**Subscriptions Added**:
```typescript
private subscribeToRtmUpdates(): void {
  // RTM window subscription
  // Sold count subscription
  // RTM status changed subscription
}
```

**Properties Added**:
```typescript
rtmWindowActive = false;
soldCount = 0;
```

## User Flow

### Standard RTM Flow

1. **Auction Progress**: Players are sold normally
2. **Milestone Reached**: After 5, 10, 15, 20, 25, or 30 players sold
3. **RTM Window Opens**: Modal appears showing eligible players
4. **Teams Bid**: Teams place RTM bids on players they want to reclaim
5. **Highest Bid Wins**: Team with highest bid wins the player
6. **Transaction Complete**: 
   - Winner's budget deducted
   - Original owner credited
   - Player transferred to winner
   - Winner's RTM marked as used

### Edge Cases

#### No Bids
- RTM window closes automatically
- Player remains with current owner
- Auction continues

#### Insufficient Budget
- Bid is rejected with clear message
- Team keeps RTM for next window

#### Multiple Bids on Same Player
- Highest bid wins
- Only winner's RTM is consumed
- Losing bids are preserved

## Supabase Integration

### Tables

#### `rtm_windows`
Stores RTM window records for audit trail.

#### `rtm_offers`
Stores all RTM bids placed during auction.

### Key Columns in `teams` Table

- `rtm_available`: BOOLEAN - Current RTM status
- `rtm_used_at`: TIMESTAMP - When RTM was used
- `rtm_used_player_id`: BIGINT - Player won via RTM

### Key Column in `players` Table

- `owner_id`: BIGINT - Current owner after sale

## Testing Scenarios

### Scenario 1: Basic RTM Flow
1. Sell 5 players
2. RTM window opens
3. Team bids to reclaim a player
4. Winning bid is processed
5. Verify: Player transferred, budgets updated, RTM marked used

### Scenario 2: No RTM Bids
1. Open RTM window
2. Don't place any bids
3. Verify: Window closes, players stay with original owners

### Scenario 3: Losing Bid Retention
1. Team A bids on Player X
2. Team B bids higher on Player X
3. Team B wins
4. Verify: Team A still has RTM available for next window

### Scenario 4: Multiple RTM Windows
1. Sell 10 players (triggers 2nd RTM window)
2. Process RTM transactions
3. Verify: New window includes only last 5 players

### Scenario 5: Budget Constraints
1. Team has low budget
2. Try to place bid higher than budget
3. Verify: Rejection with budget message

## Error Handling

### Validation Errors
- "No active RTM window"
- "Player not eligible for RTM in current window"
- "Team not found"
- "Team has already used their RTM allowance"
- "Cannot use RTM on your own player"
- "RTM bid must be at least [X] (110% of [Y])"
- "Insufficient budget"

### Transaction Errors
- Budget rechecked at close (in case of concurrent bids)
- Atomic updates ensure consistency
- Fallback messages for database errors

## Performance Considerations

1. **Real-time Updates**: RTM bids update in real-time via observables
2. **Map-based Storage**: RTM offers stored in Map for O(1) lookup
3. **Subscription Cleanup**: All subscriptions cleaned up in `ngOnDestroy`
4. **Lazy Loading**: RTM modal only renders when window is active

## Future Enhancements

1. **RTM History**: Display past RTM transactions for reference
2. **RTM Strategy Tips**: Show which players are eligible soon
3. **RTM Notifications**: Push notifications for outbid alerts
4. **RTM Analytics**: Dashboard showing RTM usage patterns
5. **Multi-RTM**: Support for teams having multiple RTM uses in special auctions

## Troubleshooting

### RTM Modal Not Appearing
- Check if auction has reached a milestone (5, 10, 15, 20, 25, 30)
- Verify `rtmWindow$` is emitting

### Bids Not Updating
- Check browser console for errors
- Verify subscription is active
- Check network connectivity

### RTM Transaction Failed
- Check team budget in database
- Verify player ownership records
- Check for concurrent bid conflicts

## References

- `RtmModalComponent`: `/src/app/component/rtm-modal/`
- `RtmBadgeComponent`: `/src/app/component/rtm-badge/`
- `RtmModel`: `/src/app/models/rtm.model.ts`
- `AuctionService`: `/src/app/service/auction.service.ts`
