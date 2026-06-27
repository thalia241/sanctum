import { useEffect, useState } from "react";
import {
  assignRole,
  createRole,
  listMemberRoles,
  listRoles,
  unassignRole,
} from "../../api/roles";

function RoleCard({ role }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{role.name}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {role.isPaidRole ? "Paid role" : "Standard role"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RoleManager({ slug }) {
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [createForm, setCreateForm] = useState({
    name: "",
    isPaidRole: false,
  });

  const [assignForm, setAssignForm] = useState({
    targetUserId: "",
    roleId: "",
  });

  const [memberLookupUserId, setMemberLookupUserId] = useState("");
  const [memberRoles, setMemberRoles] = useState([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [working, setWorking] = useState(false);

  async function loadRoles() {
    try {
      setLoadingRoles(true);
      setError("");

      const data = await listRoles(slug);
      setRoles(data.roles || []);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          "Failed to load roles"
      );
    } finally {
      setLoadingRoles(false);
    }
  }

  useEffect(() => {
    loadRoles();
  }, [slug]);

  function updateCreateForm(e) {
    const { name, value, type, checked } = e.target;
    setCreateForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function updateAssignForm(e) {
    const { name, value } = e.target;
    setAssignForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleCreateRole(e) {
    e.preventDefault();

    if (!createForm.name.trim()) {
      setError("Role name is required.");
      return;
    }

    try {
      setWorking(true);
      setError("");
      setSuccess("");

      const data = await createRole(slug, {
        name: createForm.name.trim(),
        isPaidRole: createForm.isPaidRole,
      });

      const role = data.role || data;
      setRoles((prev) => [...prev, role]);
      setCreateForm({
        name: "",
        isPaidRole: false,
      });
      setSuccess("Role created successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          "Failed to create role"
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleAssignRole(e) {
    e.preventDefault();

    if (!assignForm.targetUserId.trim() || !assignForm.roleId) {
      setError("Target user ID and role are required.");
      return;
    }

    try {
      setWorking(true);
      setError("");
      setSuccess("");

      await assignRole(slug, {
        targetUserId: assignForm.targetUserId.trim(),
        roleId: assignForm.roleId,
      });

      setSuccess("Role assigned successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          "Failed to assign role"
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleLookupMemberRoles() {
    if (!memberLookupUserId.trim()) {
      setError("Enter a user ID to look up roles.");
      return;
    }

    try {
      setWorking(true);
      setError("");
      setSuccess("");

      const data = await listMemberRoles(slug, memberLookupUserId.trim());
      setMemberRoles(data.roles || []);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          "Failed to load member roles"
      );
      setMemberRoles([]);
    } finally {
      setWorking(false);
    }
  }

  async function handleUnassignRole(roleId) {
    if (!memberLookupUserId.trim()) {
      setError("Lookup a user before unassigning roles.");
      return;
    }

    try {
      setWorking(true);
      setError("");
      setSuccess("");

      await unassignRole(slug, {
        targetUserId: memberLookupUserId.trim(),
        roleId,
      });

      setMemberRoles((prev) => prev.filter((role) => role._id !== roleId));
      setSuccess("Role removed successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          "Failed to remove role"
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-green-800 bg-green-950 px-3 py-2 text-sm text-green-200">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-semibold">Create Role</h2>

          <form onSubmit={handleCreateRole} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Role Name</label>
              <input
                name="name"
                value={createForm.name}
                onChange={updateCreateForm}
                placeholder="Premium"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <input
                type="checkbox"
                name="isPaidRole"
                checked={createForm.isPaidRole}
                onChange={updateCreateForm}
              />
              <div>
                <div className="text-sm font-medium text-slate-100">
                  Paid role
                </div>
                <div className="text-xs text-slate-400">
                  Mark this role as intended for paid access tiers.
                </div>
              </div>
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={working}
                className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
              >
                {working ? "Creating..." : "Create Role"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-semibold">Assign Role</h2>

          <form onSubmit={handleAssignRole} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Target User ID</label>
              <input
                name="targetUserId"
                value={assignForm.targetUserId}
                onChange={updateAssignForm}
                placeholder="Paste member user ID"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Role</label>
              <select
                name="roleId"
                value={assignForm.roleId}
                onChange={updateAssignForm}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={working}
                className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
              >
                {working ? "Assigning..." : "Assign Role"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Existing Roles</h2>
          <button
            onClick={loadRoles}
            disabled={loadingRoles}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loadingRoles ? (
          <p className="text-sm text-slate-400">Loading roles...</p>
        ) : roles.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
            No roles created yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => (
              <RoleCard key={role._id} role={role} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-xl font-semibold">Member Role Lookup</h2>

        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <input
            value={memberLookupUserId}
            onChange={(e) => setMemberLookupUserId(e.target.value)}
            placeholder="Enter a member user ID"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
          />

          <button
            onClick={handleLookupMemberRoles}
            disabled={working}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {working ? "Loading..." : "Lookup Roles"}
          </button>
        </div>

        {memberRoles.length === 0 ? (
          <p className="text-sm text-slate-400">No roles loaded for this member yet.</p>
        ) : (
          <div className="space-y-3">
            {memberRoles.map((role) => (
              <div
                key={role._id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-100">{role.name}</div>
                  <div className="text-xs text-slate-500">
                    {role.isPaidRole ? "Paid role" : "Standard role"}
                  </div>
                </div>

                <button
                  onClick={() => handleUnassignRole(role._id)}
                  disabled={working}
                  className="rounded-lg border border-red-800 px-3 py-1 text-xs text-red-300 hover:bg-red-950 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 