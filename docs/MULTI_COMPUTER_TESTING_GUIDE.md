# Multi-Computer Video Meeting Testing Guide

## 🎯 **Overview**
This guide will help you test the video meeting functionality using two computers:
- **Host Computer** (this computer): Runs the backend and database
- **Client Computer** (another computer): Accesses the application via network

Your network IP address: `100.115.92.202`

## 🖥️ **Step 1: Start Backend Server**

On the **host computer** (this one):

```bash
cd /home/hafizo/Projects/project_mgmt/backend
npm run dev
```

You should see:
```
API listening on http://0.0.0.0:4000
External access: http://[YOUR_IP]:4000
For external testing, use your computer's IP address
```

## 🌐 **Step 2: Start Frontend for Network Access**

On the **host computer**, choose one of these options:

### Option A: Network Development Server
```bash
cd /home/hafizo/Projects/project_mgmt/frontend
npm run dev:network
```

### Option B: Build and Preview (Recommended for testing)
```bash
cd /home/hafizo/Projects/project_mgmt/frontend
npm run build:network
npm run preview:network
```

The frontend will be available at: `http://100.115.92.202:8080`

## 👤 **Step 3: Set Up Test Users**

### On Host Computer:
1. Open browser to `http://localhost:8080` or `http://100.115.92.202:8080`
2. Login as admin/manager user
3. Create a meeting with these settings:
   - **Type**: Online Meeting or Hybrid
   - **Add attendees**: Add the test user you'll use on the client computer
   - **Share the meeting link**: Copy the meeting URL

### On Client Computer:
1. Open browser to `http://100.115.92.202:8080`
2. Login as the attendee user you added to the meeting
3. Navigate to the meeting (either via the shared link or meetings page)

## 🎥 **Step 4: Test Video Meeting Flow**

### Expected Flow:
1. **Host joins first**: 
   - May see "waiting for authenticated user" for 10-30 seconds (normal)
   - Should become moderator automatically
   - Video should display in full container (700px height)

2. **Attendee joins**:
   - Should join immediately without waiting
   - Video should work for both participants
   - Both can see each other's video and use controls

## 🔧 **Troubleshooting Network Access**

### If Client Computer Can't Access:

#### Check Firewall:
```bash
# On host computer - allow ports 4000 and 8080
sudo ufw allow 4000
sudo ufw allow 8080

# Or temporarily disable firewall for testing
sudo ufw disable
```

#### Check Network Connection:
```bash
# From client computer, test connectivity:
curl http://100.115.92.202:4000/api/health
```

Should return: `{"ok": true}`

#### Check IP Address:
If the IP changed, update `.env.network`:
```bash
# Get current IP
ip addr show | grep "inet " | grep -v "127.0.0.1"
```

### Common Issues:

1. **CORS Errors**: Backend is configured to allow all origins during development
2. **Connection Refused**: Check that both backend and frontend are running
3. **401 Unauthorized**: Make sure both users are properly logged in
4. **Video Not Loading**: Check browser permissions for camera/microphone

## 📱 **Testing Scenarios**

### Basic Functionality Test:
- [ ] Both users can access the application via network
- [ ] Both users can login successfully
- [ ] Meeting creator can create meetings
- [ ] Attendee can see the meeting in their meetings list
- [ ] Both can join the video meeting

### Video Meeting Features Test:
- [ ] Video displays properly (no white space, good quality)
- [ ] Both users can see each other's video
- [ ] Audio works in both directions
- [ ] Camera/microphone controls work
- [ ] Share meeting button works
- [ ] Meeting status updates (In Progress → Completed)

### Advanced Features Test:
- [ ] Screen sharing works
- [ ] Chat functionality works
- [ ] Multiple people can join the same meeting
- [ ] Meeting controls (mute, video toggle, hang up) work
- [ ] Meeting can be ended properly

## 🌍 **Network Configuration Files**

The system uses different environment files:

- **`.env.local`**: For localhost development (single computer)
- **`.env.network`**: For network access (multi-computer testing)

**Current network configuration:**
```
VITE_API_URL=http://100.115.92.202:4000/api
```

## 🔧 **Quick Commands Summary**

### Start Backend:
```bash
cd /home/hafizo/Projects/project_mgmt/backend && npm run dev
```

### Start Frontend (Network Mode):
```bash
cd /home/hafizo/Projects/project_mgmt/frontend && npm run dev:network
```

### Test Network Access:
```bash
# From any computer on the network:
curl http://100.115.92.202:4000/api/health
```

### Access URLs:
- **Backend API**: `http://100.115.92.202:4000/api`
- **Frontend App**: `http://100.115.92.202:8080`
- **Health Check**: `http://100.115.92.202:4000/api/health`

## 🎯 **Success Criteria**

Your testing is successful when:

1. ✅ **Both computers can access the application**
2. ✅ **Users can login from different computers** 
3. ✅ **Meetings can be created and joined from different computers**
4. ✅ **Video meetings work with participants on different computers**
5. ✅ **No "members only" or authentication blocking errors**
6. ✅ **Video displays properly with good quality on both sides**
7. ✅ **All meeting controls function correctly**

## 🚨 **Security Note**

This configuration allows open access for testing. For production:
- Set specific CORS origins
- Use HTTPS
- Implement proper authentication
- Configure firewall rules appropriately

Happy testing! 🎉