# RTM Quick Reference Card

## 🎯 RTM at a Glance

**What**: Right To Match feature for cricket player auction
**When**: Activates at milestones (5, 10, 15, 20, 25, 30 players sold)
**Who**: Any team with RTM available (not the original owner)
**How**: Bid at least 110% of original selling price
**Result**: Highest bidder wins, gets player, RTM marked as used

---

## 📊 RTM Timeline

```
Sale #5  → RTM Window Opens (Players 1-5 eligible)
Sale #10 → RTM Window Opens (Players 6-10 eligible)
Sale #15 → RTM Window Opens (Players 11-15 eligible)
Sale #20 → RTM Window Opens (Players 16-20 eligible)
Sale #25 → RTM Window Opens (Players 21-25 eligible)
Sale #30 → RTM Window Opens (Players 26-30 eligible)
```

---

## 💰 Price Calculation

```
Original Bid: $100
RTM Price:    $110 (110% of $100)

Original Bid: $500
RTM Price:    $550 (110% of $500)
```

---

## ✋ RTM Rules

✅ **CAN bid if**:
- RTM window is active
- Player is eligible (in last 5 of milestone)
- You haven't used RTM yet
- You're not the original owner
- Your bid is ≥110% of original price
- You have enough budget

❌ **CANNOT bid if**:
- No RTM window is active
- You already used RTM
- Player is from a previous window
- You're bidding on your own player
- Bid is less than 110%
- Budget is insufficient

---

## 🎮 How to Place RTM Bid

1. **Wait for RTM Window**: Modal appears after 5, 10, 15, 20, 25, or 30 players sold
2. **Select Player**: Click on any eligible player card
3. **Choose Team**: Pick your team from dropdown
4. **Enter Amount**: Type bid amount (≥110% of original)
5. **Place Bid**: Click "Place RTM Bid" button
6. **Track Status**: See your bid in player's bid list

---

## 🏆 Winning RTM

- **Highest Bid Wins**
- **If Tied**: Earliest bidder wins
- **Winner's RTM**: Marked as used ❌
- **Losers' RTM**: Kept for next window ✅

---

## 💳 Budget Impact

```
WINNER:
  New Budget = Old Budget - RTM Amount
  
ORIGINAL OWNER:
  New Budget = Old Budget + RTM Amount
  
LOSING BIDDER:
  Budget = No Change
```

---

## 📍 UI Components

### RTM Modal
- **When**: During RTM window only
- **Where**: Center of screen, overlay
- **Shows**: Eligible players, bids, bid form

### RTM Badge
- **When**: Always visible
- **Where**: Team cards in team list
- **Shows**: "RTM Available" ✅ or "RTM Used" ❌

---

## 🔍 Status Indicators

### Team RTM Badge Colors
- **🟢 Green**: RTM Available (can still use)
- **🔴 Red**: RTM Used (already used)

### Player Bid Status
- **📝 No bids**: No one has bid on this player yet
- **💰 Bids**: Shows highest bid and number of total bids

---

## 🔄 RTM Window States

### OPEN
- Accepting bids
- Eligible players displayed
- Bid form active

### CLOSED
- All bids processed
- Winner determined
- Player transferred

---

## 📋 Eligible Players Calculation

```
RTM Window 1: Players 1-5 (after 5 sold)
RTM Window 2: Players 6-10 (after 10 sold)
RTM Window 3: Players 11-15 (after 15 sold)

NOT: 1-10 again for Window 2
NOT: 1-15 again for Window 3
```

---

## 🚫 Common Mistakes

| ❌ Wrong | ✅ Right |
|---------|---------|
| Bid $100 on $100 player | Bid $110 on $100 player |
| Bid on your own player | Bid on opponent's player |
| Use RTM twice | Use RTM once per auction |
| Bid after budget spent | Check budget first |

---

## 💬 Error Messages

| Error | Meaning |
|-------|---------|
| "No active RTM window" | Wait for next milestone |
| "Team has already used RTM" | RTM already used, try next window |
| "Insufficient budget" | Need more money to bid |
| "Cannot use RTM on your own player" | Can't bid on your own player |
| "RTM bid must be at least $X" | Bid too low, increase it |

---

## 🎯 RTM Strategy Tips

1. **Monitor Budgets**: Save budget for RTM if valuable player available
2. **Early Action**: Bid early, outbid later if needed
3. **Track Milestones**: Plan which players might be RTM-ed
4. **Watch Competitors**: See which players teams want back
5. **Save for Later**: Don't waste RTM on early windows

---

## 📊 RTM Statistics Tracked

- **Games**: Total RTM transactions
- **Success Rate**: % of RTM windows with bids
- **Average Price**: Avg RTM vs original price
- **Most Active**: Which teams use RTM most
- **Most RTM'd Player**: Most contested player

---

## 🔐 RTM Safety Guarantees

✅ **Budget Safe**: Can't bid more than you have
✅ **Owner Safe**: Can't lose your own player to RTM
✅ **Bid Safe**: Highest bid always wins
✅ **Transaction Safe**: Atomic operations, no partial updates
✅ **Data Safe**: All recorded in database

---

## 🆘 Quick Troubleshooting

**RTM modal not showing?**
→ Have you sold at least 5 players?

**Can't place bid?**
→ Check: Window active? RTM available? Bid ≥110%? Budget enough?

**Bid not updating?**
→ Try: Refresh page, check browser console, verify network

**Transaction failed?**
→ Check: Team budget, player ownership, Supabase status

---

## 📞 Help Resources

| Need | Go To |
|------|-------|
| Detailed guide | RTM_FEATURE_GUIDE.md |
| Technical details | RTM_INTEGRATION_GUIDE.md |
| Implementation info | RTM_IMPLEMENTATION_SUMMARY.md |
| Console logs | Browser Console (F12) |
| Database | Supabase Dashboard |

---

## ⏱️ Time to RTM Events

```
After Sale #5:   Immediate RTM
After Sale #10:  Immediate RTM
After Sale #15:  Immediate RTM
After Sale #20:  Immediate RTM
After Sale #25:  Immediate RTM
After Sale #30:  Immediate RTM
```

---

## 🎊 RTM Window Duration

- **Opens**: Immediately after milestone
- **Closes**: When next player is sold
- **Can Be Extended**: By not selling next player
- **Re-Opens**: At next milestone with fresh players

---

## 🏅 RTM Achievements

- **First RTM Bid**: Place your first RTM bid
- **RTM Winner**: Win a player via RTM
- **Budget Master**: Win RTM with lowest bid
- **Rare Catch**: Win RTM for player with most bids
- **Comeback King**: Use RTM to reclaim your best player

---

## Version Info
**RTM Feature Version**: 1.0
**Status**: ✅ Production Ready
**Last Updated**: June 2, 2026

---

**Remember**: RTM is your chance to reclaim sold players at 110%! Use it wisely! 🎯
