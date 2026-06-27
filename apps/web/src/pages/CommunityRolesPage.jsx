import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import RoleManager from "../components/roles/RoleManager";

export default function CommunityRolesPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Role Management</h1>
            <p className="mt-2 text-sm text-slate-400">
              Create, assign, and remove community roles.
            </p>
          </div>

          <button
            onClick={() => navigate(`/communities/${slug}`)}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Back to Community
          </button>
        </div>

        <RoleManager slug={slug} />
      </div>
    </AppShell>
  );
} 