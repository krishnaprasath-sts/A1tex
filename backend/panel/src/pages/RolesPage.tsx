import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Plus, Trash2, Edit3, Lock, X, Loader2, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react'
import { listRoles, createRole, updateRole, deleteRole, type RoleItem } from '../services/api'

const PERMISSION_GROUPS = [
  {
    label: 'Orders',
    permissions: [
      { key: 'view_orders', label: 'View All Orders' },
      { key: 'assign_orders', label: 'Assign Orders to Staff' },
      { key: 'pack_orders', label: 'Mark Orders as Packed' },
      { key: 'transition_orders', label: 'Transition Order Stages' },
      { key: 'view_my_orders', label: 'View My Assigned Orders' },
    ],
  },
  {
    label: 'Reports & Dashboard',
    permissions: [
      { key: 'view_dashboard', label: 'View Dashboard' },
      { key: 'view_reports', label: 'View Sales Reports' },
    ],
  },
  {
    label: 'Catalog',
    permissions: [
      { key: 'manage_products', label: 'Manage Products & Variants' },
      { key: 'manage_stock', label: 'Manage Stock Quantities' },
    ],
  },
  {
    label: 'Customers & Staff',
    permissions: [
      { key: 'manage_customers', label: 'Manage Customers' },
      { key: 'manage_staff', label: 'Manage Staff Accounts' },
      { key: 'manage_roles', label: 'Manage Roles & Permissions' },
    ],
  },
  {
    label: 'Finance',
    permissions: [
      { key: 'manage_coupons', label: 'Manage Coupons & Discounts' },
      { key: 'manage_invoices', label: 'Manage Invoices' },
    ],
  },
  {
    label: 'System',
    permissions: [
      { key: 'manage_settings', label: 'Manage App Settings' },
      { key: 'manage_email_campaigns', label: 'Manage Email Campaigns' },
    ],
  },
]

type FormData = { name: string; description: string; permissions: string[] }
const defaultForm: FormData = { name: '', description: '', permissions: [] }

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  employee: 'Employee',
}

