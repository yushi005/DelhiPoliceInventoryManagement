// Shared full-detail view for a single submission.
// Reused by the Officer and Admin dashboards. It is read-only: it renders every
// field on the submission object plus a derived status timeline. It deliberately
// contains NO approve/reject controls — those belong to the superadmin only.

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const StatusBadge = ({ status }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
    {status}
  </span>
);

const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
};

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleString();
};

// Build a simple timeline of status changes from the fields the submission
// already carries (no separate audit-log table exists in the backend).
const buildTimeline = (s) => {
  const events = [];
  if (s.created_at) {
    events.push({ when: s.created_at, label: 'Submitted', detail: 'Entry created · pending review' });
  }
  if (s.status_changed_at && s.status !== 'pending') {
    if (s.status === 'approved') {
      events.push({
        when: s.status_changed_at,
        label: 'Approved',
        detail: s.approved_by ? `Reviewed by user #${s.approved_by}` : 'Approved by reviewer',
      });
    } else if (s.status === 'rejected') {
      events.push({
        when: s.status_changed_at,
        label: 'Rejected',
        detail: s.rejection_reason
          ? `Reason: ${s.rejection_reason}`
          : (s.rejected_by ? `Reviewed by user #${s.rejected_by}` : 'Rejected by reviewer'),
      });
    }
  }
  return events;
};

const Field = ({ label, children }) => (
  <div>
    <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
    <dd className="text-sm text-gray-800 mt-0.5 break-words">{children}</dd>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <h4 className="text-sm font-semibold text-[#0d1b4b] border-b border-gray-100 pb-1 mb-3">{title}</h4>
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</dl>
  </div>
);

export default function SubmissionDetailModal({ submission, onClose }) {
  if (!submission) return null;
  const s = submission;
  const timeline = buildTimeline(s);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-10"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-[#0d1b4b]">{s.app_name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Submission #{s.id} · {fmtDate(s.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={s.status} />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {/* Rejection reason — prominent red box */}
          {s.status === 'rejected' && s.rejection_reason && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Rejection Reason</p>
              <p className="text-sm text-red-800 mt-1">{s.rejection_reason}</p>
            </div>
          )}

          <Section title="Application Details">
            <Field label="App Name">{fmt(s.app_name)}</Field>
            <Field label="App Type"><span className="capitalize">{fmt(s.app_type)}</span></Field>
            <Field label="Vendor Name">{fmt(s.vendor_name)}</Field>
            <Field label="Version">{fmt(s.version)}</Field>
            <Field label="District">{fmt(s.district_name)}</Field>
            <Field label="Unit">{fmt(s.unit_name)}</Field>
            <div className="col-span-2"><Field label="Purpose">{fmt(s.purpose)}</Field></div>
          </Section>

          <Section title="Deployment Details">
            <Field label="Storage Location">{fmt(s.storage_location)}</Field>
            <Field label="Number of Users">{fmt(s.num_users)}</Field>
            <Field label="Custodian Name">{fmt(s.custodian_name)}</Field>
            <Field label="Custodian Badge ID">{fmt(s.custodian_badge_id)}</Field>
            <div className="col-span-2"><Field label="Device Config">{fmt(s.device_config)}</Field></div>
          </Section>

          <Section title="Server / Hosting">
            <Field label="Server Type"><span className="capitalize">{fmt(s.server_type)}</span></Field>
            <Field label="Provider">{fmt(s.server_provider)}</Field>
            <Field label="Capacity">{fmt(s.server_capacity)}</Field>
            <Field label="Physical Location">{fmt(s.physical_location)}</Field>
          </Section>

          <Section title="Data Classification">
            <Field label="Data Type"><span className="capitalize">{fmt(s.data_type)}</span></Field>
            <Field label="Status"><StatusBadge status={s.status} /></Field>
            <div className="col-span-2"><Field label="Justification">{fmt(s.data_justification)}</Field></div>
          </Section>

          <Section title="Record">
            <Field label="Submission ID">{fmt(s.id)}</Field>
            <Field label="Submitted By (user id)">{fmt(s.user_id)}</Field>
            <Field label="Created At">{fmtDate(s.created_at)}</Field>
            <Field label="Last Updated">{fmtDate(s.updated_at)}</Field>
            <Field label="Status Changed At">{fmtDate(s.status_changed_at)}</Field>
            <Field label="Reviewed By">
              {s.approved_by ? `Approved by #${s.approved_by}` : s.rejected_by ? `Rejected by #${s.rejected_by}` : '—'}
            </Field>
          </Section>

          {/* Status change timeline */}
          {timeline.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#0d1b4b] border-b border-gray-100 pb-1 mb-3">Status Timeline</h4>
              <ol className="relative border-l border-gray-200 ml-2 space-y-4">
                {timeline.map((e, i) => (
                  <li key={i} className="ml-4">
                    <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-[#0d1b4b]" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{e.label}</span>
                      <span className="text-xs text-gray-400">{fmtDate(e.when)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{e.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="border border-gray-300 px-5 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
