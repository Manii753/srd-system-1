# How to Resize Columns and Rows in Excel Preview

## ✅ Features Already Enabled

Your Excel preview now supports **full drag-to-resize** functionality, exactly like Microsoft Excel!

## 📏 Resizing Columns (Width)

### Method: Drag on Column Header Borders

1. **Locate the column letters** (A, B, C, D, etc.) at the top of the spreadsheet
2. **Move your mouse between two column letters** (e.g., between A and B)
3. **Look for the cursor to change** to a resize cursor: ↔ (double-headed arrow)
4. **Click and drag** left or right to adjust the column width
5. **Release** to set the new width

```
   A    |    B    |    C
   ▲    ▲    ▲    ▲
   │    │    │    │
   Hover here to resize
   (between letters)
```

### Visual Feedback
- **Blue line** appears when you start dragging
- **Green guide line** shows where the column will resize to
- Cursor changes to **↔** (horizontal resize)

## 📏 Resizing Rows (Height)

### Method: Drag on Row Header Borders

1. **Locate the row numbers** (1, 2, 3, 4, etc.) on the left side
2. **Move your mouse between two row numbers** (e.g., between 1 and 2)
3. **Look for the cursor to change** to a resize cursor: ↕ (double-headed arrow)
4. **Click and drag** up or down to adjust the row height
5. **Release** to set the new height

```
1  ←
   ─────  Hover here to resize
2  ←      (between numbers)
   ─────
3  ←
```

### Visual Feedback
- **Blue line** appears when you start dragging
- **Green guide line** shows where the row will resize to
- Cursor changes to **↕** (vertical resize)

## 🎯 Pro Tips

### 1. **Precise Resizing**
- Drag slowly for fine control
- The guide line shows exactly where the border will be

### 2. **Quick Auto-Fit** (Coming Soon)
- Double-click on column border to auto-fit width to content
- Double-click on row border to auto-fit height to content

### 3. **Multiple Columns/Rows**
- Resize one column/row at a time
- Changes are tracked as "unsaved changes"
- Click **Save** to persist your changes

### 4. **Visibility**
- Headers turn **light gray** on hover
- **Blue resize handle** (5px wide) appears between headers
- **Green guide line** shows during drag

## 🔧 Technical Details

### What's Enabled
```javascript
manualColumnResize: true  // ✅ Drag column borders
manualRowResize: true     // ✅ Drag row borders
manualColumnMove: true    // ✅ Drag column headers to reorder
manualRowMove: true       // ✅ Drag row headers to reorder
```

### Resize Handle Specs
- **Column resize handle**: 5px wide, blue (#3b82f6)
- **Row resize handle**: 5px tall, blue (#3b82f6)
- **Guide during drag**: 2px, green (#10b981)
- **Cursor indicators**: ↔ for columns, ↕ for rows

## 📱 Browser Support

✅ **Chrome/Edge**: Full support  
✅ **Firefox**: Full support  
✅ **Safari**: Full support  
⚠️ **Mobile**: Limited (better on desktop)

## 🐛 Troubleshooting

### "I can't see the resize cursor"
**Solution**: 
- Make sure you're hovering exactly on the border between headers
- Look for the area where two column letters or row numbers meet
- Try moving your mouse slowly along the header borders

### "Nothing happens when I drag"
**Solution**:
- Check if the file is in **read-only mode** (look for indicator at top)
- Ensure you have edit permissions
- Try clicking and holding for a moment before dragging

### "Changes aren't saving"
**Solution**:
- Look for "● Unsaved changes" indicator
- Click the green **Save** button
- Wait for "Saved successfully" confirmation

### "Resize handle is hard to find"
**Solution**:
- The handle is **5 pixels wide** between headers
- Move your mouse slowly along header borders
- Watch for cursor change to ↔ or ↕
- Headers turn light gray on hover

## 📊 Example Workflow

### Scenario: Adjust Column Widths for Better Visibility

1. **Open Excel file** - Click eye icon on file attachment
2. **Locate narrow column** - Say column B is too narrow
3. **Hover between B and C** - Move mouse to border
4. **See cursor change** - ↔ appears
5. **Drag right** - Widen column B
6. **Release mouse** - Column resized!
7. **Click Save** - Changes persisted
8. **See confirmation** - "Saved successfully" toast

### Scenario: Make Row Taller for Multi-line Content

1. **Find row with wrapped text** - Say row 5
2. **Hover between row 5 and 6** - On the left number border
3. **See cursor change** - ↕ appears
4. **Drag down** - Make row taller
5. **Release mouse** - Row resized!
6. **Click Save** - Changes persisted

## ⚡ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save | Click "Save" button or Ctrl+S (if implemented) |
| Download | Click "Download" button |
| Fullscreen | Click ⛶ button |
| Undo | Right-click → Undo (in context menu) |

## 🎨 Visual Guide

```
Column Resize:
┌────────┬────────┬────────┐
│   A    │   B    │   C    │  ← Column headers
├────────┼────────┼────────┤
│        │        │        │
│  Data  │  Data  │  Data  │
└────────┴────────┴────────┘
         ▲
         │
    Drag here (between A and B)
    Cursor: ↔


Row Resize:
┌───┬────────────────────┐
│ 1 │                    │  ← Row 1
├───┼────────────────────┤  ← Drag this border
│ 2 │                    │  ← Row 2
├───┼────────────────────┤
│ 3 │                    │
└───┴────────────────────┘
  ▲
  │
Drag here (between 1 and 2)
Cursor: ↕
```

## ✅ Confirmation

After implementing the enhanced CSS, your Excel preview now has:

- ✅ **Visible resize handles** (5px wide/tall, blue)
- ✅ **Cursor changes** (↔ for columns, ↕ for rows)
- ✅ **Visual feedback** (green guide during drag)
- ✅ **Hover effects** (headers highlight)
- ✅ **Persistent resizing** (saved to server)

**Just hover between the headers and drag!** 🎉

---

**Last Updated**: June 2, 2026  
**Version**: 3.0 - Full Resize Support
