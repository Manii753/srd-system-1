# Excel Formula Bar - User Guide

## ✅ What's New

Your Excel preview now includes a **Formula Bar** just like Microsoft Excel, allowing you to:
- ✅ See the selected cell reference (A1, B2, etc.)
- ✅ View and edit cell contents
- ✅ Write and use Excel formulas
- ✅ Support for 300+ Excel functions

## 📊 Formula Bar Location

```
┌─────────────────────────────────────────────────────────┐
│  [Save] [Download] [Fullscreen]                    [X]  │  ← Action Bar
├─────────────────────────────────────────────────────────┤
│  A1  ▸  [Enter value or formula (=SUM(A1:A10))]        │  ← FORMULA BAR
├─────────────────────────────────────────────────────────┤
│     A    │    B    │    C    │    D    │               │
│  1  Data │  Data   │  Data   │  Data   │               │
│  2  100  │  200    │  300    │  =A2+B2 │               │
└─────────────────────────────────────────────────────────┘
```

The formula bar appears right below the action bar, showing:
- **Left side**: Cell reference (e.g., "A1", "B2")
- **Middle**: Input field for cell content/formula
- **Right side**: Help text "Press Enter to apply"

## 🎯 How to Use

### 1. **View Cell Content**
- Click any cell in the spreadsheet
- Formula bar shows the cell reference and content
- For formulas, you'll see the formula (not the result)

### 2. **Edit Cell Content**
- Click in the formula bar input field
- Type new value or formula
- Press **Enter** to apply changes
- Press **Escape** to cancel

### 3. **Write Formulas**
- Click a cell
- In the formula bar, type **=** to start a formula
- Type your formula (e.g., `=SUM(A1:A10)`)
- Press **Enter**
- The cell shows the result, formula bar shows the formula

## 📝 Supported Formula Examples

### Basic Arithmetic
```excel
=A1+B1          Add two cells
=A1-B1          Subtract
=A1*B1          Multiply
=A1/B1          Divide
=(A1+B1)*C1     Complex expressions
```

### SUM Functions
```excel
=SUM(A1:A10)              Sum a range
=SUM(A1,B1,C1)            Sum specific cells
=SUM(A1:A10,C1:C10)       Sum multiple ranges
```

### AVERAGE
```excel
=AVERAGE(A1:A10)          Average of range
=AVERAGE(A1,B1,C1)        Average of cells
```

### COUNT
```excel
=COUNT(A1:A10)            Count numbers
=COUNTA(A1:A10)           Count non-empty
=COUNTBLANK(A1:A10)       Count empty
```

### MIN / MAX
```excel
=MIN(A1:A10)              Minimum value
=MAX(A1:A10)              Maximum value
```

### IF Statements
```excel
=IF(A1>100,"High","Low")          Simple IF
=IF(A1>100,"High",IF(A1>50,"Med","Low"))  Nested IF
```

### TEXT Functions
```excel
=CONCATENATE(A1," ",B1)   Join text
=UPPER(A1)                To uppercase
=LOWER(A1)                To lowercase
=LEN(A1)                  Text length
```

### LOOKUP Functions
```excel
=VLOOKUP(A1,B1:C10,2,FALSE)    Vertical lookup
=HLOOKUP(A1,B1:F2,2,FALSE)     Horizontal lookup
```

### DATE Functions
```excel
=TODAY()                  Current date
=NOW()                    Current date & time
=YEAR(A1)                 Extract year
=MONTH(A1)                Extract month
=DAY(A1)                  Extract day
```

### ROUND Functions
```excel
=ROUND(A1,2)              Round to 2 decimals
=ROUNDUP(A1,0)            Round up
=ROUNDDOWN(A1,0)          Round down
```

## 🎨 Formula Bar Features

### Cell Reference Display
```
┌────────┐
│   B5   │  ← Shows current cell
└────────┘
```
- Updates automatically when you select different cells
- Shows merged cell ranges (e.g., "A1:C1")
- Clear visual indicator of selection

### Formula Input Field
```
┌──────────────────────────────────────────┐
│  =SUM(A1:A10)                            │  ← Type here
└──────────────────────────────────────────┘
```
- Mono-spaced font for better readability
- Auto-expands for long formulas
- Shows actual formula, not calculated result

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| **Enter** | Apply formula and move down |
| **Tab** | Apply and move right |
| **Escape** | Cancel editing |
| **F2** | Edit selected cell (in cell) |

## 💡 Pro Tips

### Tip 1: Formula vs Value
- **Value in cell**: See `150`
- **Formula in formula bar**: See `=A1+B1`
- Click cell to see formula, result shown in spreadsheet

### Tip 2: Cell References
- Use **relative references**: `A1` (changes when copied)
- Use **absolute references**: `$A$1` (stays fixed when copied)
- Mix: `$A1` or `A$1`

### Tip 3: Range Selection
- Type formula in formula bar
- Click and drag cells in spreadsheet to add range
- Range automatically inserted (e.g., `A1:A10`)

