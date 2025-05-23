import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuctionStatsComponent } from './auction-stats.component';

describe('AuctionStatsComponent', () => {
  let component: AuctionStatsComponent;
  let fixture: ComponentFixture<AuctionStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuctionStatsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AuctionStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
