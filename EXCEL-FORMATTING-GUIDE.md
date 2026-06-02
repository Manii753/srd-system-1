# Excel Formatting & Formula Guide

## Overview
The Excel Preview component now includes full formatting capabilities and formula autocomplete, making it work just like Microsoft Excel.

## 🎨 Formatting Features

### How to Format Cells
1. **Select cells** - Click a cell or drag to select multiple cells
2. **Use the formatting toolbar** - Appears automatically when cells are selected
3. **Apply formatting** - Click any formatting button to apply instantly

### Available Formatting Options

#### 1. Font Size
- **Location**: Dropdown on the left of the toolbar
- **Options**: 8pt, 9pt, 10pt, 11pt (default), 12pt, 14pt, 16pt, 18pt, 20pt, 24pt
- **Usage**: Select cells → Choose size from dropdown

#### 2. Bold
- **Button**: **B** icon
- **Shortcut**: Ctrl+B (when toolbar is visible)
- **Usage**: Select cells → Click Bold button
- **Effect**: Makes text bold

#### 3. Italic
- **Button**: *I* icon  
- **Shortcut**: Ctrl+I (when toolbar is visible)
- **Usage**: Select cells → Click Italic button
- **Effect**: Makes text italic

#### 4. Underline
- **Button**: U̲ icon
- **Shortcut**: Ctrl+U (when toolbar is visible)
- **Usage**: Select cells → Click Underline button
- **Effect**: Underlines text

#### 5. Text Color
- **Button**: A with colored line
- **Usage**: 
  1. Select cells
  2. Click text color button
  3. Choose from 16 preset colors
  4. Color applies instantly
- **Colors**: Black, Red, Green, Blue, Yellow, Magenta, Cyan, White, and 8 more

#### 6. Background Color
- **Button**: Paint palette icon
- **Usage**:
  1. Select cells
  2. Click background color button
  3. Choose from 16 preset colors
  4. Color applies instantly
- **Colors**: White, Light Red, Light Green, Light Blue, Yellow, Pink, Cyan, Purple, and 8 more

#### 7. Borders
- **Button**: Square outline icon
- **Usage**: Select cells → Click border button
- **Effect**: Adds 1px solid black borders to all sides of selected cells
- **Multi-cell**: Works on cell ranges to create table-like borders

### Multi-Cell Selection
- **Single cell**: Click once
- **Cell range**: Click and drag
- **Apply to range**: Any formatting applies to all selected cells
- **Status display**: Toolbar shows "X × Y cells selected"

## 📐 Formula Autocomplete

### How to Use Formula Autocomplete

1. **Start typing a formula** - Type `=` in any cell or the formula bar
2. **See suggestions** - A dropdown appears with matching formulas
3. **Navigate** - Use ↑/↓ arrow keys to browse suggestions
4. **Insert** - Press Tab or Enter to insert the selected formula
5. **Edit** - Modify the formula as needed
6. **Apply** - Press Enter to apply the formula to the cell

### Navigation Controls
- **Arrow Down** (↓): Move to next suggestion
- **Arrow Up** (↑): Move to previous suggestion
- **Tab or Enter**: Insert selected formula
- **Escape**: Close suggestions without inserting

### Available Formulas

#### 1. SUM
- **Description**: Adds all numbers in a range
- **Example**: `=SUM(A1:A10)`
- **Use case**: Total sales, sum of values

#### 2. AVERAGE
- **Description**: Returns the average of numbers
- **Example**: `=AVERAGE(A1:A10)`
- **Use case**: Average score, mean value

#### 3. COUNT
- **Description**: Counts numbers in a range
- **Example**: `=COUNT(A1:A10)`
- **Use case**: Count of numeric entries

#### 4. MAX
- **Description**: Returns the maximum value
- **Example**: `=MAX(A1:A10)`
- **Use case**: Highest score, peak value

#### 5. MIN
- **Description**: Returns the minimum value
- **Example**: `=MIN(A1:A10)`
- **Use case**: Lowest price, minimum value

#### 6. IF
- **Description**: Returns one value if true, another if false
- **Example**: `=IF(A1>10, "Yes", "No")`
- **Use case**: Conditional logic, pass/fail

#### 7. VLOOKUP
- **Description**: Looks up a value in a table
- **Example**: `=VLOOKUP(A1, B1:C10, 2, FALSE)`
- **Use case**: Price lookup, data matching

#### 8. CONCATENATE
- **Description**: Joins text strings
- **Example**: `=CONCATENATE(A1, " ", B1)`
- **Use case**: Combine first and last name

#### 9. LEN
- **Description**: Returns the length of text
- **Example**: `=LEN(A1)`
- **Use case**: Character count validation

#### 10. TRIM
- **Description**: Removes extra spaces from text
- **Example**: `=TRIM(A1)`
- **Use case**: Clean up imported data

#### 11. ROUND
- **Description**: Rounds a number to specified digits
- **Example**: `=ROUND(A1, 2)`
- **Use case**: Price rounding, decimal places

#### 12. TODAY
- **Description**: Returns today's date
- **Example**: `=TODAY()`
- **Use case**: Current date, age calculation

#### 13. NOW
- **Description**: Returns current date and time
- **Example**: `=NOW()`
- **Use case**: Timestamp, time calculations

