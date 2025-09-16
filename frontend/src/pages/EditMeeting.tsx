import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MeetingForm } from '@/components/meetings/MeetingForm';
import { meetingsApi, Meeting } from '@/lib/api/meetings';
import { toast } from 'sonner';

export default function EditMeeting() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  // Load meeting
  useEffect(() => {
    const loadMeeting = async () => {
      if (!id) {
        navigate('/meetings');
        return;
      }
      
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

    loadMeeting();
  }, [id, navigate]);

  const handleSubmit = (meeting: Meeting) => {
    navigate(`/meetings/${meeting.id}`);
  };

  const handleCancel = () => {
    navigate(`/meetings/${id}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded" />
          ))}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/meetings/${id}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Meeting
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Meeting</h1>
          <p className="text-muted-foreground">
            Update meeting details, agenda, and attendees
          </p>
        </div>
      </div>

      {/* Meeting Form */}
      <MeetingForm
        meeting={meeting}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEditing={true}
      />
    </div>
  );
}