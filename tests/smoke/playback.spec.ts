import { relaunchWith } from '../../src/helpers/appState';
import type { VideoMode } from '../../src/helpers/launchArgs';
import consentScreen from '../../src/screens/consent.screen';
import detailScreen from '../../src/screens/detail.screen';
import overviewScreen from '../../src/screens/overview.screen';
import playerScreen from '../../src/screens/player.screen';

async function openAmsterdam(videoMode: VideoMode): Promise<void> {
  await relaunchWith({
    resetAllState: true,
    contentMode: 'success',
    videoMode,
    contentDelayMs: 500,
    videoBufferingMs: 3000,
  });
  await consentScreen.waitUntilDisplayed();
  await consentScreen.acceptAll();
  await overviewScreen.list.waitForDisplayed();
  await overviewScreen.openVideo('amsterdam');
  await detailScreen.screen.waitForDisplayed();
}

function positionInSeconds(position: string): number {
  const [minutes, seconds] = position.split(':').map(Number);
  return minutes * 60 + seconds;
}

describe('Playback', () => {
  describe('normal mode', () => {
    beforeEach(async () => {
      await openAmsterdam('normal');
    });

    it('TC03 starts playback and reaches Playing', async () => {
      await detailScreen.startPlayback();

      await playerScreen.waitForState('Buffering');
      await expect(playerScreen.stateLabel).toHaveText('Buffering');
      await playerScreen.waitForState('Playing');
      await expect(playerScreen.stateLabel).toHaveText('Playing');
    });

    it('TC09 pauses and resumes mid-playback', async () => {
      await detailScreen.startPlayback();
      await playerScreen.waitForState('Playing');
      await playerScreen.waitForPositionToAdvance();

      await playerScreen.pausePlayback();
      await playerScreen.waitForState('Paused');
      await expect(playerScreen.stateLabel).toHaveText('Paused');
      const pausedPosition = await playerScreen.currentPosition.getText();
      expect(pausedPosition).not.toBe('00:00');

      await playerScreen.resumePlayback();
      await playerScreen.waitForState('Playing');
      await expect(playerScreen.stateLabel).toHaveText('Playing');
      const resumedPosition = await playerScreen.currentPosition.getText();
      expect(positionInSeconds(resumedPosition)).toBeGreaterThanOrEqual(
        positionInSeconds(pausedPosition),
      );
    });

    it('TC10 reopens content at the saved position', async () => {
      await detailScreen.startPlayback();
      await playerScreen.waitForState('Playing');
      await playerScreen.waitForPositionToAdvance();
      await playerScreen.pausePlayback();
      await playerScreen.waitForState('Paused');
      const savedPosition = await playerScreen.currentPosition.getText();
      expect(savedPosition).not.toBe('00:00');

      await detailScreen.goBack();
      await overviewScreen.list.waitForDisplayed();
      await overviewScreen.openVideo('amsterdam');
      await detailScreen.screen.waitForDisplayed();
      await detailScreen.startPlayback();
      await playerScreen.waitForState('Playing');
      await playerScreen.waitForPositionToAdvance();

      const reopenedPosition = await playerScreen.currentPosition.getText();
      expect(positionInSeconds(reopenedPosition)).toBeGreaterThanOrEqual(
        positionInSeconds(savedPosition),
      );
    });
  });

  describe('complete quickly mode', () => {
    beforeEach(async () => {
      await openAmsterdam('completeQuickly');
    });

    it('TC11 completes playback quickly', async () => {
      await detailScreen.startPlayback();

      await playerScreen.waitForState('Completed');
      await expect(playerScreen.stateLabel).toHaveText('Completed');
    });
  });
});
