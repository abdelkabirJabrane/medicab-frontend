import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesRdv } from './mes-rdv';

describe('MesRdv', () => {
  let component: MesRdv;
  let fixture: ComponentFixture<MesRdv>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesRdv]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MesRdv);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
