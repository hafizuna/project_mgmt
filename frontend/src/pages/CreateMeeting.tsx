import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MeetingForm } from '@/components/meetings/MeetingForm';
import { Meeting } from '@/lib/api/meetings';
import { useNavigate } from 'react-router-dom';

export default function CreateMeeting() {
  const navigate = useNavigate();

  const handleSubmit = (meeting: Meeting) => {
    navigate(`/meetings/${meeting.id}`);
  };

  const handleCancel = () => {
    navigate('/meetings');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <h1 className="text-3xl font-bold text-foreground">Schedule New Meeting</h1>
          <p className="text-muted-foreground">
            Create a new meeting with attendees, agenda, and action items
          </p>
        </div>
      </div>

      {/* Meeting Form */}
      <MeetingForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEditing={false}
      />
    </div>
  );
}