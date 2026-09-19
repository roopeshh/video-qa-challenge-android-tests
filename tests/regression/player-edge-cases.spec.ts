import { relaunchWith } from '../../src/helpers/appState';
import type { VideoMode } from '../../src/helpers/launchArgs';
import consentScreen from '../../src/screens/consent.screen';
import detailScreen from '../../src/screens/detail.screen';
import overviewScreen from '../../src/screens/overview.screen';
import playerScreen from '../../src/screens/player.screen';

async function openAmsterdam(
  videoMode: VideoMode,
  videoBufferingMs: number,
): Promise<void> {
  await relaunchWith({
    resetAllState: true,
    contentMode: 'success',
    videoMode,
    contentDelayMs: 500,
    videoBufferingMs,
  });
  await consentScreen.waitUntilDisplayed();
  await consentScreen.acceptAll();
  await overviewScreen.list.waitForDisplayed();
  await overviewScreen.openVideo('amsterdam');
  await detailScreen.screen.waitForDisplayed();
}

describe('Player edge cases', () => {
  describe('long buffering mode', () => {
    beforeEach(async () => {
      await openAmsterdam('buffering', 1500);
    });

    it('TC07 holds a fixed long buffering state before Playing', async () => {
      await detailScreen.startPlayback();

      expect(await playerScreen.waitForState('Buffering')).toBe('Buffering');
      await playerScreen.waitForState('Playing');
      await expect(playerScreen.stateLabel).toHaveText('Playing');
    });
  });

  describe('error mode', () => {
    beforeEach(async () => {
      await openAmsterdam('error', 3000);
    });

    it('TC08 retries after a video playback error', async () => {
      await detailScreen.startPlayback();

      expect(await playerScreen.waitForState('Buffering')).toBe('Buffering');
      await playerScreen.waitForState('Error');
      await expect(playerScreen.stateLabel).toHaveText('Error');
      expect(await playerScreen.errorMessage.getText()).toContain(
        'Video could not be played',
      );

      await playerScreen.retryPlayback();
      expect(await playerScreen.waitForState('Buffering')).toBe('Buffering');
    });
  });
});
