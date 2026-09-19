import type { PlayerState } from '../types/playerState';

class PlayerScreen {
  get screen() {
    return $('id=video_player');
  }

  // video_play_button is reused between the detail-page preview
  // (detail.screen.ts's previewPlayButton) and this active-player resume
  // control, but DetailScreen.kt only ever composes one of the two at a
  // time (if/else, not show/hide) — same for this button vs. pauseButton
  // within the player itself. So a plain id lookup is never ambiguous.
  // Verified against DetailScreen.kt / PlayerSection.kt.
  get playButton() {
    return $('id=video_play_button');
  }

  get pauseButton() {
    return $('id=video_pause_button');
  }

  get bufferingIndicator() {
    return this.screen.$('id=video_buffering_indicator');
  }

  get progress() {
    return $('id=video_progress');
  }

  get currentPosition() {
    return $('id=video_current_position');
  }

  get duration() {
    return $('id=video_duration');
  }

  get stateLabel() {
    return $('id=video_state_label');
  }

  get errorMessage() {
    return this.screen.$('id=video_error_message');
  }

  get retryButton() {
    return this.screen.$('id=video_retry_button');
  }

  /** Waits for the player to expose the requested observable state. */
  async waitForState(state: Exclude<PlayerState, 'Idle'>): Promise<string> {
    await this.stateLabel.waitForDisplayed();
    let observedState = '';
    await browser.waitUntil(
      async () => {
        observedState = await this.stateLabel.getText();
        return observedState === state;
      },
      {
        timeout: 10000,
        timeoutMsg: `Expected player state to become ${state}`,
      },
    );
    return observedState;
  }

  /** Waits until playback advances beyond its initial position. */
  async waitForPositionToAdvance(): Promise<void> {
    await this.currentPosition.waitForDisplayed();
    await browser.waitUntil(
      async () => (await this.currentPosition.getText()) !== '00:00',
      {
        timeout: 10000,
        timeoutMsg: 'Expected playback position to advance beyond 00:00',
      },
    );
  }

  /** Pauses active playback through the player control. */
  async pausePlayback(): Promise<void> {
    await this.pauseButton.waitForDisplayed();
    await this.pauseButton.click();
  }

  /** Resumes paused playback through the player control. */
  async resumePlayback(): Promise<void> {
    await this.playButton.waitForDisplayed();
    await this.playButton.click();
  }

  /** Retries playback after the player reaches its error state. */
  async retryPlayback(): Promise<void> {
    await this.retryButton.waitForDisplayed();
    await this.retryButton.click();
  }
}

export default new PlayerScreen();
