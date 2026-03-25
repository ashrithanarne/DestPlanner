import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DestinationDetail } from './destination-detail';

describe('DestinationDetail', () => {
  let component: DestinationDetail;
  let fixture: ComponentFixture<DestinationDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DestinationDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DestinationDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
