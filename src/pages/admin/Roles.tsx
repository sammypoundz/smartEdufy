import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import api from "../../services/api";
import { getErrorMessage, unwrap } from "../../hooks/queryHelpers";
import { ALL_PRIVILEGES } from "../../utils/privileges";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ShieldCheckIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

interface RoleDef {
  id: string;
  name: string;
  label?: string | null;
  description?: string | null;
  isSystem: boolean;
  privileges: string[];
}

const GROUPS = [...new Set(ALL_PRIVILEGES.map((p) => p.group))];

export default function AdminRoles() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RoleDef | null>(null);
  const [form, setForm] = useState({
    name: "",
    label: "",
    description: "",
    privileges: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const canManage = [user?.role, ...(user?.roles || [])]
    .filter(Boolean)
    .includes("ADMIN");

  const {
    data: roles = [],
    isLoading: loading,
  } = useQuery<RoleDef[]>({
    queryKey: ["roles"],
    queryFn: () =>
      unwrap(api.get<RoleDef[]>("/roles")).then((d) =>
        Array.isArray(d) ? d : [],
      ),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: Record<string, unknown> }) =>
      id
        ? api.put(`/roles/${id}`, payload)
        : api.post("/roles", payload),
    onSuccess: (_data, vars) => {
      toast.success(vars.id ? "Role updated" : "Role created");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setShowModal(false);
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Save failed")),
    onSettled: () => setSaving(false),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      toast.success("Role deleted");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Delete failed")),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", label: "", description: "", privileges: [] });
    setShowModal(true);
  };

  const openEdit = (role: RoleDef) => {
    setEditing(role);
    setForm({
      name: role.name,
      label: role.label || "",
      description: role.description || "",
      privileges: role.privileges || [],
    });
    setShowModal(true);
  };

  const togglePrivilege = (key: string) => {
    setForm((prev) => ({
      ...prev,
      privileges: prev.privileges.includes(key)
        ? prev.privileges.filter((p) => p !== key)
        : [...prev.privileges, key],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Role name is required");
      return;
    }
    setSaving(true);
    saveMutation.mutate({
      id: editing?.id,
      payload: {
        name: form.name.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
        label: form.label || undefined,
        description: form.description || undefined,
        privileges: form.privileges,
      },
    });
  };

  const handleDelete = async (role: RoleDef) => {
    if (role.isSystem) {
      toast.error("System roles cannot be deleted");
      return;
    }
    if (!confirm(`Delete role "${role.label || role.name}"?`)) return;
    deleteMutation.mutate(role.id);
  };

  const card =
    theme === "dark"
      ? "bg-white/5 backdrop-blur-xl border border-white/10"
      : "bg-white/80 backdrop-blur-xl border border-gray-200/60 shadow-lg";

  return (
    <div
      className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${
        theme === "dark"
          ? "bg-[#0B1120]"
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
      }`}
    >
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className={`rounded-2xl p-6 mb-8 ${card}`}>
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h2
                className={`text-2xl font-bold ${
                  theme === "dark"
                    ? "bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent"
                }`}
              >
                Roles &amp; Privileges
              </h2>
              <p
                className={`mt-1 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
              >
                Create custom roles and control exactly which pages each role
                can access. Users can hold multiple roles and get the combined
                privileges.
              </p>
            </div>
            {canManage && (
              <button
                onClick={openAdd}
                className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-shadow duration-200"
              >
                <PlusIcon className="h-5 w-5 mr-2" /> Add Role
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {roles.map((role) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-5 ${card}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon
                      className={`h-6 w-6 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}
                    />
                    <div>
                      <h3
                        className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                      >
                        {role.label || role.name}
                      </h3>
                      <p
                        className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}
                      >
                        {role.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canManage && (
                      <button
                        onClick={() => openEdit(role)}
                        className={`p-1.5 rounded-full ${theme === "dark" ? "text-blue-400 hover:bg-white/10" : "text-blue-600 hover:bg-blue-50"}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                    {canManage && !role.isSystem && (
                      <button
                        onClick={() => handleDelete(role)}
                        className={`p-1.5 rounded-full ${theme === "dark" ? "text-red-400 hover:bg-white/10" : "text-red-600 hover:bg-red-50"}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {role.isSystem && (
                  <span
                    className={`mt-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                      theme === "dark"
                        ? "bg-gray-500/20 text-gray-300 border-gray-600"
                        : "bg-gray-100 text-gray-600 border-gray-300"
                    }`}
                  >
                    <LockClosedIcon className="h-3 w-3" /> System role
                  </span>
                )}
                {role.description && (
                  <p
                    className={`mt-2 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                  >
                    {role.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1">
                  {role.privileges.length === 0 ? (
                    <span
                      className={`text-xs italic ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                    >
                      No privileges assigned
                    </span>
                  ) : (
                    role.privileges.map((key) => {
                      const priv = ALL_PRIVILEGES.find((p) => p.key === key);
                      return (
                        <span
                          key={key}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            theme === "dark"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {priv?.label || key}
                        </span>
                      );
                    })
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 10 }}
              className={`relative w-full h-full flex flex-col overflow-hidden ${
                theme === "dark" ? "bg-gray-900" : "bg-white"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky header */}
              <div
                className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
                  theme === "dark"
                    ? "bg-gray-900 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <h2
                  className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                >
                  {editing ? "Edit Role" : "Add Role"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-full ${theme === "dark" ? "text-gray-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Scrollable body: details on left, privileges on right */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start">
                  {/* Left: role details */}
                  <div className="w-full lg:w-80 shrink-0 space-y-4">
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Role Name (key) *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        disabled={editing?.isSystem}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          theme === "dark"
                            ? "bg-gray-800 border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                        placeholder="e.g. EXAM_OFFICER"
                      />
                      <p
                        className={`mt-1 text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                      >
                        UPPERCASE with underscores.
                      </p>
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={form.label}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            label: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          theme === "dark"
                            ? "bg-gray-800 border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                        placeholder="e.g. Exam Officer"
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={form.description}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none ${
                          theme === "dark"
                            ? "bg-gray-800 border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                        placeholder="What does this role do?"
                      />
                    </div>

                    {/* Selection summary */}
                    <div
                      className={`rounded-lg p-3 ${theme === "dark" ? "bg-blue-500/10" : "bg-blue-50"}`}
                    >
                      <p
                        className={`text-sm font-semibold ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}
                      >
                        {form.privileges.length} privilege
                        {form.privileges.length === 1 ? "" : "s"} selected
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, privileges: [] }))
                        }
                        className="mt-1 text-xs text-blue-600 hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>

                  {/* Right: privileges */}
                  <div className="flex-1 min-w-0">
                    <label
                      className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Privileges
                    </label>
                    <p
                      className={`text-xs mb-3 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}
                    >
                      Users holding this role can access the pages checked here.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 items-start">
                      {GROUPS.map((group) => (
                        <div
                          key={group}
                          className={`rounded-lg p-3 ${theme === "dark" ? "bg-gray-800/50" : "bg-gray-50"}`}
                        >
                          <h4
                            className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                          >
                            {group}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 mt-2">
                            {ALL_PRIVILEGES.filter(
                              (p) => p.group === group,
                            ).map((priv) => (
                              <label
                                key={priv.key}
                                className="flex items-center gap-2 text-sm cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.privileges.includes(priv.key)}
                                  onChange={() => togglePrivilege(priv.key)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span
                                  className={
                                    theme === "dark"
                                      ? "text-gray-200"
                                      : "text-gray-700"
                                  }
                                >
                                  {priv.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed footer */}
              <div
                className={`flex justify-end gap-3 px-6 py-4 border-t shrink-0 ${
                  theme === "dark"
                    ? "bg-gray-900 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 border rounded-lg transition-colors ${
                    theme === "dark"
                      ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {saving && (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {editing ? "Update" : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
