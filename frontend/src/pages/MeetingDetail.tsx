import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Link as LinkIcon, 
  Edit, 
  Trash2,
  Plus,
  MoreHorizontal,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock3,
  Video,
  Share
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  meetingsApi, 
  Meeting, 
  MeetingType,
  MeetingStatus, 
  AttendeeStatus, 
  MeetingActionItem,
  ActionItemStatus
} from '@/lib/api/meetings';
import { VideoMeeting } from '@/components/meetings/VideoMeeting';
import { toast } from 'sonner';

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  // Load meeting details
  const loadMeeting = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await meetingsApi.getMeeting(id);
      setMeeting(data);
    } catch (error) {
      console.error('Error loading meeting:', error);
      toast.error('Failed to load meeting details');
      navigate('/meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeeting();
  }, [id]);

  // Delete meeting
  const handleDelete = async () => {
    if (!meeting) return;
    
    try {
      await meetingsApi.deleteMeeting(meeting.id);
      toast.success('Meeting deleted successfully');
      navigate('/meetings');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    }
  };

  // Update meeting status
  const updateMeetingStatus = async (status: MeetingStatus) => {
    if (!meeting) return;
    
    try {
      const updated = await meetingsApi.updateMeeting(meeting.id, { status });
      setMeeting(updated);
      toast.success(`Meeting marked as ${status.toLowerCase()}`);
    } catch (error) {
      console.error('Error updating meeting status:', error);
      toast.error('Failed to update meeting status');
    }
  };

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Get status badge
  const getStatusBadge = (status: MeetingStatus) => {
    switch (status) {
      case MeetingStatus.Scheduled:
        return <Badge variant="default">Scheduled</Badge>;
      case MeetingStatus.InProgress:
        return <Badge variant="secondary">In Progress</Badge>;
      case MeetingStatus.Completed:
        return <Badge variant="outline">Completed</Badge>;
      case MeetingStatus.Cancelled:
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Get attendee status badge
  const getAttendeeStatusBadge = (status: AttendeeStatus) => {
    switch (status) {
      case AttendeeStatus.Accepted:
        return <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">Accepted</Badge>;
      case AttendeeStatus.Declined:
        return <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">Declined</Badge>;
      case AttendeeStatus.Tentative:
        return <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">Tentative</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Get action item status icon
  const getActionItemIcon = (status: ActionItemStatus) => {
    switch (status) {
      case ActionItemStatus.Completed:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case ActionItemStatus.InProgress:
        return <Clock3 className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Share meeting link
  const shareMeeting = async () => {
    const meetingUrl = `${window.location.origin}/meetings/${meeting?.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${meeting?.title}`,
          text: `You're invited to join the meeting: ${meeting?.title}`,
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Meeting not found</h2>
          <p className="text-muted-foreground mb-4">The meeting you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/meetings')}>Back to Meetings</Button>
        </div>
      </div>
    );
  }

  const startDateTime = formatDateTime(meeting.startTime);
  const endDateTime = formatDateTime(meeting.endTime);
  const isUpcoming = new Date(meeting.startTime) > new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/meetings')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Meetings
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{meeting.title}</h1>
              {getStatusBadge(meeting.status)}
              {isUpcoming && <Badge variant="secondary">Upcoming</Badge>}
            </div>
            {meeting.description && (
              <p className="text-muted-foreground">{meeting.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={shareMeeting}
            className="gap-2"
            title="Share meeting link"
          >
            <Share className="h-4 w-4" />
            Share
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate(`/meetings/${meeting.id}/edit`)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => updateMeetingStatus(MeetingStatus.InProgress)}>
                Mark as In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateMeetingStatus(MeetingStatus.Completed)}>
                Mark as Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateMeetingStatus(MeetingStatus.Cancelled)}>
                Mark as Cancelled
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Meeting
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the meeting
                      and all associated action items.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Delete Meeting
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Meeting Details Card - Always shown */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Meeting Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date and Time */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{startDateTime.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{startDateTime.time} - {endDateTime.time}</span>
            </div>
          </div>

          {/* Meeting Type */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Type:</span>
            <Badge variant="outline" className="font-medium">
              {meeting.type === MeetingType.Online && '🌐 Online Meeting'}
              {meeting.type === MeetingType.InPerson && '🏢 In-Person Meeting'}
              {meeting.type === MeetingType.Hybrid && '🔗 Hybrid Meeting'}
            </Badge>
          </div>

          {/* Location and Links */}
          <div className="flex flex-wrap gap-6">
            {/* Physical Location for in-person and hybrid meetings */}
            {meeting.location && (meeting.type === MeetingType.InPerson || meeting.type === MeetingType.Hybrid) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{meeting.location}</span>
              </div>
            )}
            
            {/* External meeting link */}
            {meeting.meetingLink && (
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => window.open(meeting.meetingLink, '_blank')}
                >
                  Join External Meeting
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
            
            {/* Built-in video indication */}
            {(meeting.type === MeetingType.Online || meeting.type === MeetingType.Hybrid) && 
             (isUpcoming || meeting.status === MeetingStatus.InProgress) && (
              <div className="flex items-center gap-2 text-primary">
                <Video className="h-4 w-4" />
                <span className="text-sm font-medium">Built-in video available</span>
              </div>
            )}
          </div>

          {/* Project */}
          {meeting.project && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Project:</span>
              <Badge variant="outline" className="text-primary border-primary/20">
                {meeting.project.name}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dynamic Layout Based on Video Tab */}
      <div className={`gap-6 ${
        (meeting.type === MeetingType.Online || meeting.type === MeetingType.Hybrid) && 
        (isUpcoming || meeting.status === MeetingStatus.InProgress) ? 
        '' : 'grid lg:grid-cols-3'
      }`}>
        {/* Main Content - Full width for video, 2/3 width for others */}
        <div className={`space-y-6 ${
          (meeting.type === MeetingType.Online || meeting.type === MeetingType.Hybrid) && 
          (isUpcoming || meeting.status === MeetingStatus.InProgress) ? 
          '' : 'lg:col-span-2'
        }`}>
          {/* Tabs for Video, Agenda and Action Items */}
          <Tabs defaultValue={
            (meeting.type === MeetingType.Online || meeting.type === MeetingType.Hybrid) && 
            (isUpcoming || meeting.status === MeetingStatus.InProgress) ? "video" : "agenda"
          } className="space-y-4">
            <TabsList>
              {/* Show video tab for online/hybrid meetings that are upcoming or in progress */}
              {(meeting.type === MeetingType.Online || meeting.type === MeetingType.Hybrid) && 
               (isUpcoming || meeting.status === MeetingStatus.InProgress) && (
                <TabsTrigger value="video">
                  🎥 Join Meeting
                </TabsTrigger>
              )}
              <TabsTrigger value="agenda">
                Agenda {meeting.agenda && Array.isArray(meeting.agenda) && `(${meeting.agenda.length})`}
              </TabsTrigger>
              <TabsTrigger value="action-items">
                Action Items {meeting.actionItems && `(${meeting.actionItems.length})`}
              </TabsTrigger>
              {meeting.notes && <TabsTrigger value="notes">Notes</TabsTrigger>}
            </TabsList>

            {/* Video Meeting Tab - Full width */}
            {(meeting.type === MeetingType.Online || meeting.type === MeetingType.Hybrid) && 
             (isUpcoming || meeting.status === MeetingStatus.InProgress) && (
              <TabsContent value="video" className="mt-4">
                <VideoMeeting 
                  meeting={meeting} 
                  onMeetingStart={() => loadMeeting()}
                  onMeetingEnd={() => loadMeeting()}
                />
              </TabsContent>
            )}

            {/* Agenda Tab */}
            <TabsContent value="agenda">
              <Card>
                <CardHeader>
                  <CardTitle>Meeting Agenda</CardTitle>
                </CardHeader>
                <CardContent>
                  {meeting.agenda && Array.isArray(meeting.agenda) && meeting.agenda.length > 0 ? (
                    <div className="space-y-4">
                      {meeting.agenda.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{item.title}</h4>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            )}
                            {item.duration && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Estimated duration: {item.duration} minutes
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No agenda items have been added to this meeting.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Action Items Tab */}
            <TabsContent value="action-items">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Action Items</CardTitle>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Action Item
                  </Button>
                </CardHeader>
                <CardContent>
                  {meeting.actionItems && meeting.actionItems.length > 0 ? (
                    <div className="space-y-4">
                      {meeting.actionItems.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 p-4 rounded-lg border">
                          {getActionItemIcon(item.status)}
                          <div className="flex-1">
                            <p className="font-medium">{item.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              {item.assignee && (
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage src={item.assignee.avatar} />
                                    <AvatarFallback className="text-xs">
                                      {item.assignee.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{item.assignee.name}</span>
                                </div>
                              )}
                              {item.dueDate && (
                                <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                              )}
                              {item.task && (
                                <Badge variant="outline" className="text-xs">
                                  Converted to Task
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No action items have been created yet.</p>
                      <Button size="sm" className="mt-4 gap-2">
                        <Plus className="h-4 w-4" />
                        Add First Action Item
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            {meeting.notes && (
              <TabsContent value="notes">
                <Card>
                  <CardHeader>
                    <CardTitle>Meeting Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap">{meeting.notes}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sidebar - Only show when not in video mode */}
        {!((meeting.type === MeetingType.Online || meeting.type === MeetingType.Hybrid) && 
           (isUpcoming || meeting.status === MeetingStatus.InProgress)) && (
          <div className="space-y-6">
            {/* Attendees */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendees ({meeting.attendees.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {meeting.attendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={attendee.user.avatar} />
                      <AvatarFallback>
                        {attendee.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{attendee.user.name}</p>
                      <p className="text-xs text-muted-foreground">{attendee.user.email}</p>
                    </div>
                    <div className="text-right">
                      {getAttendeeStatusBadge(attendee.status)}
                      {attendee.isRequired && (
                        <p className="text-xs text-muted-foreground mt-1">Required</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Meeting Creator */}
            <Card>
              <CardHeader>
                <CardTitle>Organized by</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={meeting.createdBy.avatar} />
                    <AvatarFallback>
                      {meeting.createdBy.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{meeting.createdBy.name}</p>
                    <p className="text-sm text-muted-foreground">{meeting.createdBy.email}</p>
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="text-xs text-muted-foreground">
                  <p>Created: {new Date(meeting.createdAt).toLocaleDateString()}</p>
                  <p>Updated: {new Date(meeting.updatedAt).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}