function RoleCard({ role, onEdit, onDelete }: { role: RoleItem; onEdit: (r: RoleItem) => void; onDelete: (r: RoleItem) => void }) {
  const [expanded, setExpanded] = useState(false)
  const isSuperAdmin = role.name === 'super_admin'
  const canEdit = !isSuperAdmin
  const canDelete = !role.isSystem
  const displayName = ROLE_DISPLAY_NAMES[role.name] || role.name

  return (
    <div className={`rounded-xl border ${role.isSystem ? 'border-amber-200 bg-amber-50/30' : 'border-[var(--line)] bg-[var(--panel)]'} p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isSuperAdmin ? 'bg-red-100' : role.isSystem ? 'bg-amber-100' : 'bg-purple-100'}`}>
            {isSuperAdmin ? <Lock className="h-5 w-5 text-red-600" /> : role.isSystem ? <Lock className="h-5 w-5 text-amber-600" /> : <Shield className="h-5 w-5 text-purple-600" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--charcoal)]">{displayName}</h3>
              {role.isSystem && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isSuperAdmin ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isSuperAdmin ? 'Full Access' : 'System'}
                </span>
              )}
            </div>
            {role.description && <p className="mt-0.5 text-xs text-[var(--muted)]">{role.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={() => onEdit(role)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="Edit Permissions">
              <Edit3 className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(role)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete Role">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-[var(--muted)]">{role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}</span>
        {role.permissions.length > 0 && (
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs text-[var(--burgundy)] font-medium">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {role.permissions.map(p => (
            <span key={p} className="rounded-md bg-[var(--bg)] px-2 py-1 text-[11px] font-medium text-[var(--muted)] border border-[var(--line)]">
              {p.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function PermissionCheckbox({ permKey, label, checked, onChange }: { permKey: string; label: string; checked: boolean; onChange: (k: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(permKey)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${checked ? 'bg-[var(--burgundy)]/5 text-[var(--burgundy)]' : 'text-[var(--charcoal)] hover:bg-gray-50'}`}
    >
      {checked ? <CheckSquare className="h-4 w-4 flex-shrink-0 text-[var(--burgundy)]" /> : <Square className="h-4 w-4 flex-shrink-0 text-gray-300" />}
      {label}
    </button>
  )
}

export default function RolesPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<RoleItem | null>(null)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<RoleItem | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['roles'], queryFn: listRoles })
  const roles = data?.roles ?? []
  const groupedPermissionKeys = PERMISSION_GROUPS.flatMap(group => group.permissions.map(permission => permission.key))
  const extraPermissions = (data?.allPermissions ?? [])
    .filter(permission => !groupedPermissionKeys.includes(permission))
    .map(permission => ({ key: permission, label: permission.replace(/_/g, ' ') }))
  const permissionGroups = extraPermissions.length > 0
    ? [...PERMISSION_GROUPS, { label: 'Other Permissions', permissions: extraPermissions }]
    : PERMISSION_GROUPS

  const createMut = useMutation({
    mutationFn: (d: FormData) => createRole({ name: d.name, description: d.description || undefined, permissions: d.permissions }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); closeModal() },
    onError: (e: any) => setFormError(e.message ?? 'Failed to create role'),
  })

  const updateMut = useMutation({
    mutationFn: (d: FormData) => updateRole(editTarget!.id, { name: d.name, description: d.description || undefined, permissions: d.permissions }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); closeModal() },
    onError: (e: any) => setFormError(e.message ?? 'Failed to update role'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setDeleteTarget(null) },
    onError: (e: any) => alert(e.message ?? 'Failed to delete role'),
  })

  function openCreate() {
    setEditTarget(null)
    setForm(defaultForm)
    setFormError('')
    setShowModal(true)
  }

  function openEdit(role: RoleItem) {
    setEditTarget(role)
    const displayName = ROLE_DISPLAY_NAMES[role.name] || role.name
    setForm({ name: displayName, description: role.description ?? '', permissions: [...role.permissions] })
    setFormError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditTarget(null)
    setForm(defaultForm)
    setFormError('')
  }

  function togglePerm(key: string) {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter(p => p !== key) : [...f.permissions, key],
    }))
  }

  function selectAllInGroup(keys: string[]) {
    setForm(f => {
      const allSelected = keys.every(k => f.permissions.includes(k))
      if (allSelected) return { ...f, permissions: f.permissions.filter(p => !keys.includes(p)) }
      const toAdd = keys.filter(k => !f.permissions.includes(k))
      return { ...f, permissions: [...f.permissions, ...toAdd] }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) { setFormError('Role name is required.'); return }
    if (editTarget) updateMut.mutate(form)
    else createMut.mutate(form)
  }

  const isMutating = createMut.isPending || updateMut.isPending

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--charcoal)]">Roles & Permissions</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Super Admin cannot be changed. Manager and Employee permissions can be customized.</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-[var(--burgundy)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--burgundy-dark)]"
          >
            <Plus className="h-4 w-4" />
            Create Role
          </button>
        </div>

        {/* Roles Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map(role => (
              <RoleCard key={role.id} role={role} onEdit={openEdit} onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-[var(--charcoal)]">
                {editTarget ? 'Edit Role' : 'Create Custom Role'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {formError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
              )}

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-[var(--charcoal)]">
                  Role Name * {editTarget?.isSystem && <span className="text-xs font-normal text-gray-400">(System role name cannot be changed)</span>}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  disabled={editTarget?.isSystem}
                  placeholder="e.g. Packer, Dispatcher, Inventory Manager"
                  className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none ${
                    editTarget?.isSystem
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                      : 'focus:border-[var(--burgundy)] focus:ring-2 focus:ring-[var(--burgundy)]/20'
                  }`}
                  required
                />
              </div>

              <div className="mb-5">
                <label className="mb-1.5 block text-sm font-medium text-[var(--charcoal)]">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Briefly describe what this role can do"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--burgundy)] focus:ring-2 focus:ring-[var(--burgundy)]/20"
                />
              </div>

              <div className="mb-5">
                <label className="mb-3 block text-sm font-medium text-[var(--charcoal)]">
                  Permissions ({form.permissions.length} selected)
                </label>
                <div className="space-y-4">
                  {permissionGroups.map(group => {
                    const groupKeys = group.permissions.map(p => p.key)
                    const allSelected = groupKeys.every(k => form.permissions.includes(k))
                    const someSelected = groupKeys.some(k => form.permissions.includes(k))
                    return (
                      <div key={group.label} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50">
                        <button
                          type="button"
                          onClick={() => selectAllInGroup(groupKeys)}
                          className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold text-[var(--charcoal)] hover:bg-gray-100/50"
                        >
                          <span>{group.label}</span>
                          <span className={`text-xs font-medium ${allSelected ? 'text-[var(--burgundy)]' : someSelected ? 'text-amber-600' : 'text-gray-400'}`}>
                            {allSelected ? 'All selected' : someSelected ? 'Some selected' : 'Select all'}
                          </span>
                        </button>
                        <div className="px-2 pb-2">
                          {group.permissions.map(p => (
                            <PermissionCheckbox
                              key={p.key}
                              permKey={p.key}
                              label={p.label}
                              checked={form.permissions.includes(p.key)}
                              onChange={togglePerm}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-[var(--charcoal)] hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={isMutating} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--burgundy)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70">
                  {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editTarget ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-[var(--charcoal)]">Delete Role?</h3>
            <p className="mb-5 text-sm text-[var(--muted)]">
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>? Staff assigned to this role will fall back to their built-in role.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => deleteMut.mutate(deleteTarget.id)}
                disabled={deleteMut.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
              >
                {deleteMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
