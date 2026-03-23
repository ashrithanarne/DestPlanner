import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { LandingPageComponent } from './landing-page';

describe('LandingPageComponent', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [provideRouter([]), provideAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // ── should create ─────────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── features array ────────────────────────────────────────────────────────
  it('should have 6 features defined', () => {
    expect(component.features.length).toBe(6);
  });

  it('should include Budget Tracking feature', () => {
    const budget = component.features.find(f => f.title === 'Budget Tracking');
    expect(budget).toBeTruthy();
  });

  // ── benefits array ────────────────────────────────────────────────────────
  it('should have 4 benefits defined', () => {
    expect(component.benefits.length).toBe(4);
  });

  // ── navigateToRegister ────────────────────────────────────────────────────
  it('navigateToRegister: should exist as a method', () => {
    expect(typeof component.navigateToRegister).toBe('function');
  });

  // ── navigateToLogin ───────────────────────────────────────────────────────
  it('navigateToLogin: should exist as a method', () => {
    expect(typeof component.navigateToLogin).toBe('function');
  });

  // ── scrollToFeatures ──────────────────────────────────────────────────────
  it('scrollToFeatures: should exist as a method', () => {
    expect(typeof component.scrollToFeatures).toBe('function');
  });

  // ── scrollToHowItWorks ────────────────────────────────────────────────────
  it('scrollToHowItWorks: should exist as a method', () => {
    expect(typeof component.scrollToHowItWorks).toBe('function');
  });

  // ── navigateToFeature — Budget Tracking ──────────────────────────────────
  it('navigateToFeature: should exist as a method', () => {
    expect(typeof component.navigateToFeature).toBe('function');
  });

  it('navigateToFeature: should not throw for non-budget features', () => {
    expect(() => component.navigateToFeature('Discover Destinations')).not.toThrow();
  });
});