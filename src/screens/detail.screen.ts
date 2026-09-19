class DetailScreen {
  get screen() {
    return $('id=content_detail_screen');
  }

  get backButton() {
    return $('id=detail_back_button');
  }

  get title() {
    return $('id=detail_title');
  }

  get category() {
    return $('id=detail_category');
  }

  get description() {
    return $('id=detail_description');
  }

  get previewPlayButton() {
    return this.screen.$('id=video_play_button');
  }

  /** Starts playback from the detail-page preview control. */
  async startPlayback(): Promise<void> {
    await this.previewPlayButton.waitForDisplayed();
    await this.previewPlayButton.click();
  }

  /** Returns from the detail page to the content overview. */
  async goBack(): Promise<void> {
    await this.backButton.waitForDisplayed();
    await this.backButton.click();
  }
}

export default new DetailScreen();
