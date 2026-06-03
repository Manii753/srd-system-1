# Excel Styling Debug Guide

## Recent Changes

### 1. Enhanced Logging
Added detailed console logging to track:
- Number of cells with borders, background colors, and fonts
- Actual style objects being extracted
- Which cells are getting the custom renderer
- Computed styles after rendering

### 2. Improved Border Rendering
- Increased border widths: medium (3px), thick (4px)
- Changed table to use `border-collapse: collapse` for better border visibility
- Applied styles with `!important` flag to override Handsontable defaults

### 3. Better Style Application
- Using `td.style.setProperty(property, value, 'important')` instead of direct assignment
- Converting camelCase to kebab-case for CSS properties
- Added computed style logging to verify what actually renders

## How to Debug

### Step 1: Open Browser Console
When you load an Excel file, look for these messages:

```
[ExcelPreview] Custom renderer "excelStyled" registered successfully
[ExcelPreview] Extracted X styled cells from YxZ grid
[ExcelPreview] - Borders: X, BgColors: Y, Fonts: Z
[ExcelPreview] Sample styles: {...}
[ExcelPreview] Found N merged cell ranges
[ExcelPreview] Applying style to cell [0,0]: {...}
[Renderer] Applying styles to td[0,0]: {...}
[Renderer] Computed styles for [0,0]: {...}
```

### Step 2: Analyze the Numbers

**If you see "Extracted 0 styled cells":**
- Excel file has no formatting, OR
- ExcelJS is not reading styles properly
- **Solution**: Check if file is .xlsx (not .xls), open in Excel to verify it has colors/borders

**If you see "Borders: 0" but your Excel has borders:**
- Border styles not being extracted by ExcelJS
- **Solution**: Check console for "Sample styles" - do they include `borderTop`, `borderRight`, etc.?

**If you see styles extracted but "Applying style to cell [0,0]" is missing:**
- Custom renderer not being called
- **Solution**: Check that `cells()` function is returning the renderer

**If you see "Applying styles" but "Computed styles" shows default values:**
- Handsontable CSS is overriding inline styles
- **Solution**: Check browser DevTools > Elements > inspect a cell > check computed styles

### Step 3: Inspect in Browser DevTools

1. **Right-click** on a cell that should have styling
2. **Inspect Element**
3. Check:
   - Does the `<td>` have class `excel-styled-cell`?
   - Does the `<td>` have inline `style` attribute with your Excel properties?
   - In "Computed" tab, what are the actual values?
   - Are any styles crossed out (overridden)?

### Step 4: Compare with Expected

Looking at your Excel file, you should see:

| Feature | Excel | What to Check in Console |
|---------|-------|-------------------------|
| Thick borders around sections | Medium/Thick borders | `borderTop: '3px solid #000000'` |
| Gray headers | Light background | `backgroundColor: '#D3D3D3'` or similar |
| Bold text in headers | Bold font | `fontWeight: 'bold'` |
| Centered text | Center alignment | `textAlign: 'center'` |
| Green lines | Green borders | `borderRight: '2px solid #00FF00'` |

## Common Issues & Solutions

### Issue: Borders Not Showing

**Symptom**: Console shows borders extracted but not visible

**Check**:
```javascript
// In console, check computed style:
document.querySelector('.excel-preview-container td').style.borderTop
```

**Solutions**:
1. Change CSS `border-collapse` to `collapse` (already done)
2. Increase border width in `BORDER_WIDTH` map (already done)
3. Add `!important` to border styles (already done)

### Issue: Background Colors Not Showing

**Symptom**: Console shows `backgroundColor` but cells are white

**Check**:
```javascript
// In console:
document.querySelector('.excel-preview-container td[style*="background"]')
```

**Solutions**:
1. Verify ARGB to CSS conversion is working
2. Check if Handsontable theme is overriding with `!important`
3. Look for theme colors that need tint adjustment

### Issue: Fonts/Bold Not Applied

**Symptom**: Console shows `fontWeight: 'bold'` but text is normal

**Solutions**:
1. Check if font-family is available on system
2. Verify `!important` flag is being used
3. Check for CSS specificity issues

### Issue: Styles Extracted But Not Rendered

**Symptom**: Console shows extracted styles but cells look plain

**Possible Causes**:
1. Custom renderer not registered properly
2. `cells()` function not returning renderer
3. Handsontable destroyed before rendering
4. CSS specificity overriding inline styles

**Solutions**:
1. Check for "[ExcelPreview] Custom renderer registered successfully"
2. Verify "[Renderer] Applying styles" messages appear
3. Check "[Renderer] Computed styles" to see if styles stuck
4. Add more `!important` flags if needed

## Manual Testing Steps

1. **Upload Excel file** with obvious formatting:
   - Header row with gray background
   - Bold text
   - Thick borders
   - Colored cells

2. **Open Console** immediately after load

3. **Copy/paste ALL console messages** starting with `[ExcelPreview]`

4. **Inspect first header cell**:
   - Right-click → Inspect
   - Check `<td>` inline styles
   - Check Computed tab
   - Screenshot if needed

5. **Report findings**:
   - How many styled cells extracted?
   - What do sample styles show?
   - What do computed styles show?
   - Are borders/colors showing at all?

## Console Commands for Testing

```javascript
// Get first styled cell
document.querySelector('.excel-styled-cell')

// Check if any cells have borders
document.querySelectorAll('td[style*="border"]').length

// Check if any cells have background colors
document.querySelectorAll('td[style*="background"]').length

// Get computed style of first cell
window.getComputedStyle(document.querySelector('.handsontable td'))

// Check styleMap contents
// (Only works if you expose it via window in code)
```

## Next Steps Based on Console Output

### Scenario A: "Extracted 0 styled cells"
→ **Problem**: ExcelJS not reading styles
→ **Solution**: Check file format, try re-saving as .xlsx

### Scenario B: "Extracted 50 styled cells, Borders: 50"
→ **Good**: Styles are being read
→ **Next**: Check if renderer is being applied

### Scenario C: "Applying styles" messages appear
→ **Good**: Renderer is working
→ **Next**: Check computed styles to see if they stuck

### Scenario D: Computed styles show correct values
→ **Great**: Everything working!
→ **Issue**: Might be visual - try zooming in to see thin borders

### Scenario E: Computed styles show defaults
→ **Problem**: Styles being overridden
→ **Solution**: Need more aggressive CSS or !important flags

## Contact Points

If styles still don't work after debugging:

1. Share console output (all [ExcelPreview] messages)
2. Share computed styles screenshot from DevTools
3. Share inline styles screenshot from DevTools
4. Upload a sample Excel file to test with
5. Describe what's missing (borders, colors, fonts, etc.)
