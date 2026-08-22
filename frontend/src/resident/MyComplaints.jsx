import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import ComplaintCard from "../components/ComplaintCard.jsx";
import { PageHeader, QuickAction } from "../components/ui/PageHeader.jsx";
import { PageLoader } from "../components/ui/LoadingState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { api, getErrorMessage } from "../services/api.js";

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/complaints/my")
      .then((res) => setComplaints(res.data.data.complaints))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout role="resident">
      <PageHeader
        title="My Complaints"
        subtitle="Track the status of your maintenance requests."
        action={<QuickAction to="/resident/complaints/new" icon={PlusCircle} label="Report Issue" variant="primary" />}
      />

      {loading ? (
        <PageLoader message="Loading your complaints..." />
      ) : error ? (
        <EmptyState title="Unable to load complaints" description={error} />
      ) : complaints.length === 0 ? (
        <EmptyState
          title="No complaints yet"
          description="You haven't reported any maintenance issues."
          actionLabel="Report an Issue"
          actionTo="/resident/complaints/new"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {complaints.map((c) => (
            <ComplaintCard key={c._id} complaint={c} basePath="/resident/complaints" />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
