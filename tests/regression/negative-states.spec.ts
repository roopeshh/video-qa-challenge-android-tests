import { relaunchWith } from '../../src/helpers/appState';
import type { ContentMode } from '../../src/helpers/launchArgs';
import consentScreen from '../../src/screens/consent.screen';
import overviewScreen from '../../src/screens/overview.screen';

async function launchWithContentMode(
  contentMode: ContentMode,
  contentDelayMs: number,
): Promise<void> {
  await relaunchWith({ resetAllState: true, contentMode, contentDelayMs });
  await consentScreen.waitUntilDisplayed();
  await consentScreen.acceptAll();
}

describe('Negative content states', () => {
  describe('error mode', () => {
    beforeEach(async () => {
      await launchWithContentMode('error', 500);
    });

    it('TC04 displays a content load failure', async () => {
      await overviewScreen.errorState.waitForDisplayed();
      await expect(overviewScreen.errorState).toBeDisplayed();
      expect(await overviewScreen.errorMessage.getText()).toContain(
        'We could not load the videos',
      );
    });
  });

  describe('empty mode', () => {
    beforeEach(async () => {
      await launchWithContentMode('empty', 500);
    });

    it('TC05 displays and retries the empty state', async () => {
      await overviewScreen.emptyState.waitForDisplayed();
      await expect(overviewScreen.emptyState).toBeDisplayed();
      await expect(overviewScreen.emptyMessage).toHaveText(
        'No videos are available',
      );
      await expect(overviewScreen.emptyRetryButton).toBeDisplayed();

      await overviewScreen.retryContent();
      // No separate toBeDisplayed() re-check here: waitForDisplayed() above
      // already is the assertion that it appeared. The loading indicator is
      // transient by design (it resolves back to an end state on its own),
      // so a second round-trip to re-confirm it races the very state it's
      // checking — it can (and did) land after the state has already moved
      // on, failing a check that already passed once.
      await overviewScreen.loadingIndicator.waitForDisplayed();
      await overviewScreen.emptyState.waitForDisplayed();
      await expect(overviewScreen.emptyState).toBeDisplayed();
    });
  });

  describe('slow successful mode', () => {
    beforeEach(async () => {
      await launchWithContentMode('success', 1500);
    });

    it('TC06 transitions through a deterministic slow load', async () => {
      // See the TC05 comment above: no separate toBeDisplayed() re-check —
      // waitForDisplayed() is the assertion, and the indicator is transient
      // by design.
      await overviewScreen.loadingIndicator.waitForDisplayed();

      await overviewScreen.list.waitForDisplayed();
      await expect(overviewScreen.list).toBeDisplayed();
    });
  });
});
