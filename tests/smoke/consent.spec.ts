import { relaunchWith } from '../../src/helpers/appState';
import consentScreen from '../../src/screens/consent.screen';
import overviewScreen from '../../src/screens/overview.screen';

describe('Consent', () => {
  beforeEach(async () => {
    await relaunchWith({ resetAllState: true });
  });

  it('TC01 handles consent on first launch and persists the choice', async () => {
    await consentScreen.waitUntilDisplayed();
    await consentScreen.acceptAll();

    await overviewScreen.screen.waitForDisplayed();
    await expect(overviewScreen.screen).toBeDisplayed();

    await relaunchWith();

    await overviewScreen.screen.waitForDisplayed();
    await expect(overviewScreen.screen).toBeDisplayed();
    await expect(consentScreen.screen).not.toBeDisplayed();
  });
});
