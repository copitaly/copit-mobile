import { of } from 'rxjs';

import { LocaleService } from '../../core/localization/locale.service';
import { PublicBranch } from '../../core/models/branch.model';
import { BranchesService } from '../../core/services/branches.service';
import { DonateBranchSheetComponent } from './donate-branch-sheet.component';

describe('DonateBranchSheetComponent', () => {
  let component: DonateBranchSheetComponent;
  let branchesService: jasmine.SpyObj<BranchesService>;
  let localeService: jasmine.SpyObj<LocaleService>;

  const milanoBranch: PublicBranch = {
    id: 11,
    name: 'Milano Assembly',
    branch_code: 'MIL-01',
    level: 'local',
    donations_enabled: true,
    is_active: true,
    district: { id: 3, name: 'Arona' },
    area: { id: 2, name: 'Brescia' },
  };

  const vicenzaBranch: PublicBranch = {
    id: 12,
    name: 'Vicenza Assembly',
    branch_code: 'VIC-01',
    level: 'local',
    donations_enabled: true,
    is_active: true,
    district: { id: 4, name: 'Vicenza' },
    area: { id: 5, name: 'Veneto' },
  };

  const anconaBranch: PublicBranch = {
    id: 13,
    name: 'ANCONA CENTRAL',
    branch_code: 'ANC-01',
    level: 'local',
    donations_enabled: true,
    is_active: true,
    district: { id: 6, name: 'ANCONA' },
    area: { id: 7, name: 'NAPOLI' },
  };

  const makeSavedBranches = (count: number): PublicBranch[] =>
    Array.from({ length: count }, (_, index) => ({
      id: 100 + index,
      name: `Saved Church ${index + 1}`,
      branch_code: `SAV-${index + 1}`,
      level: 'local',
      donations_enabled: true,
      is_active: true,
      district: { id: 200 + index, name: `District ${index + 1}` },
      area: { id: 300 + index, name: `Area ${index + 1}` },
    }));

  beforeEach(() => {
    branchesService = jasmine.createSpyObj<BranchesService>('BranchesService', ['getAllBranches']);
    branchesService.getAllBranches.and.returnValue(of([]));
    localeService = jasmine.createSpyObj<LocaleService>('LocaleService', ['translate']);
    localeService.translate.and.callFake((key: string) => key);

    component = new DonateBranchSheetComponent(branchesService, localeService);
    component.isOpen = true;
    component.savedBranches = [];
    component.savedBranchIds = [];
    component.selectedBranchId = null;
  });

  it('hides the saved churches section when there are no saved churches', () => {
    component.savedBranches = [];

    expect(component.showSavedChurchesSection).toBeFalse();
    expect(component.visibleSavedChurchRows).toEqual([]);
  });

  it('shows saved churches above areas in donate mode', () => {
    component.mode = 'donate';
    component.savedBranches = [milanoBranch];

    expect(component.showSavedChurchesSection).toBeTrue();
    expect(component.visibleSavedChurchRows.length).toBe(1);
    expect(component.visibleSavedChurchRows[0].title).toBe(milanoBranch.name);
  });

  it('places the current selected saved church first and marks it selected', () => {
    component.mode = 'donate';
    component.savedBranches = [milanoBranch, vicenzaBranch];
    component.selectedBranchId = vicenzaBranch.id;

    expect(component.visibleSavedChurchRows[0].title).toBe(vicenzaBranch.name);
    expect(component.visibleSavedChurchRows[0].selected).toBeTrue();
  });

  it('limits the initial saved churches list and shows the view-all action', () => {
    component.mode = 'donate';
    component.savedBranches = makeSavedBranches(5);

    expect(component.visibleSavedChurchRows.length).toBe(4);
    expect(component.showViewAllSavedChurchesAction).toBeTrue();
  });

  it('searches saved churches and areas from the initial selector step', () => {
    branchesService.getAllBranches.and.returnValue(of([milanoBranch]));
    component.mode = 'donate';
    component.savedBranches = [vicenzaBranch];

    component.loadBranches();
    component.searchTerm = 'vicenza';

    expect(component.visibleSavedChurchRows.length).toBe(1);
    expect(component.visibleSavedChurchRows[0].title).toBe(vicenzaBranch.name);
    expect(component.browseVisibleRows.length).toBe(0);

    component.searchTerm = 'brescia';

    expect(component.browseVisibleRows.length).toBe(1);
    expect(component.browseVisibleRows[0].title).toBe('Brescia');
  });

  it('returns nested churches from the root search results', () => {
    branchesService.getAllBranches.and.returnValue(of([anconaBranch]));

    component.loadBranches();
    component.searchTerm = 'anco';

    expect(component.showingRootSearchResults).toBeTrue();
    expect(component.browseVisibleRows.length).toBe(2);
    expect(component.browseVisibleRows[0].kind).toBe('church');
    expect(component.browseVisibleRows[0].title).toBe('ANCONA CENTRAL');
    expect(component.browseVisibleRows[0].subtitle).toContain('ANCONA District');
    expect(component.browseVisibleRows[0].subtitle).toContain('NAPOLI Area');
  });

  it('matches root search by church, district, and area names case-insensitively', () => {
    branchesService.getAllBranches.and.returnValue(of([anconaBranch]));

    component.loadBranches();

    component.searchTerm = '  central ';
    expect(component.browseVisibleRows.some((row) => row.title === 'ANCONA CENTRAL')).toBeTrue();

    component.searchTerm = 'ancona';
    expect(component.browseVisibleRows.some((row) => row.title === 'ANCONA CENTRAL')).toBeTrue();

    component.searchTerm = 'napoli';
    expect(component.browseVisibleRows.some((row) => row.title === 'ANCONA CENTRAL')).toBeTrue();
  });

  it('navigates into a district from the root search results', () => {
    branchesService.getAllBranches.and.returnValue(of([anconaBranch]));

    component.loadBranches();
    component.searchTerm = 'ancona';

    const districtRow = component.browseVisibleRows.find((row) => row.kind === 'district');

    expect(districtRow).toBeDefined();

    component.handleRowClick(districtRow!);

    expect(component.currentLevel).toBe('churches');
    expect(component.currentDistrictGroup?.name).toBe('ANCONA');
    expect(component.searchTerm).toBe('');
  });

  it('selects a searched church immediately in donate mode', () => {
    branchesService.getAllBranches.and.returnValue(of([anconaBranch]));
    spyOn(component.branchSelected, 'emit');

    component.mode = 'donate';
    component.loadBranches();
    component.searchTerm = 'anco';

    component.handleRowClick(component.browseVisibleRows[0]);

    expect(component.branchSelected.emit).toHaveBeenCalledWith(anconaBranch);
  });

  it('selects a searched church immediately in save mode', () => {
    branchesService.getAllBranches.and.returnValue(of([anconaBranch]));
    spyOn(component.branchSelected, 'emit');

    component.mode = 'save';
    component.loadBranches();
    component.searchTerm = 'anco';

    component.handleRowClick(component.browseVisibleRows[0]);

    expect(component.branchSelected.emit).toHaveBeenCalledWith(anconaBranch);
  });

  it('clearing the root search restores browse by area', () => {
    branchesService.getAllBranches.and.returnValue(of([anconaBranch]));

    component.loadBranches();
    component.searchTerm = 'anco';
    expect(component.showingRootSearchResults).toBeTrue();

    component.searchTerm = '';
    component.onSearchChange();

    expect(component.showingRootSearchResults).toBeFalse();
    expect(component.sectionLabel).toBe('churchSelector.browseByArea');
    expect(component.browseVisibleRows.length).toBe(1);
    expect(component.browseVisibleRows[0].kind).toBe('area');
  });

  it('shows the updated no-results copy when root search has no matches', () => {
    branchesService.getAllBranches.and.returnValue(of([anconaBranch]));

    component.loadBranches();
    component.searchTerm = 'missing';

    expect(component.browseVisibleRows.length).toBe(0);
    expect(component.emptyStateTitle).toBe('churchSelector.noMatchesTitle');
    expect(component.emptyStateBody).toBe('churchSelector.noGlobalMatchesBody');
  });

  it('selects a saved church directly from the initial step', () => {
    component.mode = 'donate';
    component.savedBranches = [milanoBranch];
    spyOn(component.branchSelected, 'emit');

    component.handleRowClick(component.visibleSavedChurchRows[0]);

    expect(component.branchSelected.emit).toHaveBeenCalledWith(milanoBranch);
  });

  it('emits closeRequested before the modal actually dismisses', () => {
    spyOn(component.closeRequested, 'emit');
    spyOn(component.dismissed, 'emit');

    component.requestDismiss();

    expect(component.closeRequested.emit).toHaveBeenCalled();
    expect(component.dismissed.emit).not.toHaveBeenCalled();
  });

  it('emits dismissed only from didDismiss', () => {
    spyOn(component.dismissed, 'emit');

    component.handleDidDismiss();

    expect(component.dismissed.emit).toHaveBeenCalled();
  });

  it('does not show saved church shortcuts in save mode', () => {
    component.mode = 'save';
    component.savedBranches = [milanoBranch];

    expect(component.showSavedChurchesSection).toBeFalse();
    expect(component.visibleSavedChurchRows).toEqual([]);
  });

  it('marks already-saved churches as disabled in save mode browsing', () => {
    branchesService.getAllBranches.and.returnValue(of([milanoBranch]));
    component.mode = 'save';
    component.savedBranchIds = [milanoBranch.id];

    component.loadBranches();
    const rows = component.browseVisibleRows;

    expect(rows.length).toBe(1);
    expect(rows[0].disabled).toBeTrue();
  });
});
