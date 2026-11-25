import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { UserAccount, UserRole } from '../types';

interface ProfilePageProps {
  currentUser: UserAccount;
  users: UserAccount[];
  onUpdateUser: (user: UserAccount) => void;
  onBackToAccounts: () => void;
  onLogout: () => void;
}

const ROLE_CAPABILITIES: Record<UserRole, string[]> = {
  Admin: [
    'Full access to Financial Dashboard, Inventory, Reports & Settings',
    'Create, edit, suspend, or remove team & administrator accounts',
    'Export or restore workspace JSON backups and reset ledger state',
  ],
  Manager: [
    'Manage Inventory items, reorder points, and stock adjustments',
    'View Financial Dashboard, Cash Flow, and downloadable CSV Reports',
    'Update personal profile details and account security credentials',
  ],
  Staff: [
    'View Financial Dashboard summaries and update inventory quantities',
    'Inspect Reports and operational statements',
    'Manage personal profile information and login password',
  ],
};

export const ProfilePage: React.FC<ProfilePageProps> = ({
  currentUser,
  users,
  onUpdateUser,
  onBackToAccounts,
  onLogout,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [department, setDepartment] = useState(currentUser.department);
  const [jobTitle, setJobTitle] = useState(currentUser.jobTitle ?? '');
  const [phone, setPhone] = useState(currentUser.phone ?? '');
  const [role, setRole] = useState<UserRole>(currentUser.role);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // Security / Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    setName(currentUser.name);
    setEmail(currentUser.email);
    setDepartment(currentUser.department);
    setJobTitle(currentUser.jobTitle ?? '');
    setPhone(currentUser.phone ?? '');
    setRole(currentUser.role);
  }, [currentUser]);

  const initials = currentUser.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isProfileDirty =
    name !== currentUser.name ||
    email !== currentUser.email ||
    department !== currentUser.department ||
    jobTitle !== (currentUser.jobTitle ?? '') ||
    phone !== (currentUser.phone ?? '') ||
    role !== currentUser.role;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setProfileError('Name and email address are required.');
      return;
    }

    const emailTaken = users.some(
      (u) => u.id !== currentUser.id && u.email.toLowerCase() === trimmedEmail.toLowerCase()
    );
    if (emailTaken) {
      setProfileError('Another user account is already registered with this email.');
      return;
    }

    onUpdateUser({
      ...currentUser,
      name: trimmedName,
      email: trimmedEmail,
      department: department.trim() || 'Operations',
      jobTitle: jobTitle.trim() || undefined,
      phone: phone.trim() || undefined,
      role: currentUser.role === 'Admin' ? role : currentUser.role,
    });

    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleDiscardProfile = () => {
    setName(currentUser.name);
    setEmail(currentUser.email);
    setDepartment(currentUser.department);
    setJobTitle(currentUser.jobTitle ?? '');
    setPhone(currentUser.phone ?? '');
    setRole(currentUser.role);
    setProfileError(null);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (currentPassword !== currentUser.password) {
      setPasswordError('Current password does not match your account password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    onUpdateUser({
      ...currentUser,
      password: newPassword,
    });

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSaved(true);
    window.setTimeout(() => setPasswordSaved(false), 2500);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      {/* Top Navigation & Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToAccounts}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDD6C7] bg-[#FCFBF8] px-3 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Accounts</span>
          </button>

          <div>
            <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold tracking-tight text-[#23281E]">
              Profile
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-[#E5C9C5] bg-[#FDF7F6] px-3.5 py-2 text-[12.5px] font-medium text-[#9B3B2B] hover:bg-[#F9EAE8] transition-colors self-start sm:self-auto"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Identity Overview Card */}
      <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#2C3327] font-serif text-[21px] font-semibold text-[#F5F2EB]">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[17px] font-semibold text-[#23281E] truncate">
                  {currentUser.name}
                </h2>
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#8C6D43]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{currentUser.role}</span>
                </span>
              </div>
              <p className="mt-0.5 text-[13px] text-[#6E7166] truncate">
                {currentUser.email}
                {currentUser.jobTitle ? ` · ${currentUser.jobTitle}` : ''}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#7D8075]">
                <span className="inline-flex items-center gap-1.5 text-[#2E5A36] font-medium">
                  <span className="h-1.5 w-1.5 rounded-[1px] bg-[#2E5A36]" aria-hidden="true" />
                  <span>{currentUser.status}</span>
                </span>
                <span>Department: {currentUser.department}</span>
                <span>Joined {currentUser.createdAt}</span>
                <span>{currentUser.lastActive}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Personal & Role Details Form */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFEAE0] pb-3.5">
          <div>
            <h2 className="text-[14px] font-semibold text-[#23281E]">Personal & Role Information</h2>
            <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
              Changes sync immediately to your active session and user directory record.
            </p>
          </div>
          {profileSaved && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#C6DEC8] bg-[#EEF6EF] px-3 py-1 text-[12px] font-medium text-[#2E5A36]">
              <Check className="h-3.5 w-3.5" />
              <span>Profile updated</span>
            </div>
          )}
        </div>

        {profileError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-[#E5C9C5] bg-[#FDF7F6] px-3.5 py-2.5 text-[12.5px] font-medium text-[#9B3B2B]"
          >
            {profileError}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="profile-name"
              className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
            >
              Full Name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
            />
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
            >
              Email Address
            </label>
            <input
              id="profile-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
            />
          </div>

          <div>
            <label
              htmlFor="profile-department"
              className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
            >
              Department
            </label>
            <input
              id="profile-department"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Operations"
              className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
            />
          </div>

          <div>
            <label
              htmlFor="profile-job-title"
              className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
            >
              Job Title
            </label>
            <input
              id="profile-job-title"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Operations Controller"
              className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
            />
          </div>

          <div>
            <label
              htmlFor="profile-phone"
              className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
            >
              Contact Phone
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 014-2810"
              className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] tabular-nums focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
            />
          </div>

          <div>
            <label
              htmlFor="profile-role"
              className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
            >
              Workspace Role
            </label>
            <select
              id="profile-role"
              value={role}
              disabled={currentUser.role !== 'Admin'}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none disabled:bg-[#F5F1E8] disabled:text-[#6E7166]"
            >
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Staff">Staff</option>
            </select>
            {currentUser.role !== 'Admin' && (
              <p className="mt-1 text-[11px] text-[#7D8075]">
                Only administrators can change role permissions.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-[#EFEAE0] pt-4">
          {isProfileDirty && (
            <button
              type="button"
              onClick={handleDiscardProfile}
              className="rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-4 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors"
            >
              Discard
            </button>
          )}
          <button
            type="submit"
            className="rounded-lg bg-[#2C3327] px-4 py-2 text-[12.5px] font-medium text-[#FCFBF8] hover:bg-[#3A4333] transition-colors"
          >
            Save Profile
          </button>
        </div>
      </form>

      {/* Password & Security Card */}
      <form
        onSubmit={handleUpdatePassword}
        className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFEAE0] pb-3.5">
          <div>
            <h2 className="text-[14px] font-semibold text-[#23281E]">Password & Security</h2>
            <p className="mt-0.5 text-[12.5px] text-[#6E7166]">
              Update the sign-in password associated with {currentUser.email}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {passwordSaved && (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#C6DEC8] bg-[#EEF6EF] px-3 py-1 text-[12px] font-medium text-[#2E5A36]">
                <Check className="h-3.5 w-3.5" />
                <span>Password updated</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowPasswords((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-3 py-1.5 text-[12px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors"
            >
              {showPasswords ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Hide</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>Show</span>
                </>
              )}
            </button>
          </div>
        </div>

        {passwordError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-[#E5C9C5] bg-[#FDF7F6] px-3.5 py-2.5 text-[12.5px] font-medium text-[#9B3B2B]"
          >
            {passwordError}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="profile-current-password"
              className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
            >
              Current Password
            </label>
            <input
              id="profile-current-password"
              type={showPasswords ? 'text' : 'password'}
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
            />
          </div>

          <div>
            <label
              htmlFor="profile-new-password"
              className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
            >
              New Password
            </label>
            <input
              id="profile-new-password"
              type={showPasswords ? 'text' : 'password'}
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
            />
          </div>

          <div>
            <label
              htmlFor="profile-confirm-password"
              className="mb-1.5 block text-[12px] font-medium text-[#5C6055]"
            >
              Confirm New Password
            </label>
            <input
              id="profile-confirm-password"
              type={showPasswords ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] text-[#23281E] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end border-t border-[#EFEAE0] pt-4">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-4 py-2 text-[12.5px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Update Password</span>
          </button>
        </div>
      </form>

      {/* Role Access Summary */}
      <section className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6">
        <div className="border-b border-[#EFEAE0] pb-3">
          <h2 className="text-[14px] font-semibold text-[#23281E]">
            {currentUser.role} Permissions Summary
          </h2>
        </div>
        <ul className="mt-3.5 space-y-2 text-[13px] text-[#4B4E44]">
          {ROLE_CAPABILITIES[currentUser.role].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-[1px] bg-[#B89260]"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
