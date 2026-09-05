/**
 * Vision2Real – DataPrivacySection Component (Stage 6.5)
 * Download account data JSON export & privacy controls.
 */

import { memo, useState } from 'react';

interface DataPrivacySectionProps {
  onExportData: () => Promise<void>;
}

export const DataPrivacySection = memo(function DataPrivacySection({
  onExportData,
}: DataPrivacySectionProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExportData();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="v2r-settings-section">
      <div className="v2r-settings-section__header">
        <div>
          <h2 className="v2r-settings-section__title">Data Export & Privacy</h2>
          <p className="v2r-settings-section__desc">
            Download your founder data archive or inspect privacy configurations.
          </p>
        </div>
      </div>

      <div className="v2r-settings-export-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="v2r-settings-export-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <div>
            <strong style={{ color: '#fff', fontSize: 15, display: 'block' }}>Account Data Export (JSON)</strong>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: '2px 0 0 0' }}>
              Includes your complete profile details, preferences, validation reports count, sprint requests, build requests, and notification activity.
            </p>
          </div>
        </div>

        <button
          className="v2r-settings-primary-btn"
          onClick={handleExport}
          disabled={isExporting}
          style={{ alignSelf: 'flex-start' }}
        >
          {isExporting ? 'Generating JSON Archive…' : '📥 Download Account Data (.json)'}
        </button>
      </div>
    </div>
  );
});
