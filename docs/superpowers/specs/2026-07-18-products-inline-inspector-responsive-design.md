# Products Inline Inspector Responsive Design

## Goal

Keep the existing desktop Split Inspector while making product editing contextual on smaller screens. At viewport widths up to 1180px, the inspector appears immediately below the selected product instead of below the complete catalogue.

## Behavior

- Above 1180px, retain the current two-column catalogue and inspector layout.
- At 1180px and below, render the inspector inline after the selected catalogue row.
- Only one inspector is visible at a time.
- Selecting another product moves the inspector beneath that row and preserves the existing unsaved-change confirmation.
- Starting a new product places the inspector before the catalogue list so it remains immediately accessible.
- Save, cancel, delete, filtering, selection, and API behavior remain unchanged.

## Implementation

Extract the existing inspector markup into a reusable render value within `GbProductsTab`. Render it in the desktop inspector column and in a responsive inline container after the selected row. CSS media queries control which instance is visible, avoiding JavaScript viewport subscriptions and duplicate state.

The inline inspector spans the full catalogue width. On smaller screens, the catalogue no longer has a fixed minimum height, and the desktop inspector column is hidden. The inline instance uses the existing form styles and becomes part of the list flow.

## Accessibility

The hidden inspector instance uses CSS `display: none`, so only the visible form participates in focus order. The inspector retains its region label and all existing form labels, validation, and button behavior.

## Verification

- Add a contract test for an inline inspector rendered directly after the selected row.
- Assert desktop and responsive visibility rules for the two inspector placements.
- Run the focused Products tests.
- Confirm Vite transforms the updated module and stylesheet successfully.
