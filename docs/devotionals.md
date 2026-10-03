# Mobile Devotionals

The mobile app treats `GET /api/public/devotionals/today/` as authoritative for the current devotional. A `404` means there is no current devotional; network and service failures remain retryable errors.

Public devotional records may include `frequency`, `publication_date`, and `available_until`. Daily records are available on one date. Weekly records are available for seven inclusive calendar days. The calendar is interpreted in `Europe/Rome`, including daylight-saving transitions.

Legacy responses or cached-shaped data with a missing or unrecognised frequency are treated as Daily. A legacy Daily record without `available_until` uses `publication_date` as its effective end date. The current mobile implementation has no devotional persistence cache, so it does not show stale content when offline.
