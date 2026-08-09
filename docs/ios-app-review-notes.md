# iOS App Review Notes

These notes are intended for App Store review metadata and internal release preparation for `copit-mobile`.

## User-generated content: Prayer and Community

COP Italy includes a Prayer and Community experience where users can submit prayer requests and public comments.

Current moderation and safety model:

- Public Prayer requests shown in Community are limited to approved, public requests.
- Users can report inappropriate public prayer requests directly in the app.
- Users can report inappropriate public prayer comments directly in the app.
- Reports are sent to COP Italy administrators for review.
- Administrators can review reports in the admin backend and resolve them after action.
- Administrators can reject or resolve prayer requests through the existing moderation flow.
- Administrators can remove public prayer comments through the existing moderation flow.

## Interaction model

- The app does not provide direct user-to-user private messaging.
- The app does not provide follower graphs or open social networking features.
- Prayer content is text-only in the current release path.
- Media uploads are not part of the Prayer/Community flow in this release.

## User support

Users can reach COP Italy through the public Contact Us page and existing support channels.

## Reviewer guidance

If App Review needs to verify reporting:

1. Open Community Prayers.
2. Open a public prayer request.
3. Use the in-app `Report` action on the prayer request or on a public comment.
4. Submit a reason, with optional details.

The app stores the report for administrator review; reporting does not automatically remove content client-side.
