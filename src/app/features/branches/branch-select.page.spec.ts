import { of } from 'rxjs';
import { convertToParamMap } from '@angular/router';

import { LocaleService } from '../../core/localization/locale.service';
import { PublicBranch } from '../../core/models/branch.model';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AppToastService } from '../../core/services/app-toast.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchesService } from '../../core/services/branches.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { BranchSelectPage } from './branch-select.page';

describe('BranchSelectPage', () => {
  let page: BranchSelectPage;
  let branchesService: jasmine.SpyObj<BranchesService>;
  let router: jasmine.SpyObj<{ navigate: (commands: unknown[]) => Promise<boolean> }>;
  let localeService: jasmine.SpyObj<LocaleService>;
  let appToast: jasmine.SpyObj<AppToastService>;

  const branches: PublicBranch[] = [
    {
      id: 1,
      name: 'Milano Assembly',
      branch_code: 'MIL-01',
      level: 'local',
      donations_enabled: true,
      is_active: true,
      district: { id: 10, name: 'Arona' },
      area: { id: 100, name: 'Brescia' },
    },
    {
      id: 2,
      name: 'Torino Assembly',
      branch_code: 'TOR-01',
      level: 'local',
      donations_enabled: true,
      is_active: true,
      district: { id: 10, name: 'Arona' },
      area: { id: 100, name: 'Brescia' },
    },
    {
      id: 3,
      name: 'Napoli Assembly',
      branch_code: 'NAP-01',
      level: 'local',
      donations_enabled: true,
      is_active: true,
      district: { id: 20, name: 'Napoli Centro' },
      area: { id: 200, name: 'Napoli' },
    },
  ];

  beforeEach(() => {
    branchesService = jasmine.createSpyObj<BranchesService>('BranchesService', ['getAllBranches']);
    branchesService.getAllBranches.and.returnValue(of(branches));

    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    localeService = jasmine.createSpyObj<LocaleService>('LocaleService', ['translate']);
    localeService.translate.and.callFake((key: string, params?: { count?: number }) => {
      switch (key) {
        case 'churchSelector.selectArea':
          return 'Select your area';
        case 'churchSelector.selectDistrict':
          return 'Select your district';
        case 'churchSelector.selectLocal':
          return 'Select the church you want to give to';
        case 'churchSelector.areas':
          return 'Areas';
        case 'churchSelector.districts':
          return 'Districts';
        case 'churchSelector.locals':
          return 'Local Churches';
        case 'churchSelector.searchAreasPlaceholder':
          return 'Search areas, districts, or churches...';
        case 'churchSelector.searchDistrictsPlaceholder':
          return 'Search districts or churches...';
        case 'churchSelector.searchLocalsPlaceholder':
          return 'Search churches...';
        case 'churchSelector.districtCountOne':
          return `${params?.count ?? 0} district`;
        case 'churchSelector.districtCountOther':
          return `${params?.count ?? 0} districts`;
        case 'churchSelector.churchCountOne':
          return `${params?.count ?? 0} church`;
        case 'churchSelector.churchCountOther':
          return `${params?.count ?? 0} churches`;
        case 'churchSelector.districtLabelSuffix':
          return 'District';
        case 'churchSelector.areaLabelSuffix':
          return 'Area';
        case 'churchSelector.otherAreas':
          return 'Other areas';
        case 'churchSelector.otherDistricts':
          return 'Other districts';
        case 'churchSelector.signInToSave':
          return 'Sign in to save churches';
        case 'churchSelector.loadError':
          return 'Unable to load branches. Please try again.';
        case 'churchSelector.saveChurchAria':
          return 'Save church';
        case 'churchSelector.removeSavedChurchAria':
          return 'Remove saved church';
        case 'savedChurches.savedSuccess':
          return 'Church saved';
        case 'savedChurches.saveFailed':
          return 'Failed to save church';
        case 'savedChurches.removedSuccess':
          return 'Removed from saved';
        case 'savedChurches.removeFailed':
          return 'Failed to remove church';
        default:
          return key;
      }
    });
    appToast = jasmine.createSpyObj<AppToastService>('AppToastService', ['warning', 'success', 'error']);
    appToast.warning.and.resolveTo();
    appToast.success.and.resolveTo();
    appToast.error.and.resolveTo();

    page = new BranchSelectPage(
      branchesService,
      {
        isAuthenticatedSnapshot: false,
        getSavedChurches: jasmine.createSpy().and.returnValue(of([])),
        saveChurch: jasmine.createSpy(),
        unsaveChurch: jasmine.createSpy(),
      } as unknown as AuthService,
      {
        setBranch: jasmine.createSpy().and.returnValue(true),
        getBranch: jasmine.createSpy().and.returnValue(null),
      } as unknown as SelectedBranchService,
      {
        snapshot: {
          queryParamMap: convertToParamMap({}),
        },
      } as never,
      router as never,
      localeService,
      appToast,
      {
        trackBranchSelected: jasmine.createSpy().and.resolveTo(),
        getUserType: jasmine.createSpy().and.returnValue('guest'),
      } as unknown as AnalyticsService
    );
  });

  it('starts at areas and groups unique active areas', () => {
    page.loadBranches();

    expect(page.currentLevel).toBe('areas');
    expect(page.currentHelperText).toBe('Select your area');
    expect(page.areaGroups.map((area) => area.name)).toEqual(['Brescia', 'Napoli']);
  });

  it('shows only districts for the selected area', () => {
    page.loadBranches();

    page.selectArea(page.areaGroups[0]);

    expect(page.currentLevel).toBe('districts');
    expect(page.currentDistrictGroups.map((district) => district.name)).toEqual(['Arona']);
  });

  it('shows only local churches for the selected district', () => {
    page.loadBranches();

    const area = page.areaGroups[0];
    page.openArea(area);
    page.openDistrict(area, page.currentDistrictGroups[0]);

    expect(page.currentLevel).toBe('churches');
    expect(page.currentChurches.map((branch) => branch.name)).toEqual(['Milano Assembly', 'Torino Assembly']);
    expect(page.currentHelperText).toBe('Select the church you want to give to');
  });

  it('steps back from churches to districts to areas', () => {
    page.loadBranches();

    const area = page.areaGroups[0];
    page.openArea(area);
    page.openDistrict(area, page.currentDistrictGroups[0]);

    page.stepBack();
    expect(page.currentLevel).toBe('districts');

    page.stepBack();
    expect(page.currentLevel).toBe('areas');
  });

  it('returns area and district search sections from local hierarchy data', () => {
    page.loadBranches();

    page.searchTerm = 'arona';

    expect(page.searchResultSections.map((section) => section.title)).toEqual(['Districts', 'Local Churches']);

    const districtSection = page.searchResultSections[0];
    const districtItem = districtSection.items[0];
    expect(districtItem.kind).toBe('district');

    if (districtItem.kind !== 'district') {
      fail('Expected district search result.');
      return;
    }

    page.openDistrict(districtItem.area, districtItem.district);

    expect(page.currentLevel).toBe('churches');
    expect(page.currentDistrictGroup?.name).toBe('Arona');
    expect(page.searchTerm).toBe('');
  });
});
