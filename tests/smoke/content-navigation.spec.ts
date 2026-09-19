import { content, contentTitles } from '../../src/fixtures/content';
import { relaunchWith } from '../../src/helpers/appState';
import consentScreen from '../../src/screens/consent.screen';
import detailScreen from '../../src/screens/detail.screen';
import overviewScreen from '../../src/screens/overview.screen';

describe('Content navigation', () => {
  beforeEach(async () => {
    await relaunchWith({
      resetAllState: true,
      contentMode: 'success',
      contentDelayMs: 1500,
    });
    await consentScreen.waitUntilDisplayed();
    await consentScreen.acceptAll();
    await overviewScreen.list.waitForDisplayed();
  });

  it('TC02 opens the correct video detail page', async () => {
    await overviewScreen.openVideo('amsterdam');

    await detailScreen.screen.waitForDisplayed();
    await expect(detailScreen.title).toHaveText('Amsterdam from above');
    await expect(detailScreen.title).toHaveAttribute(
      'content-desc',
      'amsterdam',
    );
  });

  it('TC12 reaches a below-the-fold item by content id', async () => {
    await overviewScreen.openVideo('interview');

    await detailScreen.screen.waitForDisplayed();
    await expect(detailScreen.title).toHaveText('Interview of the day');
    await expect(detailScreen.title).toHaveAttribute(
      'content-desc',
      'interview',
    );
  });

  it('TC13 refreshes content through the loading state', async () => {
    const titlesBeforeRefresh =
      await overviewScreen.getContentTitlesInDisplayOrder(content.length);

    await overviewScreen.refreshContent();
    // No separate toBeDisplayed() re-check — waitForDisplayed() is the
    // assertion. The loading indicator is transient by design (it resolves
    // to the list on its own, using the app's default unfixed reload delay
    // here), so a second round-trip to re-confirm it races the very state
    // it's checking.
    await overviewScreen.loadingIndicator.waitForDisplayed();
    await overviewScreen.list.waitForDisplayed();

    const titlesAfterRefresh =
      await overviewScreen.getContentTitlesInDisplayOrder(content.length);

    expect(titlesBeforeRefresh).toEqual(contentTitles);
    expect(titlesAfterRefresh).toEqual(contentTitles);
  });
});
