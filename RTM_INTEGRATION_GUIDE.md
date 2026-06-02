# RTM Integration Guide for Auction System

## Quick Start

### 1. RTM is Already Integrated!

The RTM feature has been fully integrated into the auction system. Here's what's active:

✅ **Service Layer**: All RTM methods in `AuctionService`
✅ **UI Components**: RTM Modal and RTM Badge components
✅ **Data Models**: Team and Player models updated with RTM fields
✅ **Subscriptions**: App component subscribed to RTM events
✅ **Database**: Supabase schema prepared for RTM data

### 2. How RTM Works in the Auction Flow

```
Sell Player 1
    ↓
Sell Player 2
    ↓
Sell Player 3
    ↓
Sell Player 4
    ↓
Sell Player 5
    ↓
[RTM WINDOW OPENS] ← First RTM Milestone
    ↓ (Eligible: Players 1-5)
Teams place RTM bids on last 5 players
    ↓
Highest bids processed
    ↓
Sell Player 6
    ↓
... continue auction ...
    ↓
Sell Player 10
    ↓
[RTM WINDOW OPENS] ← Second RTM Milestone
    ↓ (Eligible: Players 6-10)
... and so on at milestones 15, 20, 25, 30
```

## System Architecture

### Component Hierarchy

```
AppComponent
├── AuctionComponent (Main auction flow)
├── RtmModalComponent (RTM bidding interface)
├── TeamListComponent
│   └── RtmBadgeComponent (Per-team RTM status)
└── [Other components...]
```

### Data Flow

```
AuctionService (Core Logic)
├── sellPlayer()
│   ├── Sets ownerId on player
│   ├── Increments soldCount
│   └── Triggers RTM if milestone
│
├── RTM Methods
│   ├── shouldActivateRtm()
│   ├── openRtmWindow()
│   ├── validateRtmBid()
│   ├── placeRtmBid()
│   ├── closeRtmForPlayer()
│   └── getRtmBasePrice()
│
└── Observable Streams
    ├── rtmWindow$
    ├── rtmOffers$
    ├── soldCount$
    └── rtmStatusChanged$
         ↓
    AppComponent (Subscribes & updates UI)
         ↓
    RtmModalComponent (Displays RTM interface)
    RtmBadgeComponent (Shows RTM status)
```

## RTM Processing Pipeline

### Step 1: Detect RTM Milestone

**Location**: `AuctionService.sellPlayer()`

```typescript
// After player is sold:
this.soldCount.next(newSoldCount);

// Check if RTM should activate
if (this.shouldActivateRtm(newSoldCount)) {
  this.openRtmWindow(newSoldCount);
}
```

**Triggered At**: 5, 10, 15, 20, 25, 30 players sold

### Step 2: Open RTM Window

**Method**: `AuctionService.openRtmWindow()`

**Actions**:
1. Identifies last 5 sold players
2. Creates RTM window object
3. Emits `rtmWindow$` observable
4. UI automatically shows RTM modal

**Result**: Modal opens, ready for bidding

### Step 3: Display RTM UI

**Component**: `RtmModalComponent`

**Shows**:
- Eligible players (last 5 sold)
- Current bids on each player
- Team selection dropdown
- Bid amount input field
- "Place Bid" button

### Step 4: Process RTM Bids

**Method**: `AuctionService.placeRtmBid()`

**Validation**:
1. RTM window is active
2. Player is eligible
3. Team has RTM available
4. Team is not original owner
5. Bid ≥ 110% of original price
6. Team has sufficient budget

**Action**: Store bid in `rtmOffers` map

### Step 5: Determine Winner

**Method**: `AuctionService.getHighestRtmBid()`

**Logic**: 
1. Sort all bids by amount (descending)
2. Return highest bid
3. If tied, earliest bidder wins

### Step 6: Process Transaction

**Method**: `AuctionService.closeRtmForPlayer()`

**Atomic Operations**:

