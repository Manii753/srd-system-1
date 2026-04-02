# Font Size Customization Guide

## Overview
All text sizes across the application have been standardized to use CSS custom properties for easy customization.

## Current Font Sizes
- **Headings** (labels, section titles, table headers): `11px`
- **Normal Text** (body text, descriptions, values): `9px`

## How to Customize

### Option 1: Edit CSS Variables (Recommended)
Open `src/app/globals.css` and modify the values in the `:root` section:

```css
:root {
  /* App-wide font sizes - customize here */
  --font-size-heading: 11px;  /* Change this value */
  --font-size-text: 9px;      /* Change this value */
}
```

### Option 2: Use Tailwind Classes
The following utility classes are available throughout the app:
- `.text-app-heading` - For headings (currently 11px)
- `.text-app-text` - For normal text (currently 9px)

## What Was Changed

### Automated Replacements
All instances of the following Tailwind classes were replaced:

**Headings (bold/semibold text):**
- `text-xs font-bold` → `text-app-heading font-bold`
- `text-xs font-semibold` → `text-app-heading font-semibold`
- `text-sm font-bold` → `text-app-heading font-bold`
- `text-sm font-semibold` → `text-app-heading font-semibold`

**Normal Text:**
- `text-xs` → `text-app-text`
- `text-sm` → `text-app-text`
- `text-base` → `text-app-text`

### Files Updated
Over 60+ component files were updated including:
- All dashboard pages
- All form components
- All table components
- All UI components
- Dispatch and department panels
- SRD components
- Layout components

## Testing
The application has been tested and builds successfully with the new font system.

## Benefits
1. **Centralized Control**: Change font sizes in one place (globals.css)
2. **Consistency**: All text uses the same size system
3. **Easy Maintenance**: No need to search through multiple files
4. **Flexibility**: Can easily adjust for different screen sizes or user preferences

## Example: Increasing Font Sizes
To make text larger for better readability:

```css
:root {
  --font-size-heading: 13px;  /* Increased from 11px */
  --font-size-text: 11px;     /* Increased from 9px */
}
```

Save the file and refresh your browser - all text will update automatically!
