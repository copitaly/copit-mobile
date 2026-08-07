import { CommonModule } from '@angular/common';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { LocaleService } from '../../core/localization/locale.service';
import { PublicBranch } from '../../core/models/branch.model';
import { BranchesService } from '../../core/services/branches.service';

type BrowseLevel = 'areas' | 'districts' | 'churches';

interface DistrictBrowseGroup {
  key: string;
  id: number | null;
  name: string;
  areaName: string;
  branches: PublicBranch[];
}

interface AreaBrowseGroup {
  key: string;
  id: number | null;
  name: string;
  districts: DistrictBrowseGroup[];
}

interface DonateBranchSheetRow {
  kind: 'saved-branch' | 'church' | 'district' | 'area';
  icon: string;
  title: string;
  subtitle: string;
  ariaLabel: string;
  disabled?: boolean;
  selected?: boolean;
  payload: AreaBrowseGroup | DistrictBrowseGroup | PublicBranch;
}

@Component({
  standalone: true,
  selector: 'app-donate-branch-sheet',
  imports: [CommonModule, FormsModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-modal
      [isOpen]="isOpen"
      [initialBreakpoint]="0.82"
      [breakpoints]="[0, 0.82]"
      [handle]="true"
      [backdropDismiss]="true"
      class="donate-branch-sheet-modal"
      (didDismiss)="handleDidDismiss()"
    >
      <ng-template>
        <ion-content fullscreen class="donate-branch-sheet-content">
          <div class="donate-branch-sheet">
            <div class="donate-branch-sheet__header">
              <button
                *ngIf="currentLevel !== 'areas'"
                type="button"
                class="donate-branch-sheet__back"
                aria-label="Back one level"
                (click)="stepBack()"
              >
                <ion-icon name="chevron-back" aria-hidden="true"></ion-icon>
                <span>Back</span>
              </button>
              <button
                *ngIf="currentLevel === 'areas'"
                type="button"
                class="donate-branch-sheet__close"
                aria-label="Close church selector"
                (click)="requestDismiss()"
              >
                <ion-icon name="close" aria-hidden="true"></ion-icon>
              </button>

              <div class="donate-branch-sheet__copy">
                <h2>{{ sheetTitle }}</h2>
                <p *ngIf="sheetSubtitle">{{ sheetSubtitle }}</p>
              </div>
            </div>

            <ion-searchbar
              [(ngModel)]="searchTerm"
              [placeholder]="searchPlaceholder"
              debounce="250"
              [attr.aria-label]="searchPlaceholder"
              class="donate-branch-sheet__search"
              (ionInput)="onSearchChange()"
            ></ion-searchbar>

            <div *ngIf="loading" class="donate-branch-sheet__state" aria-live="polite">
              <ion-spinner name="crescent"></ion-spinner>
              <p>Loading churches...</p>
            </div>

            <div *ngIf="!loading && error" class="donate-branch-sheet__state donate-branch-sheet__state--error">
              <p>{{ error }}</p>
              <ion-button type="button" fill="outline" size="small" (click)="loadBranches()">Retry</ion-button>
            </div>

            <ng-container *ngIf="!loading && !error">
              <div *ngIf="showSavedChurchesSection" class="donate-branch-sheet__section donate-branch-sheet__section--saved">
                <div class="donate-branch-sheet__section-label">{{ localeService.translate('churchSelector.savedChurches') }}</div>
                <p class="donate-branch-sheet__section-copy">{{ localeService.translate('churchSelector.savedChurchesCopy') }}</p>
              </div>

              <div *ngIf="showSavedChurchesSection" class="donate-branch-sheet__rows donate-branch-sheet__rows--saved">
                <button
                  *ngFor="let row of visibleSavedChurchRows"
                  type="button"
                  class="donate-branch-sheet__row"
                  [class.donate-branch-sheet__row--selected]="row.selected"
                  [attr.aria-label]="row.ariaLabel"
                  (click)="handleRowClick(row)"
                >
                  <span class="donate-branch-sheet__row-icon" aria-hidden="true">
                    <ion-icon [name]="row.icon"></ion-icon>
                  </span>
                  <span class="donate-branch-sheet__row-copy">
                    <strong>{{ row.title }}</strong>
                    <small>{{ row.subtitle }}</small>
                  </span>
                  <span *ngIf="row.selected" class="donate-branch-sheet__row-badge" aria-hidden="true">Selected</span>
                  <span class="donate-branch-sheet__row-trailing" aria-hidden="true">
                    <ion-icon name="chevron-forward"></ion-icon>
                  </span>
                </button>
              </div>

              <button
                *ngIf="showViewAllSavedChurchesAction"
                type="button"
                class="donate-branch-sheet__link-action"
                (click)="showAllSavedChurches = true"
              >
                {{ localeService.translate('churchSelector.viewAllSavedChurches') }}
              </button>

              <div class="donate-branch-sheet__section">
                <div class="donate-branch-sheet__section-label">{{ sectionLabel }}</div>
                <p class="donate-branch-sheet__section-copy">{{ sectionCopy }}</p>
              </div>

              <div *ngIf="allVisibleRows.length === 0" class="donate-branch-sheet__state">
                <p class="donate-branch-sheet__state-title">{{ emptyStateTitle }}</p>
                <p>{{ emptyStateBody }}</p>
              </div>

              <div *ngIf="browseVisibleRows.length > 0" class="donate-branch-sheet__rows">
                <button
                  *ngFor="let row of browseVisibleRows"
                  type="button"
                  class="donate-branch-sheet__row"
                  [disabled]="row.disabled"
                  [attr.aria-label]="row.ariaLabel"
                  (click)="handleRowClick(row)"
                >
                  <span class="donate-branch-sheet__row-icon" aria-hidden="true">
                    <ion-icon [name]="row.icon"></ion-icon>
                  </span>
                  <span class="donate-branch-sheet__row-copy">
                    <strong>{{ row.title }}</strong>
                    <small>{{ row.subtitle }}</small>
                  </span>
                  <span class="donate-branch-sheet__row-trailing" aria-hidden="true">
                    <ion-icon name="chevron-forward"></ion-icon>
                  </span>
                </button>
              </div>
            </ng-container>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .donate-branch-sheet-content {
        --background: var(--cop-color-background-soft);
      }

      .donate-branch-sheet {
        min-height: 100%;
        padding:
          0.65rem
          calc(var(--cop-safe-right, env(safe-area-inset-right, 0px)) + 1rem)
          calc(var(--cop-safe-bottom, env(safe-area-inset-bottom, 0px)) + 1.35rem)
          calc(var(--cop-safe-left, env(safe-area-inset-left, 0px)) + 1rem);
      }

      .donate-branch-sheet__header,
      .donate-branch-sheet__back,
      .donate-branch-sheet__close,
      .donate-branch-sheet__row {
        display: flex;
        align-items: center;
      }

      .donate-branch-sheet__header {
        gap: 0.7rem;
        margin-bottom: 0.8rem;
      }

      .donate-branch-sheet__back,
      .donate-branch-sheet__close {
        min-width: 44px;
        min-height: 44px;
        border: 0;
        border-radius: 999px;
        background: #ffffff;
        color: #0b1d73;
        justify-content: center;
        box-shadow: 0 8px 18px rgba(7, 24, 69, 0.05);
        flex-shrink: 0;
      }

      .donate-branch-sheet__back {
        gap: 0.18rem;
        padding: 0 0.75rem 0 0.55rem;
        width: auto;
        font: inherit;
        font-size: 0.84rem;
        font-weight: 700;
      }

      .donate-branch-sheet__copy {
        min-width: 0;
        flex: 1;
      }

      .donate-branch-sheet__copy h2,
      .donate-branch-sheet__copy p,
      .donate-branch-sheet__section-label,
      .donate-branch-sheet__section-copy,
      .donate-branch-sheet__row-copy strong,
      .donate-branch-sheet__row-copy small,
      .donate-branch-sheet__state p {
        margin: 0;
      }

      .donate-branch-sheet__copy h2 {
        color: var(--cop-color-text-primary);
        font-size: 1.24rem;
        line-height: 1.14;
        letter-spacing: -0.02em;
      }

      .donate-branch-sheet__copy p,
      .donate-branch-sheet__section-copy,
      .donate-branch-sheet__row-copy small,
      .donate-branch-sheet__state p {
        color: var(--cop-color-text-secondary);
        font-size: 0.9rem;
        line-height: 1.42;
      }

      .donate-branch-sheet__search {
        --background: #ffffff;
        --border-radius: 14px;
        margin-bottom: 0.95rem;
        border: 1px solid rgba(8, 31, 92, 0.08);
        box-shadow: 0 8px 18px rgba(7, 24, 69, 0.04);
      }

      .donate-branch-sheet__section {
        display: flex;
        flex-direction: column;
        gap: 0.16rem;
        margin-bottom: 0.7rem;
      }

      .donate-branch-sheet__section--saved {
        margin-bottom: 0.55rem;
      }

      .donate-branch-sheet__section-label {
        color: var(--cop-color-gold-deep);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .donate-branch-sheet__rows {
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
      }

      .donate-branch-sheet__rows--saved {
        margin-bottom: 0.55rem;
      }

      .donate-branch-sheet__row {
        width: 100%;
        gap: 0.78rem;
        padding: 0.82rem 0.9rem;
        border: 1px solid rgba(8, 31, 92, 0.07);
        border-radius: 16px;
        background: #ffffff;
        text-align: left;
        box-shadow: 0 8px 18px rgba(7, 24, 69, 0.03);
      }

      .donate-branch-sheet__row--selected {
        border-color: rgba(11, 29, 115, 0.18);
      }

      .donate-branch-sheet__row-icon,
      .donate-branch-sheet__row-trailing {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .donate-branch-sheet__row-icon {
        width: 2rem;
        height: 2rem;
        border-radius: 12px;
        background: rgba(8, 31, 92, 0.05);
        color: #0b1d73;
      }

      .donate-branch-sheet__row-copy {
        display: flex;
        flex: 1;
        min-width: 0;
        flex-direction: column;
        gap: 0.12rem;
      }

      .donate-branch-sheet__row-copy strong {
        color: var(--cop-color-text-primary);
        font-size: 0.98rem;
        font-weight: 700;
        line-height: 1.28;
      }

      .donate-branch-sheet__row-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 0.18rem 0.55rem;
        background: rgba(11, 29, 115, 0.08);
        color: #0b1d73;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .donate-branch-sheet__row-trailing {
        color: rgba(8, 31, 92, 0.44);
      }

      .donate-branch-sheet__state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 2rem 1rem;
        text-align: center;
      }

      .donate-branch-sheet__state--error {
        align-items: flex-start;
        text-align: left;
      }

      .donate-branch-sheet__link-action {
        border: 0;
        background: transparent;
        padding: 0 0 0.75rem;
        color: #0b1d73;
        font: inherit;
        font-size: 0.84rem;
        font-weight: 700;
        text-align: left;
      }
    `,
  ],
})
export class DonateBranchSheetComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() mode: 'donate' | 'save' = 'donate';
  @Input() savingBranchId: number | null = null;
  @Input() savedBranchIds: number[] = [];
  @Input() savedBranches: PublicBranch[] = [];
  @Input() selectedBranchId: number | null = null;

  @Output() closeRequested = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();
  @Output() branchSelected = new EventEmitter<PublicBranch>();

  loading = false;
  error: string | null = null;
  searchTerm = '';
  currentLevel: BrowseLevel = 'areas';
  showAllSavedChurches = false;

  private allBranches: PublicBranch[] = [];
  private selectedAreaKey: string | null = null;
  private selectedDistrictKey: string | null = null;

  constructor(
    private readonly branchesService: BranchesService,
    readonly localeService: LocaleService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['isOpen']) {
      return;
    }

    if (this.isOpen) {
      this.resetTransientState();
      if (this.allBranches.length === 0 && !this.loading) {
        this.loadBranches();
      }
      return;
    }

    this.resetTransientState();
  }

  get sheetTitle(): string {
    if (this.currentLevel === 'churches') {
      return this.currentDistrictGroup?.name ?? 'Choose Church';
    }

    if (this.currentLevel === 'districts') {
      return this.currentAreaGroup?.name ?? 'Choose Church';
    }

    return 'Choose Church';
  }

  get sheetSubtitle(): string {
    if (this.currentLevel === 'areas') {
      return this.mode === 'save' ? 'Choose a church to save for quick access.' : 'Where would you like to give?';
    }

    return '';
  }

  get searchPlaceholder(): string {
    if (this.currentLevel === 'churches') {
      return this.localeService.translate('churchSelector.searchLocalsPlaceholder');
    }

    if (this.currentLevel === 'districts') {
      return this.localeService.translate('churchSelector.searchDistrictsPlaceholder');
    }

    return this.localeService.translate('churchSelector.searchAreasPlaceholder');
  }

  get sectionLabel(): string {
    if (this.showingRootSearchResults) {
      return this.localeService.translate('churchSelector.searchResults');
    }

    if (this.currentLevel === 'churches') {
      return this.localeService.translate('churchSelector.locals');
    }

    if (this.currentLevel === 'districts') {
      return this.localeService.translate('churchSelector.districts');
    }

    return this.mode === 'donate'
      ? this.localeService.translate('churchSelector.browseByArea')
      : this.localeService.translate('churchSelector.areas');
  }

  get sectionCopy(): string {
    if (this.showingRootSearchResults) {
      return this.localeService.translate('churchSelector.searchResultsCopy');
    }

    if (this.currentLevel === 'churches') {
      return this.mode === 'save'
        ? this.localeService.translate('churchSelector.selectChurchToSave')
        : this.localeService.translate('churchSelector.selectLocal');
    }

    if (this.currentLevel === 'districts') {
      return this.localeService.translate('churchSelector.selectDistrict');
    }

    return this.mode === 'donate'
      ? this.localeService.translate('churchSelector.browseAllByArea')
      : this.localeService.translate('churchSelector.selectArea');
  }

  get emptyStateTitle(): string {
    if (this.showingRootSearchResults) {
      return this.localeService.translate('churchSelector.noMatchesTitle');
    }

    if (this.currentLevel === 'churches') {
      return this.localeService.translate('churchSelector.noMatchesTitle');
    }

    if (this.currentLevel === 'districts') {
      return this.localeService.translate('churchSelector.noDistrictMatchesTitle');
    }

    return this.localeService.translate('churchSelector.noMatchesTitle');
  }

  get emptyStateBody(): string {
    if (this.showingRootSearchResults) {
      return this.localeService.translate('churchSelector.noGlobalMatchesBody');
    }

    if (this.currentLevel === 'churches') {
      return this.localeService.translate('churchSelector.noMatchesBody');
    }

    if (this.currentLevel === 'districts') {
      return this.localeService.translate('churchSelector.noDistrictMatchesBody');
    }

    return this.localeService.translate('churchSelector.noSavedOrAreaMatchesBody');
  }

  get showSavedChurchesSection(): boolean {
    return this.mode === 'donate'
      && this.currentLevel === 'areas'
      && !this.showingRootSearchResults
      && this.visibleSavedChurchRows.length > 0;
  }

  get showViewAllSavedChurchesAction(): boolean {
    return this.mode === 'donate'
      && this.currentLevel === 'areas'
      && !this.showingRootSearchResults
      && !this.showAllSavedChurches
      && this.orderedSavedBranches.length > 4;
  }

  get showingRootSearchResults(): boolean {
    return this.currentLevel === 'areas' && this.normalizedSearchTerm.length > 0;
  }

  get areaGroups(): AreaBrowseGroup[] {
    const areaMap = new Map<string, AreaBrowseGroup>();
    const districtMapByArea = new Map<string, Map<string, DistrictBrowseGroup>>();

    this.allBranches.forEach((branch) => {
      const areaName = branch.area?.name?.trim() || 'Other areas';
      const areaId = branch.area?.id ?? null;
      const areaKey = this.buildHierarchyKey('area', areaId, areaName);

      if (!areaMap.has(areaKey)) {
        areaMap.set(areaKey, {
          key: areaKey,
          id: areaId,
          name: areaName,
          districts: [],
        });
        districtMapByArea.set(areaKey, new Map<string, DistrictBrowseGroup>());
      }

      const districtName = branch.district?.name?.trim() || 'Other districts';
      const districtId = branch.district?.id ?? null;
      const districtKey = this.buildHierarchyKey('district', districtId, `${areaKey}:${districtName}`);
      const districtsForArea = districtMapByArea.get(areaKey)!;

      if (!districtsForArea.has(districtKey)) {
        const districtGroup: DistrictBrowseGroup = {
          key: districtKey,
          id: districtId,
          name: districtName,
          areaName,
          branches: [],
        };
        districtsForArea.set(districtKey, districtGroup);
        areaMap.get(areaKey)!.districts.push(districtGroup);
      }

      districtsForArea.get(districtKey)!.branches.push(branch);
    });

    return [...areaMap.values()]
      .map((area) => ({
        ...area,
        districts: [...area.districts]
          .map((district) => ({
            ...district,
            branches: [...district.branches].sort((left, right) => left.name.localeCompare(right.name)),
          }))
          .sort((left, right) => left.name.localeCompare(right.name)),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  get currentAreaGroup(): AreaBrowseGroup | null {
    if (!this.selectedAreaKey) {
      return null;
    }

    return this.areaGroups.find((area) => area.key === this.selectedAreaKey) ?? null;
  }

  get currentDistrictGroups(): DistrictBrowseGroup[] {
    return this.currentAreaGroup?.districts ?? [];
  }

  get currentDistrictGroup(): DistrictBrowseGroup | null {
    if (!this.selectedDistrictKey) {
      return null;
    }

    return this.currentDistrictGroups.find((district) => district.key === this.selectedDistrictKey) ?? null;
  }

  get currentChurches(): PublicBranch[] {
    return this.currentDistrictGroup?.branches ?? [];
  }

  get visibleSavedChurchRows(): DonateBranchSheetRow[] {
    if (this.mode !== 'donate' || this.currentLevel !== 'areas' || this.showingRootSearchResults) {
      return [];
    }

    const query = this.normalizedSearchTerm;
    const matchingBranches = this.orderedSavedBranches.filter((branch) =>
      this.matchesQuery([branch.name, branch.district?.name, branch.area?.name, branch.branch_code], query)
    );
    const visibleBranches = !query && !this.showAllSavedChurches ? matchingBranches.slice(0, 4) : matchingBranches;

    return visibleBranches.map((branch) => ({
      kind: 'saved-branch',
      icon: 'heart-outline',
      title: branch.name,
      subtitle: this.getBranchHierarchy(branch),
      ariaLabel:
        this.selectedBranchId === branch.id
          ? `Selected saved church ${branch.name}`
          : `Choose saved church ${branch.name}`,
      selected: this.selectedBranchId === branch.id,
      payload: branch,
    }));
  }

  get browseVisibleRows(): DonateBranchSheetRow[] {
    const query = this.normalizedSearchTerm;

    if (this.showingRootSearchResults) {
      return this.rootSearchRows;
    }

    if (this.currentLevel === 'churches') {
      return this.currentChurches
        .filter((branch) => this.matchesQuery([branch.name, branch.branch_code, branch.district?.name, branch.area?.name], query))
        .map((branch) => ({
          kind: 'church',
          icon: 'location-outline',
          title: branch.name,
          subtitle: this.getChurchSubtitle(branch),
          ariaLabel: this.mode === 'save' ? `Save church ${branch.name}` : `Choose church ${branch.name}`,
          disabled: this.isSaveModeBranchDisabled(branch),
          payload: branch,
        }));
    }

    if (this.currentLevel === 'districts') {
      return this.currentDistrictGroups
        .filter((district) => this.matchesQuery([district.name], query))
        .map((district) => ({
          kind: 'district',
          icon: 'business-outline',
          title: district.name,
          subtitle: `${district.branches.length} church${district.branches.length === 1 ? '' : 'es'}`,
          ariaLabel: `Choose district ${district.name}`,
          payload: district,
        }));
    }

    return this.areaGroups
      .filter((area) => this.matchesQuery([area.name], query))
      .map((area) => ({
        kind: 'area',
        icon: 'map-outline',
        title: area.name,
        subtitle: `${area.districts.length} district${area.districts.length === 1 ? '' : 's'}`,
        ariaLabel: `Choose area ${area.name}`,
        payload: area,
      }));
  }

  get allVisibleRows(): DonateBranchSheetRow[] {
    return [...this.visibleSavedChurchRows, ...this.browseVisibleRows];
  }

  get orderedSavedBranches(): PublicBranch[] {
    const validBranches = (Array.isArray(this.savedBranches) ? this.savedBranches : []).filter(
      (branch) => !!branch?.id && !!branch.name?.trim() && branch.is_active && branch.donations_enabled
    );

    return [...validBranches].sort((left, right) => {
      if (this.selectedBranchId === left.id && this.selectedBranchId !== right.id) {
        return -1;
      }
      if (this.selectedBranchId === right.id && this.selectedBranchId !== left.id) {
        return 1;
      }
      return left.name.localeCompare(right.name);
    });
  }

  get rootSearchRows(): DonateBranchSheetRow[] {
    const query = this.normalizedSearchTerm;
    const allKnownBranches = [...this.allBranches];

    this.orderedSavedBranches.forEach((branch) => {
      if (!allKnownBranches.some((candidate) => candidate.id === branch.id)) {
        allKnownBranches.push(branch);
      }
    });

    const branchRows = allKnownBranches
      .filter((branch) => this.matchesQuery([branch.name, branch.branch_code, branch.district?.name, branch.area?.name], query))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((branch) => ({
        kind: this.savedBranchIds.includes(branch.id) || this.orderedSavedBranches.some((saved) => saved.id === branch.id)
          ? 'saved-branch'
          : 'church',
        icon: this.orderedSavedBranches.some((saved) => saved.id === branch.id) ? 'heart-outline' : 'location-outline',
        title: branch.name,
        subtitle: this.getBranchHierarchy(branch),
        ariaLabel: this.mode === 'save' ? `Save church ${branch.name}` : `Choose church ${branch.name}`,
        disabled: this.mode === 'save' ? this.isSaveModeBranchDisabled(branch) : false,
        payload: branch,
      } satisfies DonateBranchSheetRow));

    const districtRows = this.areaGroups
      .reduce((districts: DistrictBrowseGroup[], area) => districts.concat(area.districts), [])
      .filter((district) => this.matchesQuery([district.name, district.areaName], query))
      .map((district) => ({
        kind: 'district',
        icon: 'business-outline',
        title: district.name,
        subtitle: `${district.areaName} ${this.localeService.translate('churchSelector.areaLabelSuffix')}`,
        ariaLabel: `Choose district ${district.name}`,
        payload: district,
      } satisfies DonateBranchSheetRow));

    const areaRows = this.areaGroups
      .filter((area) => this.matchesQuery([area.name], query))
      .map((area) => ({
        kind: 'area',
        icon: 'map-outline',
        title: area.name,
        subtitle: `${area.districts.length} district${area.districts.length === 1 ? '' : 's'}`,
        ariaLabel: `Choose area ${area.name}`,
        payload: area,
      } satisfies DonateBranchSheetRow));

    return [...branchRows, ...districtRows, ...areaRows];
  }

  loadBranches(): void {
    this.loading = true;
    this.error = null;

    this.branchesService.getAllBranches().subscribe({
      next: (branches) => {
        this.allBranches = branches;
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load churches right now. Please try again.';
        this.loading = false;
      },
    });
  }

  onSearchChange(): void {
    this.searchTerm = this.searchTerm ?? '';
  }

  stepBack(): void {
    if (this.currentLevel === 'churches') {
      this.currentLevel = 'districts';
      this.searchTerm = '';
      return;
    }

    if (this.currentLevel === 'districts') {
      this.currentLevel = 'areas';
      this.searchTerm = '';
      return;
    }

    this.requestDismiss();
  }

  requestDismiss(): void {
    this.closeRequested.emit();
  }

  async handleHardwareBack(): Promise<boolean> {
    if (!this.isOpen) {
      return false;
    }

    if (this.currentLevel === 'churches' || this.currentLevel === 'districts') {
      this.stepBack();
      return true;
    }

    this.requestDismiss();
    return true;
  }

  handleDidDismiss(): void {
    this.dismissed.emit();
  }

  handleRowClick(row: DonateBranchSheetRow): void {
    if (row.kind === 'saved-branch' || row.kind === 'church') {
      const branch = row.payload as PublicBranch;
      if (this.mode === 'save' && this.isSaveModeBranchDisabled(branch)) {
        return;
      }

      this.branchSelected.emit(branch);
      return;
    }

    if (row.kind === 'area') {
      const area = row.payload as AreaBrowseGroup;
      this.selectedAreaKey = area.key;
      this.selectedDistrictKey = null;
      this.currentLevel = 'districts';
      this.searchTerm = '';
      return;
    }

    if (row.kind === 'district') {
      const district = row.payload as DistrictBrowseGroup;
      const parentArea = this.areaGroups.find((area) => area.districts.some((candidate) => candidate.key === district.key)) ?? null;
      this.selectedAreaKey = parentArea?.key ?? this.selectedAreaKey;
      this.selectedDistrictKey = district.key;
      this.currentLevel = 'churches';
      this.searchTerm = '';
      return;
    }

    const area = row.payload as AreaBrowseGroup;
    this.selectedAreaKey = area.key;
    this.selectedDistrictKey = null;
    this.currentLevel = 'districts';
    this.searchTerm = '';
  }

  private resetTransientState(): void {
    this.searchTerm = '';
    this.currentLevel = 'areas';
    this.showAllSavedChurches = false;
    this.selectedAreaKey = null;
    this.selectedDistrictKey = null;
    this.error = null;
  }

  private buildHierarchyKey(prefix: string, id: number | null, fallback: string): string {
    return id !== null ? `${prefix}:${id}` : `${prefix}:${fallback.toLowerCase()}`;
  }

  private getBranchHierarchy(branch: PublicBranch): string {
    const parts = [];
    if (branch.district?.name) {
      parts.push(`${branch.district.name} District`);
    }
    if (branch.area?.name) {
      parts.push(`${branch.area.name} Area`);
    }
    return parts.join(' - ');
  }

  private getChurchSubtitle(branch: PublicBranch): string {
    if (this.mode === 'save') {
      return this.getSaveModeBranchSubtitle(branch);
    }

    return this.getBranchHierarchy(branch);
  }

  private getSaveModeBranchSubtitle(branch: PublicBranch): string {
    if (this.savingBranchId === branch.id) {
      return 'Saving church...';
    }

    if (this.savedBranchIds.includes(branch.id)) {
      return 'Already saved';
    }

    return this.getBranchHierarchy(branch);
  }

  private isSaveModeBranchDisabled(branch: PublicBranch): boolean {
    if (this.mode !== 'save') {
      return false;
    }

    return this.savedBranchIds.includes(branch.id) || this.savingBranchId !== null;
  }

  private matchesQuery(values: Array<string | null | undefined>, query: string): boolean {
    if (!query) {
      return true;
    }

    return values.some((value) => this.normalizeSearchValue(value).includes(query));
  }

  private get normalizedSearchTerm(): string {
    return this.normalizeSearchValue(this.searchTerm);
  }

  private normalizeSearchValue(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
