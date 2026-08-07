## 2024-08-07 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Found an accessibility issue pattern specific to this app's custom components: icon-only buttons (like in Sidebar and PanelHeader) consistently lack `aria-label` attributes and screen reader support for their visual states.
**Action:** When adding new icon buttons or interactive toggles, always include `aria-label` and `aria-expanded` (where applicable) alongside visual titles, even on desktop-focused UI.
