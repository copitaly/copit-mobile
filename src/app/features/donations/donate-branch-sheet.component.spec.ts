import { of } from 'rxjs';

import { PublicBranch } from '../../core/models/branch.model';
import { BranchesService } from '../../core/services/branches.service';
import { DonateBranchSheetComponent } from './donate-branch-sheet.component';

describe('DonateBranchSheetComponent', () => {
  let component: DonateBranchSheetComponent;
  let branchesService: jasmine.SpyObj<BranchesService>;

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

    component = new DonateBranchSheetComponent(branchesService);
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

  it('selects a saved church directly from the initial step', () => {
    component.mode = 'donate';
    component.savedBranches = [milanoBranch];
    spyOn(component.branchSelected, 'emit');

    component.handleRowClick(component.visibleSavedChurchRows[0]);

    expect(component.branchSelected.emit).toHaveBeenCalledWith(milanoBranch);
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