1. **Deduct from Winner**:
   ```typescript
   winnerTeam.budget -= rtmAmount;
   winnerTeam.rtmAvailable = false;
   winnerTeam.rtmUsedAt = now();
   winnerTeam.rtmUsedForPlayerId = playerId;
   ```

2. **Credit Original Owner**:
   ```typescript
   originalOwner.budget += rtmAmount;
   ```

3. **Transfer Player**:
   ```typescript
   player.ownerId = winnerId;
   player.soldPrice = rtmAmount;
   movePlayerFromTeam(originalOwnerId, winnerId);
   ```

4. **Close Window**:
   ```typescript
   rtmWindow.active = false;
   ```

## Implementation Details

### RTM Window Object

```typescript
interface RtmWindow {
  id: string;                          // Unique ID like "rtm_1719927600000"
  playerIds: number[];                 // IDs of eligible players
  startSoldCount: number;              // e.g., 6 for second window
  endSoldCount: number;                // e.g., 10 for second window
  active: boolean;                     // True while bidding is open
  createdAt: number;                   // Timestamp in milliseconds
  offers: Map<number, RtmOffer[]>;     // Bids by player ID
}
```

### RTM Offer Object

```typescript
interface RtmOffer {
  id: string;           // Unique offer ID
  playerId: number;     // Which player
  teamId: number;       // Which team bid
  amount: number;       // Bid amount
  createdAt: number;    // When bid was placed
}
```

### Price Calculation

```typescript
rtmPrice = Math.ceil(originalSoldPrice * 1.10);
// Example: Player sold for $100 → RTM price is $110
```

## Key Behaviors

### RTM Only Consumed on Win

```
Team A bids $110 for Player X
Team B bids $120 for Player X
Team C bids $115 for Player X

Winner: Team B (highest bid of $120)
Result:
  - Team B loses RTM ✗
  - Team A keeps RTM ✓ (can use in next window)
  - Team C keeps RTM ✓ (can use in next window)
```

### Each Team Gets Exactly One RTM

- Per auction (not per window)
- Can only be used once
- Once used, `rtmAvailable` becomes `false`
- Shown in UI via RTM badge

### Original Owner Benefits

- Gets full RTM amount credited to budget
- Player removed from their roster
- Can bid for other players with increased budget

### Eligible Players Strict

- Only last 5 players in each milestone
- Previous windows' players NOT eligible
- Next window has fresh 5 players

## Error Scenarios

### Scenario: Insufficient Budget

```
RTM price: $200
Team budget: $150

User tries to bid $200
System validation fails:
  ✗ "Insufficient budget. Required: 200, Available: 150"
Bid rejected
Team keeps RTM for next window
```

### Scenario: RTM Already Used

```
Team B already used RTM in a previous window
Current RTM window opens
Team B is NOT listed as option
✗ "Team has already used their RTM allowance"
```

### Scenario: Bidding on Own Player

```
Player X sold to Team A for $100
RTM window opens
Team A tries to bid on Player X
System validation fails:
  ✗ "Cannot use RTM on your own player"
Bid rejected
```

### Scenario: Window Not Active

```
RTM window closed (no bids placed)
New player sold
User tries to place RTM bid
System validation fails:
  ✗ "No active RTM window"
```

## Database Synchronization

### Supabase Tables

#### `rtm_windows` (Audit Trail)
```sql
CREATE TABLE rtm_windows (
  id TEXT PRIMARY KEY,
  auction_id BIGINT,
  start_sold_count INT,
  end_sold_count INT,
  created_at TIMESTAMP,
  closed_at TIMESTAMP
);
```

#### `rtm_offers` (Bid History)
```sql
CREATE TABLE rtm_offers (
  id TEXT PRIMARY KEY,
  window_id TEXT REFERENCES rtm_windows(id),
  player_id BIGINT,
  team_id BIGINT,
  amount INT,
  created_at TIMESTAMP
);
```

#### Teams Table Updates
```sql
ALTER TABLE teams ADD rtm_available BOOLEAN DEFAULT true;
ALTER TABLE teams ADD rtm_used_at TIMESTAMP;
ALTER TABLE teams ADD rtm_used_player_id BIGINT;
```

