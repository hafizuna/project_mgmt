import { useEffect, useRef, useState } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Users, 
  Settings,
  Maximize2,
  Minimize2,
  Share,
  Copy
} from 'lucide-react';
import { Meeting, meetingsApi, MeetingStatus } from '@/lib/api/meetings';
import { useAuthStore } from '@/lib/stores/auth';
import { toast } from 'sonner';

interface VideoMeetingProps {
  meeting: Meeting;
  onMeetingEnd?: () => void;
  onMeetingStart?: () => void;
}

interface JitsiAPI {
  executeCommand: (command: string, ...args: any[]) => void;
  addListener: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  dispose: () => void;
  isAudioMuted: () => Promise<boolean>;
  isVideoMuted: () => Promise<boolean>;
  getParticipantsInfo: () => any[];
}

export function VideoMeeting({ meeting, onMeetingEnd, onMeetingStart }: VideoMeetingProps) {
  const { user } = useAuthStore();
  const apiRef = useRef<JitsiAPI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meetingStarted, setMeetingStarted] = useState(false);

  // Generate a unique room name to avoid conflicts
  const generateRoomName = () => {
    if (meeting.videoRoom) {
      return meeting.videoRoom;
    }
    // Create a completely unique room name to avoid any authentication issues
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const meetingId = meeting.id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6);
    return `pf${meetingId}${randomId}${timestamp.toString().slice(-6)}`;
  };
  
  const roomName = generateRoomName();
  
  // Jitsi domain - configurable via environment variables
  const domain = import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si';

  // Configuration for Jitsi Meet
  const jitsiConfig = {
    roomName,
    width: '100%',
    height: isFullscreen ? '100vh' : '700px', // Use string for consistent height
    parentNode: undefined, // will be handled by the component
    configOverwrite: {
      startWithAudioMuted: false,
      startWithVideoMuted: false,
      enableWelcomePage: false,
      enableUserRolesBasedOnToken: false,
      prejoinPageEnabled: false, // Skip pre-join page
      disableInviteFunctions: true,
      doNotStoreRoom: true,
      requireDisplayName: false, // Don't require display name input
      enableEmailInStats: false,
      enableFeaturesBasedOnToken: false,
      // Authentication - ensure guest access is enabled
      enableAuthByDomain: false,
      authenticationRequired: false,
      enableGuestsAuthorization: false,
      // Room settings to prevent members-only restriction
      enableLobby: false,
      enableInsecureRoomNameWarning: false,
      // Disable all lobby and moderation features
      enableLobbyChat: false,
      enableAutoKnocking: false,
      enableKnocking: false,
      disableLobby: true,
      // Security settings to avoid authentication prompts
      enableE2EE: false,
      e2ee: {
        externallyManagedKey: false
      },
      // Moderator settings - make everyone a moderator to skip auth
      enableAutoModeratorOnCreate: true,
      disableModerator: false, // Allow moderation but without auth requirements
      // Skip waiting for authenticated users
      enableAutoLogin: false,
      enableAutoJoin: true,
      // Force guest mode without any restrictions
      guestDialOutLimit: 0,
      guestDialOutCodeLimit: 0,
      // Allow anyone to start the meeting
      enableClosePage: false,
      // Skip authentication waiting completely
      enableNoAudioSignal: false,
      enableNoisyMicDetection: false,
      // Make meeting start immediately
      startSilent: false,
      // Customization
      defaultLanguage: 'en',
      disableThirdPartyRequests: true,
      disableLocalVideoFlip: false,
      backgroundAlpha: 0.5,
      // Remove external auth requirements
      googleApiApplicationClientID: '',
      microsoftApiApplicationClientID: '',
      // Video quality and layout settings
      constraints: {
        video: {
          height: {
            ideal: 720,
            max: 1080,
            min: 240
          }
        }
      },
      resolution: 720,
      // Disable features that might cause auth issues
      disableRemoteMute: true,
      remoteVideoMenu: {
        disableKick: true,
      },
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      SHOW_BRAND_WATERMARK: false,
      BRAND_WATERMARK_LINK: '',
      SHOW_POWERED_BY: false,
      DISPLAY_WELCOME_PAGE_CONTENT: false,
      DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
      APP_NAME: 'ProjectFlow Meeting',
      NATIVE_APP_NAME: 'ProjectFlow Meeting',
      PROVIDER_NAME: 'ProjectFlow',
      DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
      DISABLE_PRESENCE_STATUS: false,
      // Remove authentication related UI
      AUTHENTICATION_ENABLE: false,
      GOOGLE_AUTHENTICATION_ENABLE: false,
      // Disable lobby and authentication UI
      DISABLE_LOBBY: true,
      HIDE_INVITE_MORE_HEADER: true,
      LOBBY_CHAT_ENABLED: false,
      // Disable features that trigger auth
      ENABLE_DIAL_OUT: false,
      ENABLE_DIAL_IN: false,
      // Hide authentication-related UI
      HIDE_DEEP_LINKING_LOGO: true,
      // Toolbar customization - removed invite and some external features
      TOOLBAR_BUTTONS: [
        'microphone', 
        'camera', 
        'closedcaptions', 
        'desktop', 
        'fullscreen',
        'fodeviceselection', 
        'hangup', 
        'chat', 
        'raisehand',
        'videoquality', 
        'filmstrip',
        'tileview', 
        'settings',
        'shortcuts'
      ],
      SETTINGS_SECTIONS: ['devices', 'language', 'moderator'],
      // Video layout fixes for better display
      VIDEO_LAYOUT_FIT: 'contain', // Ensure video fits properly
      filmStripOnly: false,
      VERTICAL_FILMSTRIP: false, // Use horizontal filmstrip for better space usage
      TILE_VIEW_MAX_COLUMNS: 4,
      // Ensure proper video scaling
      DEFAULT_BACKGROUND: '#000000',
      OPTIMAL_BROWSERS: ['chrome', 'chromium', 'firefox', 'nwjs', 'electron', 'safari'],
      // Better mobile experience
      MOBILE_APP_PROMO: false,
      // Video container settings
      VIDEO_CONTAINER_TYPE: 'video',
      // Layout configuration for better video display
      INITIAL_TOOLBAR_TIMEOUT: 20000,
      TOOLBAR_TIMEOUT: 4000,
      VIDEO_QUALITY_LABEL_DISABLED: true,
      // Ensure video takes full available space
      DISABLE_VIDEO_BACKGROUND: true,
    },
    userInfo: {
      displayName: user?.name || 'Team Member',
      email: user?.email || 'user@projectflow.com',
      // Make user appear as authenticated moderator
      moderator: true,
    },
    // Add JWT-like configuration to appear authenticated
    jwt: undefined, // No actual JWT needed with our config
  };

  // Update meeting status when video meeting starts/ends
  const updateMeetingStatus = async (status: MeetingStatus) => {
    try {
      await meetingsApi.updateMeeting(meeting.id, { status });
      if (status === MeetingStatus.InProgress && onMeetingStart) {
        onMeetingStart();
      } else if (status === MeetingStatus.Completed && onMeetingEnd) {
        onMeetingEnd();
      }
    } catch (error) {
      console.error('Error updating meeting status:', error);
    }
  };

  // Jitsi API event handlers
  const handleApiReady = (api: JitsiAPI) => {
    apiRef.current = api;
    setIsLoading(false);

    // Add event listeners
    api.addListener('videoConferenceJoined', () => {
      setIsConnected(true);
      setMeetingStarted(true);
      updateMeetingStatus(MeetingStatus.InProgress);
      toast.success('Joined the meeting successfully');
    });

    api.addListener('videoConferenceLeft', () => {
      setIsConnected(false);
      if (meetingStarted) {
        updateMeetingStatus(MeetingStatus.Completed);
        toast.info('Left the meeting');
      }
    });

    api.addListener('participantJoined', () => {
      updateParticipantCount();
    });

    api.addListener('participantLeft', () => {
      updateParticipantCount();
    });

    api.addListener('audioMuteStatusChanged', (muted: boolean) => {
      setIsAudioMuted(muted.muted);
    });

    api.addListener('videoMuteStatusChanged', (muted: boolean) => {
      setIsVideoMuted(muted.muted);
    });

    api.addListener('readyToClose', () => {
      if (onMeetingEnd) {
        onMeetingEnd();
      }
    });

    // Handle conference errors
    api.addListener('conferenceError', (error: any) => {
      console.error('Conference error:', error);
      if (error.name === 'conference.connectionError.membersOnly') {
        toast.error('Unable to join meeting - room may be restricted. Trying to reconnect...');
        // Try to rejoin with different settings
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(`Meeting connection error: ${error.message || 'Unknown error'}`);
      }
    });

    // Handle connection failures
    api.addListener('connectionFailed', () => {
      toast.error('Failed to connect to video service');
    });
  };

  const updateParticipantCount = async () => {
    if (apiRef.current) {
      try {
        const participantInfo = apiRef.current.getParticipantsInfo();
        setParticipants(participantInfo.length + 1); // +1 for current user
      } catch (error) {
        console.error('Error getting participant count:', error);
      }
    }
  };

  // Control functions
  const toggleAudio = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleVideo');
    }
  };

  const hangUp = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Share meeting link
  const shareMeeting = async () => {
    const meetingUrl = `${window.location.origin}/meetings/${meeting.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${meeting.title}`,
          text: `You're invited to join the meeting: ${meeting.title}`,
          url: meetingUrl,
        });
      } catch (error) {
        // User cancelled share or share failed
        copyToClipboard(meetingUrl);
      }
    } else {
      copyToClipboard(meetingUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Meeting link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy meeting link');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch (error) {
          console.error('Error disposing Jitsi API:', error);
        }
      }
    };
  }, []);

  return (
    <>
      {/* Custom CSS for Jitsi video display fixes */}
      <style>{`
        /* Ensure Jitsi iframe content fills properly */
        #jitsi-container iframe {
          background-color: #000000 !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 700px !important;
        }
        
        /* Fix video container sizing */
        .jitsi-iframe-wrapper {
          background: #000000 !important;
          overflow: hidden !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Ensure video elements scale properly */
        .videocontainer, 
        #videoContainer,
        .large-video-container__wrapper,
        .videocontainer__background {
          height: 100% !important;
          min-height: 700px !important;
          width: 100% !important;
        }
        
        /* Fix for white space issues */
        .large-video-container {
          height: 100% !important;
          background: #000000 !important;
          width: 100% !important;
          min-height: 700px !important;
        }
        
        /* Ensure proper video scaling */
        .large-video,
        #largeVideo {
          object-fit: cover !important;
          height: 100% !important;
          width: 100% !important;
          min-height: 700px !important;
        }
        
        /* Fix Jitsi Meet main content area */
        .App .toolbox-content-items,
        .conference-room,
        .large-video,
        #largeVideoContainer {
          height: 100% !important;
          min-height: 700px !important;
        }
        
        /* Remove any padding or margins that create white space */
        .large-video-container,
        .large-video-container__wrapper {
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* Ensure filmstrip doesn't interfere with video size */
        .filmstrip {
          bottom: 0 !important;
          position: absolute !important;
        }
      `}</style>
      
      <div className="space-y-4">
      {/* Meeting Controls - Simplified */}
      <div className="flex items-center justify-between mb-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{meeting.title}</h3>
            {isConnected ? (
              <Badge variant="default" className="bg-green-600">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                Live
              </Badge>
            ) : (
              <Badge variant="secondary">{isLoading ? 'Connecting...' : 'Ready to Join'}</Badge>
            )}
          </div>
          
          {isConnected && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{participants} participant{participants !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        
        {/* Quick Controls - Only show when connected */}
        {isConnected && (
          <div className="flex items-center gap-2">
            <Button
              variant={isAudioMuted ? "destructive" : "outline"}
              size="sm"
              onClick={toggleAudio}
              title={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button
              variant={isVideoMuted ? "destructive" : "outline"}
              size="sm"
              onClick={toggleVideo}
              title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
            >
              {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={shareMeeting}
              title="Share meeting link"
            >
              <Share className="h-4 w-4" />
            </Button>
            
            <div className="w-px h-6 bg-border mx-2" />
            
            <Button
              variant="destructive"
              size="sm"
              onClick={hangUp}
              className="gap-2"
              title="Leave meeting"
            >
              <PhoneOff className="h-4 w-4" />
              Leave
            </Button>
          </div>
        )}
      </div>

      {/* Video Container - Larger and more prominent */}
      <Card className={`${isFullscreen ? 'fixed inset-0 z-50' : 'w-full'}`}>
        <CardContent className={`${isFullscreen ? 'p-0 h-full' : 'p-0'}`} id="jitsi-container">
          {isLoading && (
            <div className="flex items-center justify-center h-[700px] bg-muted">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground">Initializing video meeting...</p>
                <p className="text-xs text-muted-foreground">Connecting to video server...</p>
              </div>
            </div>
          )}
          
          <div className={`${isLoading ? 'hidden' : 'block'} ${isFullscreen ? 'h-full' : 'min-h-[700px]'}`}>
            <JitsiMeeting
              domain={domain}
              roomName={roomName}
              configOverwrite={jitsiConfig.configOverwrite}
              interfaceConfigOverwrite={jitsiConfig.interfaceConfigOverwrite}
              userInfo={jitsiConfig.userInfo}
              onApiReady={handleApiReady}
              getIFrameRef={(iframeRef) => {
                // Ensure proper sizing and video display
                if (iframeRef.current) {
                  if (isFullscreen) {
                    iframeRef.current.style.height = '100vh';
                    iframeRef.current.style.width = '100vw';
                    iframeRef.current.style.position = 'fixed';
                    iframeRef.current.style.top = '0';
                    iframeRef.current.style.left = '0';
                    iframeRef.current.style.zIndex = '9999';
                  } else {
                    iframeRef.current.style.height = '700px';
                    iframeRef.current.style.width = '100%';
                    iframeRef.current.style.minHeight = '700px';
                    iframeRef.current.style.maxHeight = '700px';
                  }
                  // Remove borders for cleaner look
                  iframeRef.current.style.border = 'none';
                  iframeRef.current.style.borderRadius = '8px';
                  // Ensure iframe content displays properly
                  iframeRef.current.style.overflow = 'hidden';
                  iframeRef.current.style.backgroundColor = '#000000';
                  // Allow full interaction
                  iframeRef.current.allow = 'camera; microphone; fullscreen; display-capture; autoplay';
                  // Force specific sizing attributes
                  iframeRef.current.setAttribute('width', '100%');
                  iframeRef.current.setAttribute('height', '700');
                  
                  // Add event listener to handle iframe load
                  iframeRef.current.onload = () => {
                    try {
                      // Inject additional CSS into iframe if possible
                      const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
                      if (iframeDoc) {
                        const style = iframeDoc.createElement('style');
                        style.textContent = `
                          body { margin: 0; padding: 0; }
                          #largeVideoContainer,
                          .large-video-container,
                          .videocontainer { 
                            height: 100vh !important; 
                            width: 100% !important; 
                          }
                        `;
                        iframeDoc.head?.appendChild(style);
                      }
                    } catch (e) {
                      // Cross-origin restrictions prevent iframe manipulation
                      console.log('Cannot inject styles into iframe due to CORS');
                    }
                  };
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Help & Instructions - Only show when not connected */}
      {!isConnected && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/50 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="text-sm space-y-3">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Video className="h-4 w-4" />
                <h4 className="font-medium">Ready to Join Meeting</h4>
              </div>
              
              <div className="text-blue-700 dark:text-blue-300 space-y-2">
                <p>• <strong>No downloads required</strong> - everything works in your browser</p>
                <p>• <strong>Your attendees can join</strong> by navigating to this same meeting page</p>
                <p>• <strong>Full video features available</strong> - screen sharing, chat, and more</p>
                <p>• <strong>Meeting status will sync</strong> automatically when you join</p>
              </div>
              
              <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  💡 <strong>Tip:</strong> Click anywhere in the video area below to join the meeting. 
                  Your camera and microphone permissions will be requested.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
}
