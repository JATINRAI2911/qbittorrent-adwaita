/**
 * Every qBittorrent 5.2 preference, in one declarative table. Labels, option values and
 * ranges follow qBittorrent 5.2.0's own `preferences.html`, reworded in GNOME sentence case.
 * A unit test checks this table against the recorded `app/preferences` keys.
 */
import type { IconName } from '../../ui/adw/icons';

export type PageId = 'behavior' | 'downloads' | 'connection' | 'speed' | 'bittorrent' | 'rss' | 'webui' | 'advanced';
export type Prefs = Record<string, unknown>;
type When = (p: Prefs) => boolean;
export type OptionValue = string | number | boolean;

interface Base {
  /** The preference key; `@name` marks rows that open something rather than hold a value. */
  key: string;
  page: PageId;
  group: string;
  label: string;
  subtitle?: string;
  visibleWhen?: When;
  enabledWhen?: When;
  /** The controlling row's label, for "Needs “…”" in search results. */
  needs?: string;
  /** Confirm before applying; `dangerousWhen` narrows it to some transitions. */
  dangerous?: 'url' | 'auth' | 'webui';
  dangerousWhen?: (from: unknown, to: unknown) => boolean;
  /** Takes effect after qBittorrent restarts. */
  restart?: boolean;
  /** Shown inside that sub-page instead of on the page. */
  sub?: string;
}

export type PrefDef = Base &
  (
    | { kind: 'switch' }
    | { kind: 'spin'; min?: number; max?: number; step?: number; digits?: number; unit?: string; scale?: number }
    /** A value that is off at −1 (or its `enabledKey` switch), shown as a switch plus a spin. */
    | { kind: 'limit'; enabledKey?: string; min?: number; max?: number; digits?: number; unit?: string; fallback: number }
    | { kind: 'combo'; options: { value: OptionValue; label: string }[] }
    | { kind: 'entry'; password?: boolean; placeholder?: string }
    | { kind: 'path'; files?: boolean; placeholder?: string }
    | { kind: 'list'; separator: '\n' | ',' | ';'; itemLabel: string; readOnly?: boolean }
    /** An hour key paired with its minute key, edited as one time. */
    | { kind: 'time'; minuteKey: string }
    | { kind: 'subpage'; subpage: string; title: string }
    | { kind: 'custom'; widget: 'locale' | 'interface' | 'apiKey' | 'watchedFolders' | 'categories' | 'tags' | 'testEmail'; keys?: string[] }
  );

export const PAGES: { id: PageId; title: string; icon: IconName }[] = [
  { id: 'behavior', title: 'Behavior', icon: 'view-list' },
  { id: 'downloads', title: 'Downloads', icon: 'go-down' },
  { id: 'connection', title: 'Connection', icon: 'network' },
  { id: 'speed', title: 'Speed', icon: 'turtle' },
  { id: 'bittorrent', title: 'BitTorrent', icon: 'magnet' },
  { id: 'rss', title: 'RSS', icon: 'link' },
  { id: 'webui', title: 'Web UI', icon: 'link' },
  { id: 'advanced', title: 'Advanced', icon: 'edit' },
];

/** RSS keys are covered, but the page stays hidden until RSS lands (v2). */
export const HIDDEN_PAGES: PageId[] = ['rss'];
/** Keys qBittorrent accepts but never returns. */
export const WRITE_ONLY = ['web_ui_password'];

type Row = PrefDef extends infer D ? (D extends PrefDef ? Omit<D, 'page' | 'group'> : never) : never;

const on = (key: string, label: string) => ({ visibleWhen: (p: Prefs) => p[key] === true, needs: label });
const all = (keys: string[], label: string) => ({ visibleWhen: (p: Prefs) => keys.every((k) => p[k] === true), needs: label });
const sw = (key: string, label: string, more: Partial<Base> = {}): Row => ({ kind: 'switch', key, label, ...more });
const spin = (key: string, label: string, more: Partial<Base> & Omit<Extract<Row, { kind: 'spin' }>, 'kind' | 'key' | 'label'> = {}): Row => ({ kind: 'spin', key, label, ...more });
const combo = (key: string, label: string, options: [OptionValue, string][], more: Partial<Base> = {}): Row => ({
  kind: 'combo',
  key,
  label,
  options: options.map(([value, text]) => ({ value, label: text })),
  ...more,
});
const entry = (key: string, label: string, more: Partial<Base> & { password?: boolean; placeholder?: string } = {}): Row => ({ kind: 'entry', key, label, ...more });
const path = (key: string, label: string, more: Partial<Base> & { files?: boolean; placeholder?: string } = {}): Row => ({ kind: 'path', key, label, ...more });
const list = (key: string, label: string, separator: '\n' | ',' | ';', itemLabel: string, more: Partial<Base> & { readOnly?: boolean } = {}): Row => ({
  kind: 'list',
  key,
  label,
  separator,
  itemLabel,
  ...more,
});
const limit = (key: string, label: string, fallback: number, more: Partial<Base> & Omit<Extract<Row, { kind: 'limit' }>, 'kind' | 'key' | 'label' | 'fallback'> = {}): Row => ({
  kind: 'limit',
  key,
  label,
  fallback,
  ...more,
});

