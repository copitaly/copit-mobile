import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthLayoutDebugPage } from './auth-layout-debug.page';

describe('AuthLayoutDebugPage', () => {
  let fixture: ComponentFixture<AuthLayoutDebugPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthLayoutDebugPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutDebugPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders visible projected content inside the shared auth shell', () => {
    const shell = fixture.nativeElement.querySelector('[data-testid="auth-layout-shell"]') as HTMLElement | null;
    const body = fixture.nativeElement.querySelector('[data-testid="auth-layout-debug-copy"]') as HTMLElement | null;
    const footer = fixture.nativeElement.querySelector('[data-testid="auth-layout-debug-footer"]') as HTMLElement | null;

    expect(shell).not.toBeNull();
    expect(body).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(shell!.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(body!.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(footer!.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).toContain('Auth layout debug');
    expect(fixture.nativeElement.textContent).toContain('Projected content is visible');
    expect(fixture.nativeElement.textContent).toContain('Projected footer is visible');
  });

  it('keeps the debug page outside the tabs shell', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="tabs-shell"]')).toBeNull();
  });
});