### Tip 4: Quick Navigation
- Press Enter: Move down and apply
- Press Tab: Move right and apply
- Press Escape: Cancel without changes

### Tip 5: Formula Errors
Common errors you might see:
- `#DIV/0!` - Division by zero
- `#VALUE!` - Wrong data type
- `#REF!` - Invalid cell reference
- `#NAME?` - Unrecognized function name
- `#N/A` - Value not available

## 🔄 Workflow Examples

### Example 1: Calculate Total
```
Step 1: Click cell B10
Step 2: Formula bar shows "B10"
Step 3: Type in formula bar: =SUM(B1:B9)
Step 4: Press Enter
Step 5: Cell B10 now shows total
```

### Example 2: Calculate Percentage
```
Step 1: Click cell C2
Step 2: Type: =(B2/B10)*100
Step 3: Press Enter
Step 4: Cell shows percentage value
```

### Example 3: Conditional Formatting
```
Step 1: Click cell D2
Step 2: Type: =IF(C2>50,"Pass","Fail")
Step 3: Press Enter
Step 4: Copy formula down to other rows
```

## 📱 Read-Only Mode

When in **read-only mode**:
- Formula bar is **disabled** (grayed out)
- You can still **view** cell references and content
- Cannot edit or enter formulas
- Shows "Select a cell to view content" placeholder

## 🎓 Supported Functions (300+)

HyperFormula engine supports these categories:

### Math & Trigonometry
- SUM, SUMIF, SUMIFS, PRODUCT, ABS, SQRT, POWER
- SIN, COS, TAN, ASIN, ACOS, ATAN
- EXP, LN, LOG, LOG10
- PI, RAND, RANDBETWEEN

### Statistical
- AVERAGE, AVERAGEIF, AVERAGEIFS
- COUNT, COUNTA, COUNTBLANK, COUNTIF, COUNTIFS
- MIN, MAX, MEDIAN, MODE
- STDEV, VAR

### Text
- CONCATENATE, CONCAT, TEXTJOIN
- LEFT, RIGHT, MID, LEN
- UPPER, LOWER, PROPER
- TRIM, SUBSTITUTE, REPLACE
- FIND, SEARCH, TEXT

### Logical
- IF, IFS, AND, OR, NOT
- TRUE, FALSE, IFERROR, IFNA

### Lookup & Reference
- VLOOKUP, HLOOKUP, LOOKUP
- INDEX, MATCH, OFFSET
- CHOOSE, INDIRECT

### Date & Time
- TODAY, NOW, DATE, TIME
- YEAR, MONTH, DAY, HOUR, MINUTE, SECOND
- DATEDIF, NETWORKDAYS, WORKDAY
- EDATE, EOMONTH

### Financial
- PMT, FV, PV, RATE, NPER
- NPV, IRR, XNPV, XIRR
- EFFECT, NOMINAL

### Information
- ISBLANK, ISERROR, ISNA, ISNUMBER, ISTEXT
- TYPE, N, NA

## 🔍 Debugging Formulas

### Check Formula Syntax
1. Click cell with formula
2. Look at formula bar
3. Check for:
   - Missing parentheses: `=SUM(A1:A10`  ❌
   - Wrong cell references: `=A1+Z99`  ❌
   - Typos in function names: `=SUMM()`  ❌

### Test Step by Step
1. Break complex formulas into parts
2. Test each part in separate cells
3. Combine when each part works

## ⚠️ Limitations

### Current Limitations
- Formula autocomplete not yet implemented
- No formula suggestions while typing
- No syntax highlighting in formula bar
- Cannot edit array formulas

### Coming Soon
- Formula autocomplete
- Function tooltips
- Syntax highlighting
- Formula auditing tools

## ✅ Best Practices

1. **Start with =**
   - All formulas must begin with equals sign

2. **Use cell references**
   - Better: `=A1+B1`
   - Avoid: `=100+200` (hard-coded values)

3. **Name your ranges**
   - Makes formulas more readable
   - Easier to maintain

4. **Test formulas**
   - Verify with simple examples first
   - Check edge cases (empty cells, zeros)

5. **Document complex formulas**
   - Add comments in adjacent cells
   - Explain formula purpose

## 📞 Troubleshooting

### "Formula not working"
✅ Check:
- Starts with `=`
- Cell references are valid
- Function name spelled correctly
- Parentheses are balanced

### "Cell shows #NAME?"
✅ Solution:
- Function name has a typo
- Check supported functions list
- Use correct spelling (case-insensitive)

### "Can't see formula bar"
✅ Solution:
- Scroll to top of Excel viewer
- Check if you're in fullscreen mode
- Refresh the page if needed

### "Formula bar is grayed out"
✅ Solution:
- You're in read-only mode
- Check permissions
- Contact admin for edit access

---

**Last Updated**: June 2, 2026  
**Version**: 4.0 - Formula Bar Support  
**Powered by**: HyperFormula Engine
