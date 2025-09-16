import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Users, 
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Meeting, meetingsApi, MeetingStatus } from '@/lib/api/meetings';
import { useAuthStore } from '@/lib/stores/auth';
import { toast } from 'sonner';

interface ZoomMeetingProps {
  meeting: Meeting;
  onMeetingEnd?: () => void;
  onMeetingStart?: () => void;
}

// This is a placeholder component for Zoom SDK integration
// To fully implement this, you would need to:
// 1. Install Zoom Web SDK: npm install @zoomus/websdk
// 2. Get Zoom SDK credentials from Zoom Marketplace
// 3. Implement the full Zoom SDK integration

export function ZoomMeeting({ meeting, onMeetingEnd, onMeetingStart }: ZoomMeetingProps) {
  const { user } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  // For now, we'll show instructions on how to set up Zoom integration
  // and provide a fallback to external Zoom links

  return (
    <div className="space-y-4">
      {/* Meeting Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Zoom Meeting Integration</CardTitle>
              <Badge variant="secondary">Setup Required</Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Setup Notice */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Zoom SDK Integration Available
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                To enable embedded Zoom meetings directly in your platform, you need to set up Zoom SDK credentials.
              </p>
              
              {/* Setup Steps */}
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-2">Setup Steps:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Create a Zoom SDK App in <a href="https://marketplace.zoom.us/" className="underline" target="_blank" rel="noopener noreferrer">Zoom Marketplace</a></li>
                  <li>Install Zoom Web SDK: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">npm install @zoomus/websdk</code></li>
                  <li>Add your SDK Key and Secret to environment variables</li>
                  <li>Replace this component with full Zoom SDK implementation</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Current Options */}
          <div className="space-y-3">
            <h4 className="font-medium">Current Meeting Options:</h4>
            
            {/* External Zoom Link */}
            {meeting.meetingLink && (
              <Button 
                className="w-full gap-2 justify-start"
                onClick={() => window.open(meeting.meetingLink, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Join via Zoom (External)
              </Button>
            )}

            {/* Jitsi Alternative */}
            <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
              <p className="mb-2">
                <strong>Alternative:</strong> We've implemented Jitsi Meet integration which provides:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Free, open-source video calling</li>
                <li>No account required for participants</li>
                <li>Screen sharing, chat, and recording</li>
                <li>Embedded directly in your platform</li>
                <li>Mobile responsive</li>
              </ul>
              <p className="mt-2 font-medium">
                Switch to the "Video Meeting" tab to use Jitsi Meet instead.
              </p>
            </div>
          </div>

          {/* Technical Implementation Guide */}
          <details className="border rounded-lg">
            <summary className="p-3 cursor-pointer font-medium hover:bg-muted/50">
              🔧 Technical Implementation Guide
            </summary>
            <div className="p-3 border-t text-sm space-y-2">
              <h5 className="font-medium">For Zoom SDK Implementation:</h5>
              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`// Install Zoom SDK
npm install @zoomus/websdk

// Import in your component
import { ZoomMtg } from '@zoomus/websdk';

// Initialize with your credentials
ZoomMtg.setZoomJSLib('https://source.zoom.us/lib', '/av');
ZoomMtg.init({
  leaveUrl: window.location.origin,
  success: () => {
    // Join meeting
    ZoomMtg.join({
      signature: generateSignature(),
      meetingNumber: meeting.zoomMeetingId,
      userName: user.name,
      userEmail: user.email,
      passWord: meeting.zoomPassword,
    });
  }
});`}
              </pre>
              
              <h5 className="font-medium mt-4">Backend Changes Needed:</h5>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Add Zoom API integration to create meetings</li>
                <li>Store Zoom meeting IDs and passwords</li>
                <li>Generate JWT signatures for Zoom SDK</li>
                <li>Update meeting model with Zoom-specific fields</li>
              </ul>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}