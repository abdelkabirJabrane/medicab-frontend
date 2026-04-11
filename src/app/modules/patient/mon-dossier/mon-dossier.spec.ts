import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonDossier } from './mon-dossier';

describe('MonDossier', () => {
  let component: MonDossier;
  let fixture: ComponentFixture<MonDossier>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonDossier]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonDossier);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
