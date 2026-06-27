import { useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";

export default function InvitePreviewPage() {
  const { code } = useParams();

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">Invite Preview</h1>
        <p className="mt-3 text-sm text-slate-400">
          Invite code: <span className="text-slate-200">{code}</span>
        </p>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-sm text-slate-300">
            This page is wired up, but the full invite preview UI has not been built yet.
          </p>
        </div>
      </div>
    </AppShell>
  );
} 