class OverviewScreen {
  get screen() {
    return $('id=content_overview_screen');
  }

  get list() {
    return $('id=content_list');
  }

  get loadingIndicator() {
    return $('id=content_loading_indicator');
  }

  get refreshButton() {
    return $('id=content_refresh_button');
  }

  get debugOptionsButton() {
    return $('id=debug_options_button');
  }

  get emptyState() {
    return $('id=content_empty_state');
  }

  get emptyRetryButton() {
    return $('id=content_empty_retry_button');
  }

  get emptyMessage() {
    return $('//*[@text="No videos are available"]');
  }

  get errorState() {
    return $('id=content_error_state');
  }

  get errorMessage() {
    return $('id=content_error_message');
  }

  get errorRetryButton() {
    return $('id=content_error_retry_button');
  }

  contentItem(contentId: string) {
    return $(`id=content_item_${contentId}`);
  }

  contentTitle(contentId: string) {
    return $(`id=content_title_${contentId}`);
  }

  get contentTitles() {
    return $$('//*[starts-with(@resource-id, "content_title_")]');
  }

  /** Opens a video by content id, scrolling into view first. Never uses list position. */
  async openVideo(contentId: string): Promise<void> {
    await this.list.waitForDisplayed();
    const item = this.contentItem(contentId);
    await item.scrollIntoView({
      direction: 'up',
      maxScrolls: 10,
      scrollableElement: this.list,
    });
    await item.click();
  }

  /** Reads content titles in their displayed order while scrolling down the list. */
  async getContentTitlesInDisplayOrder(
    expectedCount: number,
  ): Promise<string[]> {
    await this.list.waitForDisplayed();
    const titles: string[] = [];

    await browser.waitUntil(
      async () => {
        // False positive: webdriverio's ChainablePromiseArray resolves via
        // runtime Proxy magic that its own .d.ts doesn't declare a then()
        // for, but it genuinely must be awaited — iterating it unresolved
        // yields undefined entries instead of elements.
        // eslint-disable-next-line @typescript-eslint/await-thenable
        const visibleTitles = await this.contentTitles;
        const positionedTitles: Array<{ text: string; y: number }> = [];

        for (const title of visibleTitles) {
          positionedTitles.push({
            text: await title.getText(),
            y: await title.getLocation('y'),
          });
        }

        positionedTitles.sort((first, second) => first.y - second.y);
        for (const { text } of positionedTitles) {
          if (!titles.includes(text)) {
            titles.push(text);
          }
        }

        if (titles.length >= expectedCount) {
          return true;
        }

        await browser.swipe({
          direction: 'up',
          percent: 0.8,
          scrollableElement: this.list,
        });
        return false;
      },
      {
        timeout: 30000,
        timeoutMsg: `Expected to read ${expectedCount} content titles in display order`,
      },
    );

    return titles;
  }

  /** Requests a reload of the overview content. */
  async refreshContent(): Promise<void> {
    await this.refreshButton.waitForDisplayed();
    await this.refreshButton.click();
  }

  /** Retries loading from the currently displayed empty or error result. */
  async retryContent(): Promise<void> {
    if (await this.errorRetryButton.isDisplayed()) {
      await this.errorRetryButton.click();
      return;
    }

    await this.emptyRetryButton.waitForDisplayed();
    await this.emptyRetryButton.click();
  }
}

export default new OverviewScreen();
