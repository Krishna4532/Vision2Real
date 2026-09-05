/**
 * Vision2Real – Build & Sprint Request Confirmation Component (Stage 6.7)
 * Displays confirmation timeline, generated Request ID (V2R-BLD-XXXX or V2R-SPR-XXXX),
 * entrance to Founder Workspace, and instant "Submit Another Request" reset button.
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useBuildContext } from '../context/BuildContext';

interface BuildConfirmationProps {
  onReset?: () => void;
}

export function BuildConfirmation({ onReset }: BuildConfirmationProps) {
  const {
    buildRequest,
    createdBuildRequestId,
    createdSprintId,
    selectedPath,
    resetBuildRequest,
    resetSprintRequest,
  } = useBuildContext();
  const navigate = useNavigate();

  const isSprint = buildRequest.journeyPath === 'reality_sprint' || selectedPath === 'reality_sprint';
  const activeCreatedId = isSprint ? createdSprintId : createdBuildRequestId;
  const defaultPrefix = isSprint ? 'V2R-SPR' : 'V2R-BLD';
  const requestId = activeCreatedId || buildRequest.id || `${defaultPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  const destinationPath = isSprint ? '/founder/reality-sprints' : '/founder/build-requests';

  const steps = [
    isSprint
      ? 'Your Reality Sprint Request has been received successfully.'
      : 'Your Build Request has been received successfully.',
    isSprint ? 'Our team will review your MVP validation scope.' : 'Our team will review your product vision.',
    "We'll analyze the scope and requirements.",
    "We'll prepare the best execution approach.",
    "We'll contact you shortly to discuss the next steps.",
    'Your request is now available in your Founder Workspace.',
  ];

  const handleReset = () => {
    if (isSprint) {
      resetSprintRequest();
    } else {
      resetBuildRequest();
    }
    if (onReset) {
      onReset();
    }
  };

  return (
    <div className="v2r-confirmation-section" id="build-confirmation">
      <div className="v2r-confirm-id-badge">
        <span>{isSprint ? 'Sprint Request ID' : 'Build Request ID'}: {requestId}</span>
      </div>

      <h2 className="v2r-auth-handoff__title">
        {isSprint ? 'Reality Sprint Request Submitted' : 'Build Request Submitted'}
      </h2>
      <p className="v2r-auth-handoff__subtitle">
        Thank you for trusting Vision2Real with your vision. Your request has been attached directly to your Founder Workspace account.
      </p>

      <div className="v2r-confirm-timeline" role="region" aria-label="Request next steps">
        {steps.map((text, idx) => (
          <div key={idx} className="v2r-confirm-step">
            <span className="v2r-confirm-step__num">{idx + 1}</span>
            <span className="v2r-confirm-step__text">{text}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'var(--space-2xl)', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button variant="primary" size="lg" onClick={() => navigate(destinationPath)}>
          <span>Go to Founder Workspace</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Button>
        <Button variant="secondary" size="lg" onClick={handleReset}>
          <span>{isSprint ? 'Submit Another Reality Sprint' : 'Submit Another Build Request'}</span>
        </Button>
      </div>
    </div>
  );
}