## 💡 Tips & Best Practices

### Formatting Tips
1. **Select before formatting** - Always select cells first, then apply formatting
2. **Format multiple cells** - Select a range to format many cells at once
3. **Visual hierarchy** - Use bold for headers, colors for categories
4. **Consistent colors** - Use the same color scheme throughout your document
5. **Borders for tables** - Apply borders to create clear table structures

### Formula Tips
1. **Type = first** - Formula bar must start with `=` to trigger autocomplete
2. **Use autocomplete** - Faster and prevents typos in formula names
3. **Check examples** - Each suggestion shows an example usage
4. **Edit after inserting** - Modify cell references after inserting formula
5. **Press Enter** - Always press Enter to apply the formula

### Performance Tips
1. **Save regularly** - Click Save button after making significant changes
2. **Format in batches** - Select multiple cells and format once
3. **Use keyboard shortcuts** - Ctrl+B, Ctrl+I, Ctrl+U for quick formatting
4. **Fullscreen mode** - Use fullscreen for better workspace when formatting large sheets

## 🔄 Workflow Examples

### Example 1: Create a Formatted Table
1. Select the header row
2. Apply bold formatting
3. Add a background color (e.g., light blue)
4. Select the entire table range
5. Click borders button to add borders
6. Adjust font size if needed

### Example 2: Add a Total Row with Formula
1. Click the cell where you want the total
2. Type `=` in the formula bar
3. Type `SUM` - suggestions appear
4. Press Tab to insert `=SUM(A1:A10)`
5. Edit the cell range to match your data
6. Press Enter to apply
7. Format the total cell (bold, different background)

### Example 3: Conditional Formatting with IF
1. Select the cell for conditional logic
2. Type `=IF` - autocomplete shows IF function
3. Press Tab to insert example
4. Modify: `=IF(A1>100, "High", "Low")`
5. Press Enter
6. Add color formatting based on the result

## 🎯 Common Scenarios

### Scenario: Highlight Important Cells
**Goal**: Make certain cells stand out
1. Select cells to highlight
2. Click background color button
3. Choose yellow or light red
4. Optional: Add bold formatting
5. Click Save

### Scenario: Create a Professional Header
**Goal**: Format the top row of a table
1. Select entire first row
2. Set font size to 14pt
3. Click Bold button
4. Apply dark background (e.g., dark blue)
5. Apply white text color
6. Add borders

### Scenario: Calculate Totals
**Goal**: Sum a column of numbers
1. Click cell below the numbers
2. Type `=SUM`
3. Autocomplete appears - press Tab
4. Edit range to match your column (e.g., `=SUM(B2:B50)`)
5. Press Enter
6. Format total cell with bold and border

## 📋 Keyboard Reference

| Action | Shortcut |
|--------|----------|
| Apply Bold | Ctrl+B |
| Apply Italic | Ctrl+I |
| Apply Underline | Ctrl+U |
| Formula suggestions (↓) | Arrow Down |
| Formula suggestions (↑) | Arrow Up |
| Insert formula | Tab or Enter |
| Cancel edit | Escape |
| Apply cell edit | Enter |
| Next cell | Tab |
| Save changes | Click Save button |

## 🚀 Advanced Usage

### Combining Formatting
You can apply multiple formats to the same cells:
1. Select cells
2. Apply bold
3. Change text color (without deselecting)
4. Add background color
5. Add borders
6. All formats apply together

### Working with Large Selections
1. Click first cell
2. Scroll to last cell
3. Shift+Click to select range
4. Apply any formatting
5. All cells in range receive formatting

### Copying Formatted Cells
Currently, formatting is applied per workbook:
1. Format cells as desired
2. Click Save to preserve formatting
3. Downloaded files retain formatting
4. Uploaded files preserve their original formatting

## 🔧 Troubleshooting

### Formatting Not Applying
- **Solution**: Ensure cells are selected before clicking format buttons
- **Check**: Look for "X cells selected" text in toolbar

### Formula Suggestions Not Showing
- **Solution**: Make sure to type `=` at the start
- **Check**: Cursor must be in formula bar or cell
- **Try**: Click formula bar, type `=SUM` and suggestions should appear

### Changes Not Saving
- **Solution**: Click the Save button after making changes
- **Check**: Orange "● Unsaved changes" indicator appears when changes exist
- **Note**: Auto-save is not enabled - manual save required

### Colors Look Different
- **Solution**: Different Excel versions may render colors slightly differently
- **Note**: Colors are preserved in .xlsx format
- **Tip**: Use standard colors for best compatibility

## 📱 Responsive Design

The formatting toolbar adapts to screen size:
- **Desktop**: Full toolbar with all options visible
- **Tablet**: May wrap to multiple rows
- **Mobile**: Scrollable toolbar with all features accessible

## 🎓 Training Resources

### For New Users
1. Start with simple formatting (bold, colors)
2. Practice with formula autocomplete
3. Try borders and backgrounds
4. Experiment with multi-cell selection

### For Power Users
1. Use keyboard shortcuts for speed
2. Format large ranges efficiently
3. Combine formulas with formatting
4. Create templates with pre-formatted cells

---

**Last Updated**: June 2, 2026  
**Component Version**: 3.0  
**Supported Formats**: .xlsx, .xls (with formatting preserved)
