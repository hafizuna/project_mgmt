import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Clock, MapPin, Link as LinkIcon, Users, Plus, X, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { meetingsApi, CreateMeetingRequest, UpdateMeetingRequest, Meeting, AgendaItem, MeetingType } from '@/lib/api/meetings';
import { projectsApi, Project } from '@/lib/api/projects';
import { usersApi, User } from '@/lib/api/users';
import { toast } from 'sonner';
import { format } from 'date-fns';

const meetingSchema = z.object({
  title: z.string().min(2, 'Meeting title must be at least 2 characters'),
  description: z.string().optional(),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  type: z.nativeEnum(MeetingType),
  location: z.string().optional(),
  meetingLink: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  projectId: z.string().optional(),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

interface MeetingFormProps {
  meeting?: Meeting;
  onSubmit: (meeting: Meeting) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export function MeetingForm({ meeting, onSubmit, onCancel, isEditing = false }: MeetingFormProps) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [newAgendaItem, setNewAgendaItem] = useState({ title: '', description: '', duration: '' });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: meeting ? {
      title: meeting.title,
      description: meeting.description || '',
      startDate: new Date(meeting.startTime),
      startTime: format(new Date(meeting.startTime), 'HH:mm'),
      endTime: format(new Date(meeting.endTime), 'HH:mm'),
      type: meeting.type,
      location: meeting.location || '',
      meetingLink: meeting.meetingLink || '',
      projectId: meeting.projectId || '',
    } : {
      startDate: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      type: MeetingType.Online,
    }
  });

  const watchedStartDate = watch('startDate');

  // Load projects and users
  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsResponse, usersResponse] = await Promise.all([
          projectsApi.getProjects(),
          usersApi.getUsers()
        ]);
        setProjects(projectsResponse.projects);
        setUsers(usersResponse.users);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load projects and users');
      }
    };

    loadData();
  }, []);

  // Initialize form data for editing
  useEffect(() => {
    if (meeting) {
      setSelectedAttendees(meeting.attendees.map(a => a.userId));
      if (meeting.agenda && Array.isArray(meeting.agenda)) {
        setAgenda(meeting.agenda);
      }
    }
  }, [meeting]);

  // Add agenda item
  const addAgendaItem = () => {
    if (newAgendaItem.title.trim()) {
      const item: AgendaItem = {
        title: newAgendaItem.title,
        description: newAgendaItem.description || undefined,
        duration: newAgendaItem.duration ? parseInt(newAgendaItem.duration) : undefined,
      };
      setAgenda([...agenda, item]);
      setNewAgendaItem({ title: '', description: '', duration: '' });
    }
  };

  // Remove agenda item
  const removeAgendaItem = (index: number) => {
    setAgenda(agenda.filter((_, i) => i !== index));
  };

  // Toggle attendee selection
  const toggleAttendee = (userId: string) => {
    setSelectedAttendees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Get selected attendee users
  const selectedUsers = users.filter(user => selectedAttendees.includes(user.id));

  // Form submission
  const onFormSubmit = async (data: MeetingFormData) => {
    try {
      setLoading(true);

      // Combine date and time
      const startDateTime = new Date(data.startDate);
      const [startHours, startMinutes] = data.startTime.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes);

      const endDateTime = new Date(data.startDate);
      const [endHours, endMinutes] = data.endTime.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes);

      // Validate end time is after start time
      if (endDateTime <= startDateTime) {
        toast.error('End time must be after start time');
        return;
      }

      const meetingData = {
        title: data.title,
        description: data.description || undefined,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        type: data.type,
        location: data.location || undefined,
        meetingLink: data.meetingLink || undefined,
        projectId: data.projectId || undefined,
        agenda: agenda.length > 0 ? agenda : undefined,
        attendeeIds: selectedAttendees.length > 0 ? selectedAttendees : undefined,
      };

      let result: Meeting;
      if (isEditing && meeting) {
        result = await meetingsApi.updateMeeting(meeting.id, meetingData as UpdateMeetingRequest);
        toast.success('Meeting updated successfully');
      } else {
        result = await meetingsApi.createMeeting(meetingData as CreateMeetingRequest);
        toast.success('Meeting scheduled successfully');
      }

      onSubmit(result);
    } catch (error) {
      console.error('Error saving meeting:', error);
      toast.error(isEditing ? 'Failed to update meeting' : 'Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Basic Info */}
        <div className="space-y-6">
          {/* Meeting Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Meeting Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Enter meeting title"
                />
                {errors.title && (
                  <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Meeting description or purpose"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="type">Meeting Type *</Label>
                <Select
                  value={watch('type') || MeetingType.Online}
                  onValueChange={(value) => setValue('type', value as MeetingType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select meeting type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MeetingType.Online}>
                      🌐 Online Meeting (Video Conference)
                    </SelectItem>
                    <SelectItem value={MeetingType.InPerson}>
                      🏢 In-Person Meeting (Physical Location)
                    </SelectItem>
                    <SelectItem value={MeetingType.Hybrid}>
                      🔗 Hybrid Meeting (Online + In-Person)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="project">Project (Optional)</Label>
                <Select
                  value={watch('projectId') || ''}
                  onValueChange={(value) => setValue('projectId', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Date and Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedStartDate ? format(watchedStartDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={watchedStartDate}
                      onSelect={(date) => date && setValue('startDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.startDate && (
                  <p className="text-sm text-destructive mt-1">{errors.startDate.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...register('startTime')}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-destructive mt-1">{errors.startTime.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...register('endTime')}
                  />
                  {errors.endTime && (
                    <p className="text-sm text-destructive mt-1">{errors.endTime.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location & Access - Conditional based on meeting type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {watch('type') === MeetingType.Online ? 'Online Access' : 'Location & Access'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Physical Location - for in-person and hybrid meetings */}
              {(watch('type') === MeetingType.InPerson || watch('type') === MeetingType.Hybrid) && (
                <div>
                  <Label htmlFor="location">
                    Physical Location {watch('type') === MeetingType.InPerson ? '*' : '(Optional)'}
                  </Label>
                  <Input
                    id="location"
                    {...register('location')}
                    placeholder="e.g., Conference Room A, Building B, Floor 3"
                  />
                </div>
              )}

              {/* Meeting Link - for online and hybrid meetings */}
              {(watch('type') === MeetingType.Online || watch('type') === MeetingType.Hybrid) && (
                <div>
                  <Label htmlFor="meetingLink">
                    {watch('type') === MeetingType.Online ? 'Video Conference Link' : 'Online Meeting Link (Optional)'}
                  </Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="meetingLink"
                      {...register('meetingLink')}
                      placeholder="https://zoom.us/j/... (Optional - embedded video will be available)"
                      className="pl-10"
                    />
                  </div>
                  {errors.meetingLink && (
                    <p className="text-sm text-destructive mt-1">{errors.meetingLink.message}</p>
                  )}
                  
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded">
                    💡 <strong>Tip:</strong> Leave this empty to use the built-in video conferencing. 
                    Or add your Zoom/Teams link if you prefer external platforms.
                  </div>
                </div>
              )}

              {/* Help text based on meeting type */}
              <div className="text-sm text-muted-foreground">
                {watch('type') === MeetingType.Online && (
                  <p>🎥 This meeting will have built-in video conferencing. Attendees can join directly from the platform.</p>
                )}
                {watch('type') === MeetingType.InPerson && (
                  <p>🏢 This is a physical meeting. Please specify the exact location for attendees.</p>
                )}
                {watch('type') === MeetingType.Hybrid && (
                  <p>🔗 This meeting supports both in-person and online attendees. Provide both location and video access.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Attendees & Agenda */}
        <div className="space-y-6">
          {/* Attendees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Attendees ({selectedAttendees.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Attendees */}
              {selectedUsers.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Attendees</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <Badge
                        key={user.id}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="text-xs">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.name}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => toggleAttendee(user.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Users */}
              <div className="space-y-2">
                <Label>Add Attendees</Label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {users
                    .filter(user => !selectedAttendees.includes(user.id))
                    .map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => toggleAttendee(user.id)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <Button type="button" size="sm" variant="ghost">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agenda */}
          <Card>
            <CardHeader>
              <CardTitle>Agenda ({agenda.length} items)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Agenda Items */}
              {agenda.length > 0 && (
                <div className="space-y-2">
                  {agenda.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                        {item.duration && (
                          <p className="text-xs text-muted-foreground">{item.duration} minutes</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeAgendaItem(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Separator />
                </div>
              )}

              {/* Add New Agenda Item */}
              <div className="space-y-3">
                <Label>Add Agenda Item</Label>
                <Input
                  placeholder="Agenda item title"
                  value={newAgendaItem.title}
                  onChange={(e) => setNewAgendaItem(prev => ({ ...prev, title: e.target.value }))}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newAgendaItem.description}
                  onChange={(e) => setNewAgendaItem(prev => ({ ...prev, description: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Duration (min)"
                    value={newAgendaItem.duration}
                    onChange={(e) => setNewAgendaItem(prev => ({ ...prev, duration: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addAgendaItem}
                    disabled={!newAgendaItem.title.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEditing ? 'Update Meeting' : 'Schedule Meeting'}
        </Button>
      </div>
    </form>
  );
}