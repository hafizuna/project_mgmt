import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Users, MapPin, Link as LinkIcon, Filter, Search, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { meetingsApi, Meeting, MeetingType, MeetingStatus, MeetingFilters } from '@/lib/api/meetings';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Meetings() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<MeetingFilters>({});

  // Load meetings
  const loadMeetings = async () => {
    try {
      setLoading(true);
      const data = await meetingsApi.getMeetings(filters);
      setMeetings(data);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, [filters]);

  // Filter meetings by search term
  const filteredMeetings = meetings.filter(meeting =>
    meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get status badge variant
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

  // Format date for display
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Check if meeting is upcoming
  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meetings</h1>
          <p className="text-muted-foreground">
            Manage your team meetings and action items
          </p>
        </div>
        <Button onClick={() => navigate('/meetings/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => 
              setFilters(prev => ({ 
                ...prev, 
                status: value === 'all' ? undefined : value as MeetingStatus 
              }))
            }
          >
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value={MeetingStatus.Scheduled}>Scheduled</SelectItem>
              <SelectItem value={MeetingStatus.InProgress}>In Progress</SelectItem>
              <SelectItem value={MeetingStatus.Completed}>Completed</SelectItem>
              <SelectItem value={MeetingStatus.Cancelled}>Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={filters.upcoming ? "default" : "outline"}
            onClick={() => 
              setFilters(prev => ({ 
                ...prev, 
                upcoming: !prev.upcoming 
              }))
            }
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Upcoming
          </Button>
        </div>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-2/3 mb-4" />
                <div className="flex gap-4">
                  <div className="h-4 bg-muted rounded w-20" />
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-4 bg-muted rounded w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMeetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
            <p className="text-muted-foreground mb-4 text-center">
              {searchTerm || Object.keys(filters).length > 0 
                ? "Try adjusting your search or filters"
                : "Get started by scheduling your first meeting"
              }
            </p>
            {!searchTerm && Object.keys(filters).length === 0 && (
              <Button onClick={() => navigate('/meetings/new')} className="gap-2">
                <Plus className="h-4 w-4" />
                Schedule Meeting
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMeetings.map((meeting) => {
            const startDateTime = formatDateTime(meeting.startTime);
            const endDateTime = formatDateTime(meeting.endTime);
            const upcoming = isUpcoming(meeting.startTime);
            
            return (
              <Card 
                key={meeting.id} 
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  upcoming ? 'border-primary/20' : ''
                }`}
                onClick={() => navigate(`/meetings/${meeting.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1 flex items-center gap-2">
                        {meeting.title}
                        {upcoming && <Badge variant="secondary" className="text-xs">Upcoming</Badge>}
                        <Badge variant="outline" className="text-xs">
                          {meeting.type === MeetingType.Online && '🌐'}
                          {meeting.type === MeetingType.InPerson && '🏢'}
                          {meeting.type === MeetingType.Hybrid && '🔗'}
                          {meeting.type}
                        </Badge>
                      </CardTitle>
                      {meeting.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {meeting.description}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(meeting.status)}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {/* Date and Time */}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{startDateTime.date}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{startDateTime.time} - {endDateTime.time}</span>
                    </div>

                    {/* Location for in-person and hybrid meetings */}
                    {meeting.location && (meeting.type === MeetingType.InPerson || meeting.type === MeetingType.Hybrid) && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{meeting.location}</span>
                      </div>
                    )}

                    {/* Meeting Link */}
                    {meeting.meetingLink && (
                      <div className="flex items-center gap-1">
                        <LinkIcon className="h-4 w-4" />
                        <span>Online Meeting</span>
                      </div>
                    )}

                    {/* Project */}
                    {meeting.project && (
                      <div className="flex items-center gap-1">
                        <span className="text-primary font-medium">{meeting.project.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Attendees */}
                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="flex -space-x-2">
                        {meeting.attendees.slice(0, 5).map((attendee) => (
                          <Avatar key={attendee.id} className="h-6 w-6 border-2 border-background">
                            <AvatarImage src={attendee.user.avatar} />
                            <AvatarFallback className="text-xs">
                              {attendee.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {meeting.attendees.length > 5 && (
                          <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                            +{meeting.attendees.length - 5}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                      </span>
                      
                      {/* Join Meeting Button for upcoming online/hybrid meetings */}
                      {upcoming && (meeting.type === MeetingType.Online || meeting.type === MeetingType.Hybrid) && (
                        <Button
                          size="sm"
                          className="ml-auto gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/meetings/${meeting.id}#video`);
                          }}
                        >
                          <Video className="h-3 w-3" />
                          Join Video
                        </Button>
                      )}
                      
                      {/* Action Items Count */}
                      {meeting._count?.actionItems && meeting._count.actionItems > 0 && (
                        <Badge variant="outline" className={upcoming ? "" : "ml-auto"}>
                          {meeting._count.actionItems} action item{meeting._count.actionItems !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}