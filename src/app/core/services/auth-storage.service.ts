import { Injectable } from '@angular/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

import { MemberProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthStorageService {
  private static readonly accessTokenStorageKey = 'copit.member.access_token';
  private static readonly currentUserStorageKey = 'copit.member.current_user';

  async getAccessToken(): Promise<string | null> {
    return this.getString(AuthStorageService.accessTokenStorageKey);
  }

  async setAccessToken(token: string): Promise<void> {
    await SecureStoragePlugin.set({
      key: AuthStorageService.accessTokenStorageKey,
      value: token,
    });
  }

  async removeAccessToken(): Promise<void> {
    await this.remove(AuthStorageService.accessTokenStorageKey);
  }

  async getCurrentUser(): Promise<MemberProfile | null> {
    const storedProfile = await this.getString(AuthStorageService.currentUserStorageKey);
    if (!storedProfile) {
      return null;
    }

    try {
      return JSON.parse(storedProfile) as MemberProfile;
    } catch {
      await this.remove(AuthStorageService.currentUserStorageKey);
      return null;
    }
  }

  async setCurrentUser(profile: MemberProfile): Promise<void> {
    await SecureStoragePlugin.set({
      key: AuthStorageService.currentUserStorageKey,
      value: JSON.stringify(profile),
    });
  }

  async removeCurrentUser(): Promise<void> {
    await this.remove(AuthStorageService.currentUserStorageKey);
  }

  private async getString(key: string): Promise<string | null> {
    try {
      const result = await SecureStoragePlugin.get({ key });
      const value = result?.value?.trim?.() ?? result?.value;
      return value ? value : null;
    } catch {
      return null;
    }
  }

  private async remove(key: string): Promise<void> {
    try {
      await SecureStoragePlugin.remove({ key });
    } catch {
      // Ignore missing key errors so logout/cleanup can stay idempotent.
    }
  }
}
