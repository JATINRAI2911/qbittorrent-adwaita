import { trackerHosts } from './filters';

/** hash → tracker hosts, kept in step with the session's live `trackers` map. */
export class TrackerIndex {
  constructor(private readonly trackers: ReadonlyMap<string, readonly string[]>) {}

  readonly byHash = $derived.by(() => trackerHosts(this.trackers));
}
