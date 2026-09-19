/** The six videos bundled in the app's content.json fixture, in display order. */
export const content = [
  { id: 'amsterdam', title: 'Amsterdam from above' },
  { id: 'newsroom', title: 'Inside the newsroom' },
  { id: 'morning', title: 'Morning news update' },
  { id: 'technology', title: 'Technology of tomorrow' },
  { id: 'travel', title: 'Weekend travel guide' },
  { id: 'interview', title: 'Interview of the day' },
] as const;

export const contentTitles = content.map(({ title }) => title);
