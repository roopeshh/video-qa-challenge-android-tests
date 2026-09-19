class ConsentScreen {
  get screen() {
    return $('id=consent_screen');
  }

  get acceptButton() {
    return $('id=consent_accept_button');
  }

  get rejectButton() {
    return $('id=consent_reject_button');
  }

  get managePreferencesButton() {
    return $('id=consent_manage_preferences_button');
  }

  /** Waits until the first-launch consent choices are ready for interaction. */
  async waitUntilDisplayed(): Promise<void> {
    await this.screen.waitForDisplayed();
  }

  /** Accepts all consent choices and continues into the app. */
  async acceptAll(): Promise<void> {
    await this.acceptButton.waitForDisplayed();
    await this.acceptButton.click();
  }

  /** Rejects optional consent choices and continues into the app. */
  async rejectOptional(): Promise<void> {
    await this.rejectButton.waitForDisplayed();
    await this.rejectButton.click();
  }

  /** Opens consent preference management without choosing a preset. */
  async managePreferences(): Promise<void> {
    await this.managePreferencesButton.waitForDisplayed();
    await this.managePreferencesButton.click();
  }
}

export default new ConsentScreen();
