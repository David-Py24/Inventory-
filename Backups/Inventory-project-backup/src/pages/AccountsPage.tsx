import React, { useMemo, useState } from 'react';
import { LogOut, Pencil, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { UserAccount, UserRole, UserStatus } from '../types';

interface AccountsPageProps {
  users: UserAccount[];
  currentUser: UserAccount;
  onAddUser: (user: Omit<UserAccount, 'id' | 'createdAt' | 'lastActive'>) => void;
  onUpdateUser: (user: UserAccount) => void;
  onDeleteUser: (id: string) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

const ROLES: UserRole[] = ['Admin', 'Manager', 'Staff'];

export const AccountsPage: React.FC<AccountsPageProps> = ({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onOpenProfile,
  onLogout,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | UserRole>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Modal form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Staff');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<UserStatus>('Active');
  const [password, setPassword] = useState('');

  const summary = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'Admin').length;
    const active = users.filter((u) => u.status === 'Active').length;
    return { total, admins, active };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'All' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('Staff');
    setDepartment('Operations');
    setStatus('Active');
    setPassword('');
    setModalOpen(true);
  };

  const openEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setDepartment(user.department);
    setStatus(user.status);
    setPassword(user.password);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (editingUser) {
      onUpdateUser({
        ...editingUser,
        name: name.trim(),
        email: email.trim(),
        role,
        department: department.trim() || 'General',
        status,
        password: password.trim() || editingUser.password,
      });
    } else {
      onAddUser({
        name: name.trim(),
        email: email.trim(),
        role,
        department: department.trim() || 'General',
        status,
        password: password.trim() || 'staff123',
      });
    }
    setModalOpen(false);
  };

  const handleToggleStatus = (user: UserAccount) => {
    if (user.id === currentUser.id) return;
    onUpdateUser({
      ...user,
      status: user.status === 'Active' ? 'Suspended' : 'Active',
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold tracking-tight text-[#23281E]">
          User & Admin Accounts
        </h1>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2C3327] px-3.5 sm:px-4 py-2 text-[12.5px] font-medium text-[#FCFBF8] hover:bg-[#3A4333] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Account</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5C9C5] bg-[#FDF7F6] px-3.5 py-2 text-[12.5px] font-medium text-[#9B3B2B] hover:bg-[#F9EAE8] transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* KPI Row (2x2 on mobile, 4-up on desktop) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Total Users
          </div>
          <div className="mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {summary.total}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">registered seats</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Administrators
          </div>
          <div className="mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {summary.admins}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">full access</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Active Accounts
          </div>
          <div className="mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] font-semibold tracking-tight text-[#2E5A36] tabular-nums leading-none">
            {summary.active}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">enabled users</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Signed-In Role
          </div>
          <div className="mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] leading-none">
            {currentUser.role}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075] truncate">{currentUser.department}</div>
        </div>
      </div>

      {/* Active Session Profile Card */}
      <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2C3327] font-serif text-[17px] font-semibold text-[#F5F2EB]">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold text-[#23281E]">
                  {currentUser.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#8C6D43]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{currentUser.role}</span>
                </span>
              </div>
              <div className="mt-0.5 text-[12.5px] text-[#6E7166] truncate">
                {currentUser.email} · {currentUser.department} · Joined {currentUser.createdAt}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenProfile}
              className="rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-3.5 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors whitespace-nowrap"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Team & Admin Accounts Directory */}
      <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8]">
        <div className="flex flex-col gap-3 border-b border-[#EFEAE0] p-3.5 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-[250px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#85877C]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, dept..."
              aria-label="Search user accounts"
              className="w-full rounded-lg border border-[#E3DDD0] bg-white py-2 pl-8 pr-3 text-[12.5px] text-[#23281E] placeholder-[#8E9086] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
            />
          </div>

          <div
            role="group"
            aria-label="Filter by role"
            className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[#EFEAE0] p-1 self-start sm:self-auto"
          >
            {(['All', 'Admin', 'Manager', 'Staff'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  roleFilter === r
                    ? 'bg-[#FCFBF8] text-[#23281E] shadow-xs'
                    : 'text-[#6E7166] hover:text-[#23281E]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Card List (< md) */}
        <div className="divide-y divide-[#EFEAE0] md:hidden">
          {filteredUsers.length === 0 ? (
            <div className="py-10 px-4 text-center text-[13px] text-[#6E7166]">
              No user accounts match your filter.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isCurrent = user.id === currentUser.id;
              const isActive = user.status === 'Active';
              return (
                <div key={user.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-[#23281E] truncate">
                        {user.name} {isCurrent ? '(You)' : ''}
                      </div>
                      <div className="text-[12px] text-[#6E7166] truncate">{user.email}</div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[12px] font-medium shrink-0 ${
                        isActive ? 'text-[#2E5A36]' : 'text-[#B91C1C]'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-[1px] ${
                          isActive ? 'bg-[#2E5A36]' : 'bg-[#DC2626]'
                        }`}
                        aria-hidden="true"
                      />
                      <span>{user.status}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-[#6E7166]">
                    <span>
                      {user.role} · {user.department}
                    </span>
                    <span>{user.lastActive}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F4F0E6]">
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#5C6055] hover:bg-[#EFEAE0]"
                      >
                        {isActive ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#4B4E44] hover:bg-[#EFEAE0]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => onDeleteUser(user.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#B91C1C] hover:bg-[#FEE2E2]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E6E0D3] bg-[#F8F5EE] text-[11.5px] font-semibold text-[#5C6055]">
                <th className="py-3 pl-5 pr-3">User & Email</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Last Active</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEAE0] text-[13px]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-5 text-center text-[#6E7166]">
                    No user accounts match your filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  const isActive = user.status === 'Active';
                  return (
                    <tr key={user.id} className="hover:bg-[#F8F5EE]/70 transition-colors">
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="font-medium text-[#23281E]">
                          {user.name}{' '}
                          {isCurrent && (
                            <span className="text-[11.5px] font-normal text-[#8C6D43]">
                              (Current Session)
                            </span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-[#7D8075]">{user.email}</div>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-[#23281E] whitespace-nowrap">
                        {user.role}
                      </td>
                      <td className="py-3.5 px-3 text-[#4B4E44] whitespace-nowrap">
                        {user.department}
                      </td>
                      <td className="py-3.5 px-3 text-[12.5px] text-[#6E7166] whitespace-nowrap">
                        {user.lastActive}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isCurrent}
                          onClick={() => handleToggleStatus(user)}
                          title={isCurrent ? 'Current session active' : 'Toggle account status'}
                          className={`inline-flex items-center gap-2 text-[12.5px] font-medium ${
                            isActive ? 'text-[#2E5A36]' : 'text-[#B91C1C]'
                          } ${isCurrent ? 'cursor-default' : 'hover:underline underline-offset-4'}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-[1px] ${
                              isActive ? 'bg-[#2E5A36]' : 'bg-[#DC2626]'
                            }`}
                            aria-hidden="true"
                          />
                          <span>{user.status}</span>
                        </button>
                      </td>
                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                        {confirmDeleteId === user.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteUser(user.id);
                                setConfirmDeleteId(null);
                              }}
                              className="rounded px-2 py-1 text-[11.5px] font-medium bg-[#B91C1C] text-white"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded px-2 py-1 text-[11.5px] font-medium text-[#6E7166]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              aria-label={`Edit ${user.name}`}
                              className="rounded-md p-1.5 text-[#6E7166] hover:bg-[#EFEAE0] hover:text-[#23281E]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(user.id)}
                                aria-label={`Remove ${user.name}`}
                                className="rounded-md p-1.5 text-[#6E7166] hover:bg-[#FEE2E2] hover:text-[#B91C1C]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1F17]/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6 shadow-xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEAE0]">
              <h2 className="font-serif text-[20px] font-semibold text-[#23281E]">
                {editingUser ? 'Edit Account' : 'Add User Account'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="rounded-lg p-2 text-[#6E7166] hover:bg-[#EFEAE0]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] focus:border-[#B89260] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex@hearthledger.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] focus:border-[#B89260] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] focus:border-[#B89260] focus:outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    disabled={editingUser?.id === currentUser.id}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] focus:border-[#B89260] focus:outline-none disabled:opacity-60"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] focus:border-[#B89260] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#5C6055] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave blank to keep' : 'Min 6 chars'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] focus:border-[#B89260] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EFEAE0]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-4 py-2 text-[12.5px] font-medium text-[#2C3327]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#2C3327] px-4 py-2 text-[12.5px] font-medium text-[#FCFBF8] hover:bg-[#3A4333]"
                >
                  {editingUser ? 'Save Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
