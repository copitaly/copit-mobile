import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { of } from 'rxjs';

import { PublicBranch } from '../../core/models/branch.model';
import { SavedChurch } from '../../core/models/user.model';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchesService } from '../../core/services/branches.service';
import { HardwareBackCoordinatorService } from '../../core/services/hardware-back-coordinator.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { SavedChurchesPage } from './saved-churches.page';

describe('SavedChurchesPage', () => {
  let fixture: ComponentFixture<SavedChurchesPage>;
  let page: SavedChurchesPage;
  let authService: jasmine.SpyObj<AuthService>;
  let selectedBranchService: jasmine.SpyObj<SelectedBranchService>;
  let router: jasmine.SpyObj<Router>;
  let alertController: jasmine.SpyObj<AlertController>;
  let alertElement: { present: jasmine.Spy };

  const toSavedChurch = (id: number, name: string): SavedChurch => ({
    id: id + 100,
    created_at: '2026-07-31T08:00:00Z',
    church: {
      id,
      name,
      branch_code: `BR-${id}`,
      district: { id: 10, name: 'Brescia' },
      area: { id: 20, name: 'North' },
      donations_enabled: true,
      is_active: true,
    },
  });

  async function createComponent(savedChurches: SavedChurch[] = []): Promise<void> {
    authService.getCurrentUser.and.returnValue(of({ id: 1 } as never));
    authService.getSavedChurches.and.returnValue(of(savedChurches));

    await TestBed.configureTestingModule({
      imports: [SavedChurchesPage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: SelectedBranchService, useValue: selectedBranchService },
        { provide: Router, useValue: router },
        { provide: AlertController, useValue: alertController },
        {
          provide: ToastController,
          useValue: {
            create: jasmine.createSpy('create').and.resolveTo({ present: jasmine.createSpy('present').and.resolveTo() }),
          },
        },
        {
          provide: SentryTelemetryService,
          useValue: {
            addFeatureBreadcrumb: jasmine.createSpy('addFeatureBreadcrumb'),
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            trackBranchSelected: jasmine.createSpy('trackBranchSelected').and.resolveTo(),
            getUserType: jasmine.createSpy('getUserType').and.returnValue('member'),
          },
        },
        {
          provide: BranchesService,
          useValue: {
            getAllBranches: jasmine.createSpy('getAllBranches').and.returnValue(of([])),
          },
        },
        {
          provide: HardwareBackCoordinatorService,
          useValue: jasmine.createSpyObj<HardwareBackCoordinatorService>('HardwareBackCoordinatorService', ['registerSelectorHandler']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SavedChurchesPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getCurrentUser',
      'getSavedChurches',
      'saveChurch',
      'unsaveChurch',
    ]);
    selectedBranchService = jasmine.createSpyObj<SelectedBranchService>('SelectedBranchService', ['setBranch', 'getBranch']);
    selectedBranchService.setBranch.and.returnValue(true);
    selectedBranchService.getBranch.and.returnValue({
      id: 4,
      name: 'Napoli Central',
      branch_code: 'BR-4',
      level: 'local',
      donations_enabled: true,
      is_active: true,
      district: { id: 11, name: 'Napoli' },
      area: { id: 22, name: 'South' },
    } as PublicBranch);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    alertElement = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertController.create.and.resolveTo(alertElement as never);
  });

  it('opens the reusable selector from the empty-state browse action', async () => {
    await createComponent([]);

    const browseButton = fixture.nativeElement.querySelector('.choose-church-button') as HTMLButtonElement | null;
    browseButton?.click();
    fixture.detectChanges();

    expect(page.isChurchSelectorOpen).toBeTrue();
    const selector = fixture.nativeElement.querySelector('app-donate-branch-sheet');
    expect(selector).not.toBeNull();
  });

  it('saves a selected church from selector save mode and refreshes the list', async () => {
    const savedChurch = toSavedChurch(7, 'Verona Local');
    authService.saveChurch.and.returnValue(of(savedChurch));
    authService.getSavedChurches.and.returnValues(of([]), of([savedChurch]));

    await createComponent([]);
    page.openChurchSelector();
    page.handleChurchSelectedForSave({
      id: 7,
      name: 'Verona Local',
      branch_code: 'BR-7',
      level: 'local',
      donations_enabled: true,
      is_active: true,
      district: { id: 77, name: 'Verona' },
      area: { id: 88, name: 'North East' },
    });
    await Promise.resolve();
    fixture.detectChanges();

    expect(authService.saveChurch).toHaveBeenCalledWith(7);
    expect(authService.getSavedChurches).toHaveBeenCalledTimes(2);
    expect(page.isChurchSelectorOpen).toBeFalse();
    expect(page.savedChurches.length).toBe(1);
  });

  it('donates to a saved church by preselecting it and opening the donate tab', async () => {
    const savedChurch = toSavedChurch(4, 'Napoli Central');
    await createComponent([savedChurch]);

    page.donateToSavedChurch(savedChurch);

    expect(selectedBranchService.setBranch).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/tabs/donate']);
  });

  it('prompts for confirmation before unsaving a church', async () => {
    const savedChurch = toSavedChurch(9, 'Torino Assembly');
    await createComponent([savedChurch]);

    await page.confirmUnsave(savedChurch);

    expect(alertController.create).toHaveBeenCalled();
    expect(alertElement.present).toHaveBeenCalled();
  });
});
