export class OverlayStateController {
  private open = false;

  get isOpen(): boolean {
    return this.open;
  }

  sync(nextOpen: boolean): boolean {
    const changed = this.open !== nextOpen;
    this.open = nextOpen;
    return changed;
  }

  openOverlay(): boolean {
    return this.sync(true);
  }

  closeOverlay(): boolean {
    return this.sync(false);
  }

  handleDidDismiss(): boolean {
    return this.closeOverlay();
  }
}
