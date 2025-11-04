# Food Scanner - Test Plan Documentation

## Manual Test Cases

This document describes the manual testing performed on the Food Scanner feature to ensure proper functionality.

### Test Environment
- **Browser**: Chrome/Firefox/Safari
- **Backend Server**: http://localhost:3000
- **Frontend Server**: http://localhost:3001

---

## Test Cases

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| TC-01 | Valid Image Upload | 1. Navigate to /home/scanner<br>2. Click "Choose Image"<br>3. Select a valid JPG/PNG file<br>4. Click "Scan Food" | - Image preview displays<br>- Loading spinner shows<br>- Mock JSON response returns with protein, carbs, fat, calories<br>- Results table displays correctly | ✅ Pass |
| TC-02 | Invalid File Type | 1. Navigate to /home/scanner<br>2. Try to upload a non-image file (e.g., .txt, .pdf) | - Browser file picker filters out non-image files<br>- If manually bypassed, error message shows | ✅ Pass |
| TC-03 | No File Upload | 1. Navigate to /home/scanner<br>2. Click "Scan Food" without selecting an image | - Button remains disabled<br>- Scan action does not trigger | ✅ Pass |
| TC-04 | API Delay Handling | 1. Upload a valid image<br>2. Click "Scan Food"<br>3. Observe UI during 1.5s processing delay | - "Analyzing..." text displays<br>- Loading spinner remains visible<br>- Scan button is disabled during processing<br>- Results appear after delay completes | ✅ Pass |
| TC-05 | Results Display | 1. Complete a successful scan<br>2. Review the nutritional breakdown | - Protein value displayed in grams<br>- Carbs value displayed in grams<br>- Fat value displayed in grams<br>- Calories calculated using 4-4-9 rule<br>- Timestamp shows current date/time | ✅ Pass |
| TC-06 | Multiple Scans | 1. Complete a scan<br>2. Click "New Scan"<br>3. Upload a different image<br>4. Scan again | - Previous results clear<br>- New results display correctly<br>- No data from previous scan persists | ✅ Pass |
| TC-07 | Error Handling | 1. Stop backend server<br>2. Try to scan an image | - Error message displays: "An error occurred while processing the image"<br>- No crash or undefined behavior | ✅ Pass |
| TC-08 | Responsive Design - Desktop | 1. View scanner page on desktop (>768px width) | - Layout is centered<br>- Cards have proper spacing<br>- All elements are clearly visible | ✅ Pass |
| TC-09 | Responsive Design - Mobile | 1. View scanner page on mobile (<768px width) | - Layout adapts to screen size<br>- Text remains readable<br>- Buttons are easily tappable | ✅ Pass |
| TC-10 | Dark Mode Support | 1. Toggle browser/system dark mode<br>2. View scanner page | - Colors adjust appropriately<br>- Text remains readable<br>- Contrast is maintained | ✅ Pass |

---

## Backend API Validation

### Endpoint: `POST /api/scan`

**Valid Request:**
```bash
curl -X POST http://localhost:3000/api/scan \
  -F "image=@test-food.jpg"
```

**Expected Response:**
```json
{
  "protein": 32.4,
  "carbs": 45.7,
  "fat": 14.2,
  "calories": 520,
  "timestamp": "2025-11-03T20:00:00Z"
}
```

**Invalid Request (No File):**
```bash
curl -X POST http://localhost:3000/api/scan
```

**Expected Response:**
```json
{
  "error": {
    "code": "NO_FILE",
    "message": "No image file uploaded. Please upload a JPG or PNG image."
  }
}
```

---

## UI/UX Verification

### Visual Design Checklist
- ✅ Rounded corners (rounded-2xl) on cards
- ✅ Subtle shadows (shadow-md) for depth
- ✅ Proper spacing between elements (space-y-4)
- ✅ Consistent color scheme (blue primary, gray neutrals)
- ✅ Loading animations smooth (animate-spin)
- ✅ Hover states on buttons
- ✅ Clear error messages in red
- ✅ Success states in green

### Accessibility Checklist
- ✅ Buttons have clear labels
- ✅ Color contrast meets WCAG standards
- ✅ Form inputs are properly labeled
- ✅ Loading states are clearly indicated
- ✅ Error messages are descriptive

---

## Known Limitations

1. **Mock Data**: The scanner returns randomly generated nutritional data, not actual AI analysis
2. **File Size**: Maximum upload size is 5MB
3. **Image Types**: Only JPG and PNG formats are supported
4. **Processing Time**: Fixed 1.5-second delay to simulate AI processing

---

## Future Enhancements

1. Integration with real AI/ML model for actual food recognition
2. Save scan results to user's meal log
3. History of scanned foods
4. Batch scanning for multiple foods
5. Barcode scanning support

---

**Test Date**: November 3, 2025  
**Tested By**: Waseem Ahmad  
**Feature**: HW8 NUTRI-70 - Food Scanner  
**Related Tickets**: NUTRI-71, NUTRI-72, NUTRI-75
