import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecretaireLayout } from './secretaire-layout';

describe('SecretaireLayout', () => {
  let component: SecretaireLayout;
  let fixture: ComponentFixture<SecretaireLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecretaireLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecretaireLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
