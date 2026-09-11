import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Shield, Mail, MoreVertical, CheckCircle2, XCircle, Lock, Edit3, Loader2, X, UserCheck } from 'lucide-react'
import {
  listStaffMembers,
  createStaffMember,
  updateStaffMember,
  deactivateStaffMember,
  listRoles,
  type StaffMember,
} from '../services/api'

const BUILT_IN_ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-100 text-red-700' },
  { value: 'manager', label: 'Manager', color: 'bg-blue-100 text-blue-700' },
  { value: 'employee', label: 'Employee', color: 'bg-green-100 text-green-700' },
]

function RoleBadge({ role, customRoleId, roles }: { role: string; customRoleId: number | null; roles: any[] }) {
  if (customRoleId) {
    const custom = roles.find(r => r.id === customRoleId)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
        <Shield className="h-3 w-3" />
        {custom?.name ?? 'Custom'}
      </span>
    )
  }
  const found = BUILT_IN_ROLES.find(r => r.value === role)
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${found?.color ?? 'bg-gray-100 text-gray-700'}`}>
      {found?.label ?? role}
    </span>
  )
}

type FormData = {
  name: string
  email: string
  password: string
  role: string
  customRoleId: number | null
}

const defaultForm: FormData = { name: '', email: '', password: '', role: 'employee', customRoleId: null }

export default function StaffPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [formError, setFormError] = useState('')
  const [actionMenu, setActionMenu] = useState<number | null>(null)

  const { data: staffData, isLoading } = useQuery({ queryKey: ['staff'], queryFn: listStaffMembers })
  const { data: rolesData } = useQuery({ queryKey: ['roles'], queryFn: listRoles })

  const allRoles = rolesData?.roles ?? []
  const customRoles = allRoles.filter(r => !r.isSystem)

  const createMut = useMutation({
    mutationFn: (d: FormData) => createStaffMember({ name: d.name, email: d.email, password: d.password, role: d.role, customRoleId: d.customRoleId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); closeModal() },
    onError: (e: any) => setFormError(e.message ?? 'Failed to create staff member'),
  })

  const updateMut = useMutation({
    mutationFn: (d: FormData) => updateStaffMember(editTarget!.id, {
      name: d.name, role: d.role, customRoleId: d.customRoleId,
      ...(d.password ? { password: d.password } : {}),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); closeModal() },
    onError: (e: any) => setFormError(e.message ?? 'Failed to update staff member'),
  })

  const toggleStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateStaffMember(id, { status: status === 'active' ? 'inactive' : 'active' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); setActionMenu(null) },
  })

  const deactivateMut = useMutation({
    mutationFn: (id: number) => deactivateStaffMember(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); setActionMenu(null) },
  })

  function openCreate() {
    setEditTarget(null)
    setForm(defaultForm)
    setFormError('')
    setShowModal(true)
  }

  function openEdit(member: StaffMember) {
    setEditTarget(member)
    setForm({ name: member.name, email: member.email, password: '', role: member.role, customRoleId: member.customRoleId })
    setFormError('')
    setShowModal(true)
    setActionMenu(null)
  }

  function closeModal() {
    setShowModal(false)
    setEditTarget(null)
    setForm(defaultForm)
    setFormError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    if (!editTarget && !form.email.trim()) { setFormError('Email is required.'); return }
    if (!editTarget && form.password.length < 6) { setFormError('Password must be at least 6 characters.'); return }
    if (editTarget) updateMut.mutate(form)
    else createMut.mutate(form)
  }

  const staff = staffData?.staff ?? []
  const isMutating = createMut.isPending || updateMut.isPending

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--charcoal)]">Staff Members</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Manage your team — create accounts, assign roles, activate or deactivate.</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-[var(--burgundy)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--burgundy-dark)]"
          >
            <UserPlus className="h-4 w-4" />
            Add Staff
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <UserCheck className="h-10 w-10 text-[var(--muted)]" />
              <p className="text-[var(--muted)]">No staff members yet. Add your first team member.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--line)] bg-[var(--bg)]">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-[var(--muted)] rounded-tl-xl">Name</th>
                  <th className="px-5 py-3 text-left font-semibold text-[var(--muted)]">Email</th>
                  <th className="px-5 py-3 text-left font-semibold text-[var(--muted)]">Role</th>
                  <th className="px-5 py-3 text-left font-semibold text-[var(--muted)]">Status</th>
                  <th className="px-5 py-3 text-left font-semibold text-[var(--muted)]">Last Login</th>
                  <th className="px-5 py-3 text-right font-semibold text-[var(--muted)] rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {staff.map((member, idx) => {
                  const isNearBottom = idx >= staff.length - 2 && staff.length > 2
                  return (
                    <tr key={member.id} className="transition-colors hover:bg-[var(--bg)]">
                      <td className="px-5 py-3.5 font-medium text-[var(--charcoal)]">{member.name}</td>
                      <td className="px-5 py-3.5 text-[var(--muted)]">
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {member.email}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <RoleBadge role={member.role} customRoleId={member.customRoleId} roles={allRoles} />
                      </td>
                      <td className="px-5 py-3.5">
                        {member.status === 'active' ? (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400 font-medium">
                            <XCircle className="h-3.5 w-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--muted)] text-xs">
                        {member.lastLoginAt
                          ? new Date(member.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Never'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setActionMenu(actionMenu === member.id ? null : member.id)}
                            className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--bg)] hover:text-[var(--charcoal)]"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {actionMenu === member.id && (
                            <div className={`absolute right-0 z-30 min-w-[160px] overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-xl ${isNearBottom ? 'bottom-full mb-1' : 'top-8'}`}>
                              <button
                                onClick={() => openEdit(member)}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--charcoal)] hover:bg-gray-50"
                              >
                                <Edit3 className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => toggleStatusMut.mutate({ id: member.id, status: member.status })}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--charcoal)] hover:bg-gray-50"
                              >
                                {member.status === 'active'
                                  ? <><XCircle className="h-3.5 w-3.5 text-red-500" /> Deactivate</>
                                  : <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Activate</>
                                }
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-[var(--charcoal)]">
                {editTarget ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--charcoal)]">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Priya Kumar"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--burgundy)] focus:ring-2 focus:ring-[var(--burgundy)]/20"
                  required
                />
              </div>

              {!editTarget && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--charcoal)]">Email Address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="priya@a1tex.com"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--burgundy)] focus:ring-2 focus:ring-[var(--burgundy)]/20"
                    required
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--charcoal)]">
                  {editTarget ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={editTarget ? '••••••••' : 'Minimum 6 characters'}
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[var(--burgundy)] focus:ring-2 focus:ring-[var(--burgundy)]/20"
                    required={!editTarget}
                    minLength={editTarget ? undefined : 6}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--charcoal)]">Role *</label>
                <select
                  value={form.customRoleId ? `custom_${form.customRoleId}` : form.role}
                  onChange={e => {
                    const val = e.target.value
                    if (val.startsWith('custom_')) {
                      setForm(f => ({ ...f, customRoleId: Number(val.replace('custom_', '')), role: 'employee' }))
                    } else {
                      setForm(f => ({ ...f, role: val, customRoleId: null }))
                    }
                  }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--burgundy)] focus:ring-2 focus:ring-[var(--burgundy)]/20"
                >
                  <optgroup label="Built-in Roles">
                    {BUILT_IN_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </optgroup>
                  {customRoles.length > 0 && (
                    <optgroup label="Custom Roles">
                      {customRoles.map(r => (
                        <option key={r.id} value={`custom_${r.id}`}>{r.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="mt-1.5 text-xs text-[var(--muted)]">
                  Default: <strong>Employee</strong> — can see only their assigned orders.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-[var(--charcoal)] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMutating}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--burgundy)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editTarget ? 'Save Changes' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close action menu on outside click */}
      {actionMenu !== null && (
        <div className="fixed inset-0 z-0" onClick={() => setActionMenu(null)} />
      )}
    </div>
  )
}