function group(page: PageId, name: string, rows: Row[]): PrefDef[] {
  return rows.map((row) => ({ ...row, page, group: name }) as PrefDef);
}

const PORT = { min: 0, max: 65535 };
const MANUAL_TMM: [OptionValue, string][] = [
  [true, 'Relocate affected torrents'],
  [false, 'Switch affected torrents to manual mode'],
];
const PARAMETERS =
  '%N name · %L category · %G tags · %F content path · %R root path · %D save path · %C number of files · %Z size · %T tracker · %I info hash v1 · %J info hash v2 · %K torrent ID';

export const PREFERENCES: PrefDef[] = [
  // ─── Behavior ───
  ...group('behavior', 'Language', [
    { kind: 'custom', widget: 'locale', key: 'locale', label: 'Web UI language', subtitle: 'For qBittorrent’s own pages and messages; this interface is in English' },
  ]),
  ...group('behavior', 'Transfer List', [
    sw('confirm_torrent_deletion', 'Confirm when deleting torrents'),
    sw('delete_torrent_content_files', 'Also delete files by default', { subtitle: 'When removing torrents' }),
  ]),
  ...group('behavior', 'Interface', [
    sw('status_bar_external_ip', 'Show the external IP address in the status bar'),
    sw('performance_warning', 'Log performance warnings'),
  ]),
  ...group('behavior', 'Log File', [
    sw('file_log_enabled', 'Save the log to a file'),
    path('file_log_path', 'Log folder', on('file_log_enabled', 'Save the log to a file')),
    sw('file_log_backup_enabled', 'Back up the log file', on('file_log_enabled', 'Save the log to a file')),
    spin('file_log_max_size', 'Back up after', { unit: 'KiB', min: 1, max: 1024000, ...all(['file_log_enabled', 'file_log_backup_enabled'], 'Back up the log file') }),
    sw('file_log_delete_old', 'Delete old backups', on('file_log_enabled', 'Save the log to a file')),
    spin('file_log_age', 'Delete backups older than', { min: 1, max: 365, ...all(['file_log_enabled', 'file_log_delete_old'], 'Delete old backups') }),
    combo('file_log_age_type', 'Age unit', [[0, 'Days'], [1, 'Months'], [2, 'Years']], all(['file_log_enabled', 'file_log_delete_old'], 'Delete old backups')),
  ]),

  // ─── Downloads ───
  ...group('downloads', 'When Adding Torrents', [
    combo('torrent_content_layout', 'Content layout', [['Original', 'Original'], ['Subfolder', 'Create subfolder'], ['NoSubfolder', 'Don’t create subfolder']]),
    sw('add_to_top_of_queue', 'Add to the top of the queue'),
    sw('add_stopped_enabled', 'Add torrents stopped', { subtitle: 'Don’t start downloading automatically' }),
    combo('torrent_stop_condition', 'Stop when', [['None', 'Never'], ['MetadataReceived', 'Metadata received'], ['FilesChecked', 'Files checked']], {
      visibleWhen: (p) => p.add_stopped_enabled !== true,
      needs: 'Add torrents stopped off',
    }),
    sw('merge_trackers', 'Merge trackers into duplicates', { subtitle: 'When adding a torrent that already exists' }),
    combo('auto_delete_mode', 'Delete .torrent files afterwards', [[0, 'Never'], [1, 'When added'], [2, 'Always, even if adding is cancelled']]),
  ]),
  ...group('downloads', 'Files', [
    sw('preallocate_all', 'Pre-allocate disk space for all files'),
    sw('incomplete_files_ext', 'Add .!qB to incomplete files'),
    sw('use_unwanted_folder', 'Keep unselected files in “.unwanted”'),
    sw('excluded_file_names_enabled', 'Exclude file names'),
    list('excluded_file_names', 'Excluded names', '\n', 'pattern', { subtitle: 'Wildcards like *.txt; one per line', ...on('excluded_file_names_enabled', 'Exclude file names') }),
  ]),
  ...group('downloads', 'Saving', [
    combo('auto_tmm_enabled', 'Default management mode', [[false, 'Manual'], [true, 'Automatic']]),
    combo('torrent_changed_tmm_enabled', 'When a torrent’s category changes', [[true, 'Relocate the torrent'], [false, 'Switch the torrent to manual mode']]),
    combo('save_path_changed_tmm_enabled', 'When the default save path changes', MANUAL_TMM),
    combo('category_changed_tmm_enabled', 'When a category’s save path changes', MANUAL_TMM),
    sw('use_category_paths_in_manual_mode', 'Use category paths in manual mode'),
    path('save_path', 'Default save path'),
    sw('temp_path_enabled', 'Keep incomplete torrents elsewhere'),
    path('temp_path', 'Incomplete torrents folder', on('temp_path_enabled', 'Keep incomplete torrents elsewhere')),
    path('export_dir', 'Copy .torrent files to', { placeholder: 'Don’t copy', subtitle: 'Leave empty to not copy' }),
    path('export_dir_fin', 'Copy .torrent files of finished downloads to', { placeholder: 'Don’t copy', subtitle: 'Leave empty to not copy' }),
  ]),
  ...group('downloads', 'Watched Folders', [
    { kind: 'custom', widget: 'watchedFolders', key: 'scan_dirs', label: 'Watched folders', subtitle: 'Add .torrent files that appear in these folders' },
  ]),
  ...group('downloads', 'Notifications', [
    { kind: 'subpage', subpage: 'email', title: 'Email Notification', key: '@email', label: 'Email notification', subtitle: 'Send an email when a download finishes' },
    { kind: 'subpage', subpage: 'autorun', title: 'Run External Program', key: '@autorun', label: 'Run an external program', subtitle: 'When torrents are added or finish' },
  ]),
  ...group('downloads', 'Email', [
    sw('mail_notification_enabled', 'Send an email when a download finishes', { sub: 'email' }),
    entry('mail_notification_sender', 'From', { sub: 'email', ...on('mail_notification_enabled', 'Send an email') }),
    entry('mail_notification_email', 'To', { sub: 'email', ...on('mail_notification_enabled', 'Send an email') }),
    entry('mail_notification_smtp', 'SMTP server', { sub: 'email', ...on('mail_notification_enabled', 'Send an email') }),
    sw('mail_notification_ssl_enabled', 'Use a secure connection (SSL)', { sub: 'email', ...on('mail_notification_enabled', 'Send an email') }),
    sw('mail_notification_auth_enabled', 'The server requires authentication', { sub: 'email', ...on('mail_notification_enabled', 'Send an email') }),
    entry('mail_notification_username', 'Username', { sub: 'email', ...all(['mail_notification_enabled', 'mail_notification_auth_enabled'], 'Authentication') }),
    entry('mail_notification_password', 'Password', { password: true, sub: 'email', ...all(['mail_notification_enabled', 'mail_notification_auth_enabled'], 'Authentication') }),
    { kind: 'custom', widget: 'testEmail', key: '@test_email', label: 'Send a test email', sub: 'email', ...on('mail_notification_enabled', 'Send an email') },
  ]),
  ...group('downloads', 'External Program', [
    sw('autorun_on_torrent_added_enabled', 'Run when a torrent is added', { sub: 'autorun' }),
    entry('autorun_on_torrent_added_program', 'Command', { sub: 'autorun', subtitle: PARAMETERS, ...on('autorun_on_torrent_added_enabled', 'Run when a torrent is added') }),
    sw('autorun_enabled', 'Run when a torrent finishes', { sub: 'autorun' }),
    entry('autorun_program', 'Command', { sub: 'autorun', subtitle: PARAMETERS, ...on('autorun_enabled', 'Run when a torrent finishes') }),
  ]),

  // ─── Connection ───
  ...group('connection', 'Protocol', [combo('bittorrent_protocol', 'Peer connection protocol', [[0, 'TCP and μTP'], [1, 'TCP'], [2, 'μTP']])]),
  ...group('connection', 'Listening Port', [
    spin('listen_port', 'Port for incoming connections', PORT),
    sw('upnp', 'Forward the port with UPnP / NAT-PMP'),
    sw('random_port', 'Use a different port on each start'),
    sw('ssl_enabled', 'Accept SSL/TLS peer connections'),
    spin('ssl_listen_port', 'SSL/TLS port', { ...PORT, ...on('ssl_enabled', 'Accept SSL/TLS peer connections') }),
  ]),
  ...group('connection', 'Connection Limits', [
    limit('max_connec', 'Global connections', 500, { min: 1, max: 65535 }),
    limit('max_connec_per_torrent', 'Connections per torrent', 100, { min: 1, max: 65535 }),
    limit('max_uploads', 'Global upload slots', 20, { min: 1, max: 65535 }),
    limit('max_uploads_per_torrent', 'Upload slots per torrent', 4, { min: 1, max: 65535 }),
  ]),
  ...group('connection', 'I2P', [
    sw('i2p_enabled', 'Connect through I2P', { subtitle: 'Experimental' }),
    entry('i2p_address', 'Host', on('i2p_enabled', 'Connect through I2P')),
    spin('i2p_port', 'Port', { ...PORT, ...on('i2p_enabled', 'Connect through I2P') }),
    sw('i2p_mixed_mode', 'Mixed mode', { subtitle: 'Also connect to peers outside I2P', ...on('i2p_enabled', 'Connect through I2P') }),
  ]),
  ...group('connection', 'Proxy', [
    combo('proxy_type', 'Type', [['None', 'None'], ['SOCKS4', 'SOCKS4'], ['SOCKS5', 'SOCKS5'], ['HTTP', 'HTTP']]),
    entry('proxy_ip', 'Host', { visibleWhen: (p) => p.proxy_type !== 'None', needs: 'a proxy type' }),
    spin('proxy_port', 'Port', { ...PORT, visibleWhen: (p) => p.proxy_type !== 'None', needs: 'a proxy type' }),
    sw('proxy_auth_enabled', 'Authentication', { visibleWhen: (p) => p.proxy_type === 'SOCKS5' || p.proxy_type === 'HTTP', needs: 'a SOCKS5 or HTTP proxy' }),
    entry('proxy_username', 'Username', { visibleWhen: (p) => p.proxy_type !== 'None' && p.proxy_auth_enabled === true, needs: 'Authentication' }),
    entry('proxy_password', 'Password', { password: true, visibleWhen: (p) => p.proxy_type !== 'None' && p.proxy_auth_enabled === true, needs: 'Authentication' }),
    sw('proxy_hostname_lookup', 'Look up host names through the proxy', { visibleWhen: (p) => p.proxy_type !== 'None', needs: 'a proxy type' }),
    sw('proxy_bittorrent', 'Use for BitTorrent', { visibleWhen: (p) => p.proxy_type !== 'None', needs: 'a proxy type' }),
    sw('proxy_peer_connections', 'Use for peer connections', { visibleWhen: (p) => p.proxy_type !== 'None' && p.proxy_bittorrent === true, needs: 'Use for BitTorrent' }),
    sw('proxy_rss', 'Use for RSS', { visibleWhen: (p) => p.proxy_type !== 'None', needs: 'a proxy type' }),
    sw('proxy_misc', 'Use for everything else', { subtitle: 'Updates, search and other requests', visibleWhen: (p) => p.proxy_type !== 'None', needs: 'a proxy type' }),
  ]),
  ...group('connection', 'IP Filtering', [
    sw('ip_filter_enabled', 'Filter IP addresses'),
    path('ip_filter_path', 'Filter file', { files: true, subtitle: '.dat, .p2p or .p2b', ...on('ip_filter_enabled', 'Filter IP addresses') }),
    sw('ip_filter_trackers', 'Apply the filter to trackers', on('ip_filter_enabled', 'Filter IP addresses')),
    list('banned_IPs', 'Banned IP addresses', '\n', 'address'),
  ]),

  // ─── Speed ───
  ...group('speed', 'Global Limits', [
    spin('dl_limit', 'Download', { unit: 'KiB/s', scale: 1024, subtitle: '0 means unlimited' }),
    spin('up_limit', 'Upload', { unit: 'KiB/s', scale: 1024, subtitle: '0 means unlimited' }),
  ]),
  ...group('speed', 'Alternative Limits', [
    spin('alt_dl_limit', 'Alternative download', { unit: 'KiB/s', scale: 1024, subtitle: '0 means unlimited' }),
    spin('alt_up_limit', 'Alternative upload', { unit: 'KiB/s', scale: 1024, subtitle: '0 means unlimited' }),
  ]),
  ...group('speed', 'Schedule', [
    sw('scheduler_enabled', 'Use alternative limits on a schedule'),
    { kind: 'time', key: 'schedule_from_hour', minuteKey: 'schedule_from_min', label: 'From', ...on('scheduler_enabled', 'Use alternative limits on a schedule') },
    { kind: 'time', key: 'schedule_to_hour', minuteKey: 'schedule_to_min', label: 'To', ...on('scheduler_enabled', 'Use alternative limits on a schedule') },
    combo(
      'scheduler_days',
      'Days',
      [[0, 'Every day'], [1, 'Weekdays'], [2, 'Weekends'], [3, 'Monday'], [4, 'Tuesday'], [5, 'Wednesday'], [6, 'Thursday'], [7, 'Friday'], [8, 'Saturday'], [9, 'Sunday']],
      on('scheduler_enabled', 'Use alternative limits on a schedule'),
    ),
  ]),
  ...group('speed', 'Rate Limit Settings', [
    sw('limit_utp_rate', 'Apply limits to µTP'),
    sw('limit_tcp_overhead', 'Apply limits to transport overhead'),
    sw('limit_lan_peers', 'Apply limits to peers on the local network'),
  ]),

  // ─── BitTorrent ───
  ...group('bittorrent', 'Privacy', [
    sw('dht', 'Find peers with DHT', { subtitle: 'Decentralized network' }),
    sw('pex', 'Find peers with Peer Exchange (PeX)'),
    sw('lsd', 'Find peers on the local network', { subtitle: 'Local Peer Discovery' }),
    combo('encryption', 'Encryption', [[0, 'Allow encryption'], [1, 'Require encryption'], [2, 'Disable encryption']]),
    sw('anonymous_mode', 'Anonymous mode'),
  ]),
  ...group('bittorrent', 'Queueing', [
    spin('max_active_checking_torrents', 'Torrents checked at once', { min: -1, subtitle: '−1 means unlimited' }),
    sw('queueing_enabled', 'Queue torrents'),
    spin('max_active_downloads', 'Active downloads', { min: -1, subtitle: '−1 means unlimited', ...on('queueing_enabled', 'Queue torrents') }),
    spin('max_active_uploads', 'Active uploads', { min: -1, subtitle: '−1 means unlimited', ...on('queueing_enabled', 'Queue torrents') }),
    spin('max_active_torrents', 'Active torrents', { min: -1, subtitle: '−1 means unlimited', ...on('queueing_enabled', 'Queue torrents') }),
    sw('dont_count_slow_torrents', 'Don’t count slow torrents', on('queueing_enabled', 'Queue torrents')),
    spin('slow_torrent_dl_rate_threshold', 'Slow below this download speed', { unit: 'KiB/s', ...all(['queueing_enabled', 'dont_count_slow_torrents'], 'Don’t count slow torrents') }),
    spin('slow_torrent_ul_rate_threshold', 'Slow below this upload speed', { unit: 'KiB/s', ...all(['queueing_enabled', 'dont_count_slow_torrents'], 'Don’t count slow torrents') }),
    spin('slow_torrent_inactive_timer', 'Inactivity timer', { unit: 's', ...all(['queueing_enabled', 'dont_count_slow_torrents'], 'Don’t count slow torrents') }),
  ]),
  ...group('bittorrent', 'Seeding Limits', [
    limit('max_ratio', 'Stop at ratio', 1, { enabledKey: 'max_ratio_enabled', min: 0, max: 9998, digits: 2 }),
    limit('max_seeding_time', 'Stop after seeding for', 1440, { enabledKey: 'max_seeding_time_enabled', min: 0, max: 525600, unit: 'min' }),
    limit('max_inactive_seeding_time', 'Stop after inactive seeding for', 1440, { enabledKey: 'max_inactive_seeding_time_enabled', min: 0, max: 525600, unit: 'min' }),
    combo('max_ratio_act', 'Then', [[0, 'Stop torrent'], [1, 'Remove torrent'], [3, 'Remove torrent and its files'], [2, 'Enable super seeding']], {
      visibleWhen: (p) => p.max_ratio_enabled === true || p.max_seeding_time_enabled === true || p.max_inactive_seeding_time_enabled === true,
      needs: 'a seeding limit',
    }),
  ]),
  ...group('bittorrent', 'Trackers', [
    sw('add_trackers_enabled', 'Add these trackers to new downloads'),
    list('add_trackers', 'Trackers', '\n', 'tracker URL', on('add_trackers_enabled', 'Add these trackers to new downloads')),
    sw('add_trackers_from_url_enabled', 'Add trackers from a URL to new downloads'),
    entry('add_trackers_url', 'Tracker list URL', on('add_trackers_from_url_enabled', 'Add trackers from a URL')),
    list('add_trackers_url_list', 'Fetched trackers', '\n', 'tracker URL', { readOnly: true, ...on('add_trackers_from_url_enabled', 'Add trackers from a URL') }),
  ]),

  // ─── RSS (hidden until v2) ───
  ...group('rss', 'RSS Reader', [
    sw('rss_processing_enabled', 'Fetch RSS feeds'),
    spin('rss_refresh_interval', 'Refresh feeds every', { unit: 'min', min: 1 }),
    spin('rss_fetch_delay', 'Delay between requests to the same host', { unit: 's', min: 0 }),
    spin('rss_max_articles_per_feed', 'Articles kept per feed', { min: 1 }),
  ]),
  ...group('rss', 'Auto Downloader', [
    sw('rss_auto_downloading_enabled', 'Download torrents from RSS automatically'),
    sw('rss_download_repack_proper_episodes', 'Download REPACK and PROPER episodes'),
    list('rss_smart_episode_filters', 'Smart episode filters', '\n', 'filter'),
  ]),

  // ─── Web UI ───
  ...group('webui', 'Server', [
    entry('web_ui_address', 'Address', { subtitle: '* listens on every address', dangerous: 'url' }),
    spin('web_ui_port', 'Port', { min: 1, max: 65535, dangerous: 'url' }),
    sw('web_ui_upnp', 'Forward the port with UPnP / NAT-PMP'),
    sw('use_https', 'Use HTTPS', { dangerous: 'url' }),
    path('web_ui_https_cert_path', 'Certificate', { files: true, ...on('use_https', 'Use HTTPS') }),
    path('web_ui_https_key_path', 'Key', { files: true, ...on('use_https', 'Use HTTPS') }),
  ]),
  ...group('webui', 'Authentication', [
    entry('web_ui_username', 'Username', { dangerous: 'auth' }),
    entry('web_ui_password', 'New password', { password: true, placeholder: 'Unchanged', subtitle: 'At least 6 characters', dangerous: 'auth' }),
    sw('bypass_local_auth', 'Skip authentication for localhost', { dangerous: 'auth', dangerousWhen: (_from, to) => to === false }),
    sw('bypass_auth_subnet_whitelist_enabled', 'Skip authentication for these subnets'),
    list('bypass_auth_subnet_whitelist', 'Subnets', '\n', 'subnet', { subtitle: 'Like 192.168.0.0/24; one per line', ...on('bypass_auth_subnet_whitelist_enabled', 'Skip authentication for these subnets') }),
    spin('web_ui_max_auth_fail_count', 'Ban after failed logins', { min: 0, subtitle: '0 never bans' }),
    spin('web_ui_ban_duration', 'Ban for', { unit: 's', min: 1 }),
    spin('web_ui_session_timeout', 'Session timeout', { unit: 's', min: 0 }),
    { kind: 'custom', widget: 'apiKey', key: 'web_ui_api_key', label: 'API key', subtitle: 'For scripts and other apps' },
  ]),
  ...group('webui', 'Security', [
    sw('web_ui_clickjacking_protection_enabled', 'Clickjacking protection'),
    sw('web_ui_csrf_protection_enabled', 'Cross-site request forgery (CSRF) protection'),
    sw('web_ui_secure_cookie_enabled', 'Secure cookie flag', { subtitle: 'Needs HTTPS or localhost' }),
    sw('web_ui_host_header_validation_enabled', 'Host header validation'),
    list('web_ui_domain_list', 'Server domains', ';', 'domain', on('web_ui_host_header_validation_enabled', 'Host header validation')),
    sw('web_ui_use_custom_http_headers_enabled', 'Add custom HTTP headers'),
    list('web_ui_custom_http_headers', 'Headers', '\n', 'header', { subtitle: 'Name: value; one per line', ...on('web_ui_use_custom_http_headers_enabled', 'Add custom HTTP headers') }),
    sw('web_ui_reverse_proxy_enabled', 'Reverse proxy support'),
    entry('web_ui_reverse_proxies_list', 'Trusted proxies', { subtitle: 'Separate with ;', ...on('web_ui_reverse_proxy_enabled', 'Reverse proxy support') }),
  ]),
  ...group('webui', 'Alternative Web UI', [
    sw('alternative_webui_enabled', 'Use an alternative Web UI', { dangerous: 'webui' }),
    path('alternative_webui_path', 'Files location', { dangerous: 'webui', ...on('alternative_webui_enabled', 'Use an alternative Web UI') }),
  ]),
  ...group('webui', 'Dynamic DNS', [
    sw('dyndns_enabled', 'Update a dynamic domain name'),
    combo('dyndns_service', 'Service', [[0, 'DynDNS'], [1, 'NO-IP']], on('dyndns_enabled', 'Update a dynamic domain name')),
    entry('dyndns_domain', 'Domain name', on('dyndns_enabled', 'Update a dynamic domain name')),
    entry('dyndns_username', 'Username', on('dyndns_enabled', 'Update a dynamic domain name')),
    entry('dyndns_password', 'Password', { password: true, ...on('dyndns_enabled', 'Update a dynamic domain name') }),
  ]),

  // ─── Advanced ───
  ...group('advanced', 'qBittorrent', [
    { kind: 'custom', widget: 'categories', key: '@categories', label: 'Categories', subtitle: 'Names and save paths' },
    { kind: 'custom', widget: 'tags', key: '@tags', label: 'Tags' },
    combo('resume_data_storage_type', 'Resume data storage', [['Legacy', 'Fastresume files'], ['SQLite', 'SQLite database (experimental)']], { restart: true }),
    combo('torrent_content_remove_option', 'When deleting files', [['Delete', 'Delete them permanently'], ['MoveToTrash', 'Move them to the trash if possible']]),
    spin('memory_working_set_limit', 'Physical memory (RAM) limit', { unit: 'MiB', min: 1 }),
    { kind: 'custom', widget: 'interface', key: 'current_network_interface', keys: ['current_interface_name', 'current_interface_address'], label: 'Network interface' },
    spin('save_resume_data_interval', 'Save resume data every', { unit: 'min', min: 0 }),
    spin('save_statistics_interval', 'Save statistics every', { unit: 'min', min: 0 }),
    spin('torrent_file_size_limit', '.torrent file size limit', { unit: 'MiB', scale: 1024 * 1024, min: 1 }),
    sw('confirm_torrent_recheck', 'Confirm torrent rechecks'),
    sw('recheck_completed_torrents', 'Recheck torrents when they complete'),
    entry('app_instance_name', 'Instance name', { subtitle: 'Shown in the window title' }),
    spin('refresh_interval', 'Refresh interval', { unit: 'ms', min: 100 }),
    sw('resolve_peer_host_names', 'Resolve peer host names'),
    sw('resolve_peer_countries', 'Resolve peer countries'),
    sw('reannounce_when_address_changed', 'Reannounce when the IP address or port changes'),
    sw('enable_embedded_tracker', 'Embedded tracker'),
    spin('embedded_tracker_port', 'Embedded tracker port', { ...PORT, ...on('enable_embedded_tracker', 'Embedded tracker') }),
    sw('embedded_tracker_port_forwarding', 'Forward the embedded tracker port', on('enable_embedded_tracker', 'Embedded tracker')),
    sw('mark_of_the_web', 'Mark downloaded files as from the internet', { subtitle: 'Mark-of-the-Web, on macOS and Windows' }),
    sw('ignore_ssl_errors', 'Ignore SSL errors'),
    path('python_executable_path', 'Python executable', { files: true, placeholder: 'Detect automatically', restart: true }),
  ]),
  ...group('advanced', 'libtorrent', [
    spin('bdecode_depth_limit', 'Bdecode depth limit', { min: 0 }),
    spin('bdecode_token_limit', 'Bdecode token limit', { min: 0 }),
    spin('async_io_threads', 'Asynchronous I/O threads', { min: 1, max: 1024 }),
    spin('hashing_threads', 'Hashing threads', { min: 1, max: 1024 }),
    spin('file_pool_size', 'File pool size', { min: 1 }),
    spin('checking_memory_use', 'Memory for checking torrents', { unit: 'MiB', min: 1 }),
    spin('disk_cache', 'Disk cache', { unit: 'MiB', min: -1, subtitle: '−1 means automatic' }),
    spin('disk_cache_ttl', 'Disk cache expiry', { unit: 's', min: 1 }),
    spin('disk_queue_size', 'Disk queue size', { unit: 'KiB', scale: 1024, min: 1 }),
    combo('disk_io_type', 'Disk I/O type', [[0, 'Default'], [1, 'Memory-mapped files'], [2, 'POSIX-compliant'], [3, 'Simple pread/pwrite']], { restart: true }),
    combo('disk_io_read_mode', 'Disk I/O read mode', [[0, 'Disable OS cache'], [1, 'Enable OS cache']]),
    combo('disk_io_write_mode', 'Disk I/O write mode', [[0, 'Disable OS cache'], [1, 'Enable OS cache'], [2, 'Write-through']]),
    sw('enable_coalesce_read_write', 'Coalesce reads and writes'),
    sw('enable_piece_extent_affinity', 'Piece extent affinity'),
    sw('enable_upload_suggestions', 'Send upload piece suggestions'),
    spin('send_buffer_watermark', 'Send buffer watermark', { unit: 'KiB', min: 1 }),
    spin('send_buffer_low_watermark', 'Send buffer low watermark', { unit: 'KiB', min: 1 }),
    spin('send_buffer_watermark_factor', 'Send buffer watermark factor', { unit: '%', min: 1 }),
    spin('connection_speed', 'Outgoing connections per second', { min: 0 }),
    spin('socket_send_buffer_size', 'Socket send buffer', { unit: 'KiB', scale: 1024, min: 0, subtitle: '0 uses the system default' }),
    spin('socket_receive_buffer_size', 'Socket receive buffer', { unit: 'KiB', scale: 1024, min: 0, subtitle: '0 uses the system default' }),
    spin('socket_backlog_size', 'Socket backlog', { min: 1 }),
    spin('outgoing_ports_min', 'Lowest outgoing port', { ...PORT, subtitle: '0 disables' }),
    spin('outgoing_ports_max', 'Highest outgoing port', { ...PORT, subtitle: '0 disables' }),
    spin('upnp_lease_duration', 'UPnP lease duration', { unit: 's', min: 0, subtitle: '0 means a permanent lease' }),
    spin('peer_tos', 'DSCP for peer connections', { min: 0, max: 255 }),
    combo('utp_tcp_mixed_mode', 'μTP–TCP mixed mode', [[0, 'Prefer TCP'], [1, 'Peer proportional (throttles TCP)']]),
    spin('hostname_cache_ttl', 'Host name cache expiry', { unit: 's', min: 0 }),
    sw('idn_support_enabled', 'Internationalized domain names (IDN)'),
    sw('enable_multi_connections_from_same_ip', 'Allow several connections from one IP address'),
    sw('validate_https_tracker_certificate', 'Validate HTTPS tracker certificates'),
    sw('ssrf_mitigation', 'Server-side request forgery (SSRF) mitigation'),
    sw('block_peers_on_privileged_ports', 'Refuse peers on privileged ports'),
    combo('upload_slots_behavior', 'Upload slots', [[0, 'Fixed slots'], [1, 'Based on upload rate']]),
    combo('upload_choking_algorithm', 'Upload choking algorithm', [[0, 'Round-robin'], [1, 'Fastest upload'], [2, 'Anti-leech']]),
    sw('announce_to_all_trackers', 'Announce to every tracker in a tier'),
    sw('announce_to_all_tiers', 'Announce to every tier'),
    entry('announce_ip', 'IP address reported to trackers', { restart: true, placeholder: 'Automatic' }),
    spin('announce_port', 'Port reported to trackers', { ...PORT, restart: true, subtitle: '0 uses the listening port' }),
    spin('max_concurrent_http_announces', 'Concurrent HTTP announces', { min: 1 }),
    spin('stop_tracker_timeout', 'Stop tracker timeout', { unit: 's', min: 0, subtitle: '0 disables' }),
    spin('peer_turnover', 'Peer turnover disconnect', { unit: '%', min: 0, max: 100 }),
    spin('peer_turnover_cutoff', 'Peer turnover threshold', { unit: '%', min: 0, max: 100 }),
    spin('peer_turnover_interval', 'Peer turnover interval', { unit: 's', min: 30 }),
    spin('request_queue_size', 'Outstanding requests per peer', { min: 1 }),
    entry('dht_bootstrap_nodes', 'DHT bootstrap nodes', { subtitle: 'host:port, separated by commas' }),
    spin('i2p_inbound_quantity', 'I2P inbound tunnels', { min: 1, max: 16 }),
    spin('i2p_outbound_quantity', 'I2P outbound tunnels', { min: 1, max: 16 }),
    spin('i2p_inbound_length', 'I2P inbound tunnel length', { min: 0, max: 7 }),
    spin('i2p_outbound_length', 'I2P outbound tunnel length', { min: 0, max: 7 }),
  ]),
];

/** Every real preference key the table edits, including paired and widget-owned keys. */
export function coveredKeys(): Set<string> {
  const keys = new Set<string>();
  for (const def of PREFERENCES) {
    if (!def.key.startsWith('@')) keys.add(def.key);
    if (def.kind === 'limit' && def.enabledKey) keys.add(def.enabledKey);
    if (def.kind === 'time') keys.add(def.minuteKey);
    if (def.kind === 'custom') def.keys?.forEach((key) => keys.add(key));
  }
  return keys;
}

/** The rows shown directly on a page (sub-page rows live in their sub-page). */
export const rowsFor = (page: PageId) => PREFERENCES.filter((def) => def.page === page && !def.sub);
export const subpageRows = (subpage: string) => PREFERENCES.filter((def) => def.sub === subpage);
