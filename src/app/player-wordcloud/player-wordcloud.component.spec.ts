import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerWordcloudComponent } from './player-wordcloud.component';

describe('PlayerWordcloudComponent', () => {
  let component: PlayerWordcloudComponent;
  let fixture: ComponentFixture<PlayerWordcloudComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerWordcloudComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlayerWordcloudComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
