/** The maindata `tags` field is a comma-and-space separated string. */
export function parseTags(tags: string): string[] {
  return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
}

export function joinTags(tags: readonly string[]): string {
  return tags.join(', ');
}