#### Players Table Updates
```sql
ALTER TABLE players ADD owner_id BIGINT REFERENCES teams(id);
```

## Testing the RTM Feature

### Manual Test Steps

1. **Start Auction**:
   - Go to Auction tab
   - Load initial auction state

2. **Trigger First RTM Window**:
   - Sell players 1-4 normally
   - Sell player 5
   - ✓ RTM modal should pop up

3. **Test RTM Bidding**:
   - In modal, click on a player card
   - Select a team dropdown
   - Enter bid amount ≥ 110% of original
   - Click "Place RTM Bid"
   - ✓ Bid should appear in player's bid list

4. **Test Highest Bid Tracking**:
   - Team A bids $110
   - Team B bids $115
   - ✓ Team B's bid shows as "Highest Bid"

5. **Verify Transaction**:
   - Close RTM window (next player sold)
   - ✓ Winner's team:
     - Budget reduced by RTM amount
     - RTM badge changes to "RTM Used"
     - Player appears in their roster
   - ✓ Original owner's team:
     - Budget increased by RTM amount
     - Player removed from roster

### Console Logging

RTM events are logged with emojis for easy tracking:

```
📋 RTM Window Opened: {window object}
💰 RTM Bid placed: Team X bidding Y for Player Z
⏹️ RTM closed with no bids for Player X
✅ RTM completed: Player X won by Team Y for $Z. Original owner credited.
❌ RTM close error: {error message}
```

## Performance Metrics

- **RTM Window Creation**: O(n) where n = number of sold players
- **Bid Placement**: O(1) amortized (Map insertion)
- **Find Highest Bid**: O(m log m) where m = number of bids (sort on read)
- **Transaction Processing**: O(t) where t = number of teams
- **Memory**: ~100 bytes per bid stored

## Debugging Tips

### Enable Detailed Logging

In component, add:
```typescript
ngOnInit() {
  this.auctionService.rtmWindow$.subscribe(window => {
    console.log('RTM Window State:', window);
    console.log('Is Active:', window?.active);
    console.log('Eligible Player IDs:', window?.playerIds);
  });
}
```

### Check RTM State

In browser console:
```javascript
// Get current RTM window
ng.probe(document.querySelector('app-rtm-modal')).componentInstance.rtmWindow

// Get all bids
ng.probe(document.querySelector('app-rtm-modal')).componentInstance.rtmOffers

// Get all teams
ng.probe(document.querySelector('app-rtm-modal')).componentInstance.teams
```

### Verify Database

```sql
-- Check RTM windows created
SELECT * FROM rtm_windows ORDER BY created_at DESC;

-- Check RTM bids
SELECT * FROM rtm_offers ORDER BY created_at DESC;

-- Check team RTM status
SELECT id, name, rtm_available, rtm_used_at, rtm_used_player_id FROM teams;

-- Check player ownership
SELECT id, name, owner_id FROM players WHERE owner_id IS NOT NULL;
```

## Deployment Checklist

- [ ] All RTM components imported in app.component.ts
- [ ] RTM models defined in rtm.model.ts
- [ ] Team and Player models updated with RTM fields
- [ ] AuctionService has all RTM methods
- [ ] Supabase schema migrations applied
- [ ] RTM modal CSS properly scoped
- [ ] RTM badge component styles included
- [ ] Observable streams exposed in service
- [ ] App component subscriptions active
- [ ] Error handling tested
- [ ] Edge cases covered
- [ ] Documentation complete

## Next Steps

1. **Run the application**:
   ```bash
   npm start
   ```

2. **Test RTM workflow** (see Testing section above)

3. **Monitor logs** for RTM events

4. **Verify database** for RTM records

5. **Gather user feedback** on RTM UX

## Support

For issues or questions about RTM feature:

1. Check RTM_FEATURE_GUIDE.md for detailed documentation
2. Review test scenarios above
3. Check console logs for error messages
4. Verify database state matches application state
5. Review code comments in AuctionService for implementation details
