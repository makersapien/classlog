# 🔧 Double-Click Delete Debug Guide

## 🚨 Error: "Failed to delete slot: {}"

This error indicates the DELETE API call is failing. Here's how to debug and fix it:

## 🔍 Step-by-Step Debugging

### 1. **Check Browser Console**
Open browser DevTools (F12) and look for:
```
🗑️ Deleting available slot: [slot-id]
❌ Failed to delete slot: [error details]
```

### 2. **Check Network Tab**
1. Open DevTools → Network tab
2. Double-click an available slot
3. Look for the DELETE request to `/api/schedule-slots/[id]`
4. Check the response status and body

### 3. **Common Issues & Solutions**

#### **Authentication Issues (401)**
- **Problem**: User not logged in or session expired
- **Solution**: Refresh page and log in again
- **Check**: Look for "Unauthorized" in network response

#### **Slot Not Found (404)**
- **Problem**: Slot ID is invalid or slot doesn't exist
- **Solution**: Refresh calendar data
- **Check**: Verify slot ID is a valid UUID

#### **Permission Issues (403)**
- **Problem**: Trying to delete someone else's slot
- **Solution**: Only delete your own slots
- **Check**: Look for "Forbidden" in network response

#### **Slot Status Issues (400)**
- **Problem**: Trying to delete a booked/assigned slot
- **Solution**: Only delete available slots (green ones)
- **Check**: Look for "Cannot delete booked slots" message

#### **Database Issues (500)**
- **Problem**: Database connection or query error
- **Solution**: Check server logs, verify database is running
- **Check**: Look for "Internal server error" message

## 🛠️ Enhanced Error Handling

The component now includes improved error handling:

```typescript
// Better error parsing
try {
  errorData = await response.json()
} catch (parseError) {
  console.error('❌ Failed to parse DELETE error response:', parseError)
  errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
}
```

## 🎯 Testing Steps

### **Test 1: Valid Deletion**
1. Create an available slot (drag to select → confirm)
2. Double-click the green available slot
3. Should see: "Slot Deleted" success message
4. Slot should disappear from calendar

### **Test 2: Invalid Deletion**
1. Try double-clicking a booked/assigned slot
2. Should see: "Cannot modify [status] slots" error
3. Slot should remain unchanged

### **Test 3: Network Issues**
1. Disconnect internet
2. Try double-clicking available slot
3. Should see: "Failed to delete time slot" error
4. Reconnect and try again

## 🔧 API Endpoint Verification

The DELETE endpoint at `/api/schedule-slots/[id]/route.ts` should:

✅ **Authentication**: Check user is logged in  
✅ **Authorization**: Verify slot ownership  
✅ **Validation**: Ensure slot can be deleted  
✅ **Database**: Remove slot from schedule_slots table  
✅ **Response**: Return success/error message  

## 📋 Debugging Checklist

- [ ] User is authenticated and logged in
- [ ] Slot belongs to current user (teacher_id matches)
- [ ] Slot status is 'available' (green slots only)
- [ ] Slot ID is valid UUID format
- [ ] Database connection is working
- [ ] Network request completes successfully
- [ ] API returns proper JSON response

## 🚀 Quick Fixes

### **Fix 1: Refresh Everything**
```javascript
// Force refresh calendar data
window.location.reload()
```

### **Fix 2: Check Slot Status**
Only double-click slots that show:
- Green background
- "Available" text
- Pulsing dot indicator
- "Double-click to delete" tooltip

### **Fix 3: Verify Authentication**
Check if you're logged in:
- Look for user info in top navigation
- Try refreshing the page
- Log out and log back in if needed

## 🎨 Visual Indicators

**Available slots (deletable)** should show:
- 🟢 Green background with pulse dot
- 🖱️ Mouse emoji in tooltip
- ❌ Red X button on hover
- Enhanced hover effects

**Non-deletable slots** show:
- Different colors (yellow, blue, gray)
- No delete indicators
- Different tooltips

## 📞 Still Having Issues?

1. **Check server logs** for detailed error messages
2. **Verify database** schedule_slots table exists
3. **Test with different slots** to isolate the issue
4. **Clear browser cache** and try again
5. **Check network connectivity** and API availability

## ✨ Expected Behavior

**Successful deletion flow:**
1. User double-clicks green available slot
2. Console shows: "🗑️ Deleting available slot: [id]"
3. API returns 200 OK with success message
4. Console shows: "✅ Slot deleted successfully"
5. Toast shows: "Slot Deleted"
6. Calendar refreshes and slot disappears

The enhanced error handling should now provide much clearer feedback about what's going wrong!