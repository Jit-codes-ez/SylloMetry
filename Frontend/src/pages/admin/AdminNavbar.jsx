import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, LogOut, ArrowUpRight, ArrowLeft, User, LayoutDashboard, ChevronDown, UserPlus, KeyRound } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Button2 } from '@/components/Button2';
import { cn } from '@/lib/utils';
import AddAdminModal from './AddAdminModal';
import ChangePasswordModal from './ChangePasswordModal';

export default function AdminNavbar() {
  const { admin, logoutAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logoutAdmin();
    navigate('/admin/login');
  };

  const adminDisplayName = admin?.full_name || admin?.email?.split('@')[0].toUpperCase() || 'Admin';
  const adminEmail = admin?.email || 'admin@syllometry.com';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#18030C]/95 backdrop-blur-md border-b border-[#850E35]/40 shadow-xl shadow-black/40 transition-all duration-300">
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left: SylloMetry Logo + Dedicated Admin Badge */}
        <div className="flex items-center gap-3 select-none">
          <Link to="/admin/dashboard" className="flex items-center gap-2 group">
            <img
              src="/banner.png"
              alt="SylloMetry Logo"
              className="h-8 sm:h-9 w-auto object-contain brightness-110 drop-shadow-[0_2px_10px_rgba(133,14,53,0.4)] group-hover:scale-105 transition-transform duration-200"
            />
          </Link>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#36081B] border border-[#850E35]/60 text-[#FFA8B8] text-[10px] font-extrabold tracking-wider uppercase shadow-xs">
            Admin Console
          </span>
        </div>

        {/* Right Section: Actions & Admin Profile */}
        <div className="flex items-center gap-3">
          {/* Admin Avatar Pill Button */}
          <div className="relative" ref={dropdownRef}>
            <Button2
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              className="inline-flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#240614] hover:bg-[#32081C] border border-[#850E35]/50 hover:border-[#C73659]/60 shadow-sm transition-all active:scale-95 cursor-pointer select-none"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#850E35] to-[#B8194E] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-white/20">
                {adminDisplayName.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                  {adminDisplayName}
                </p>
                <p className="text-[10px] text-[#FFA8B8] font-medium leading-none">
                  Admin
                </p>
              </div>
              <ChevronDown
                size={14}
                className={cn('text-[#FFBAC7]/70 transition-transform duration-200', dropdownOpen && 'rotate-180')}
              />
            </Button2>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                style={{ backgroundColor: '#1C040E' }}
                className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#850E35]/60 bg-[#1C040E] p-2 text-white shadow-[0_25px_60px_rgba(0,0,0,0.95)] ring-1 ring-[#850E35]/40 animate-in fade-in zoom-in-95 duration-150 z-50 overflow-hidden"
              >
                <div
                  style={{ backgroundColor: '#240614' }}
                  className="px-3.5 py-3 border-b border-[#850E35]/40 mb-1.5 bg-[#240614] rounded-xl"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                      Authorized Admin
                    </span>
                  </div>
                  <p className="text-xs font-extrabold text-white truncate">{adminDisplayName}</p>
                  <p className="text-[11px] text-[#FFBAC7] truncate font-mono mt-0.5">{adminEmail}</p>
                </div>

                <div className="space-y-1">
                  <Button2
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setIsAddAdminModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:text-white hover:bg-[#340718] transition-colors text-left cursor-pointer"
                  >
                    <UserPlus size={15} className="text-[#E36A6A]" />
                    <span>Add Admin</span>
                  </Button2>

                  <Button2
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setIsChangePasswordModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:text-white hover:bg-[#340718] transition-colors text-left cursor-pointer"
                  >
                    <KeyRound size={15} className="text-[#E36A6A]" />
                    <span>Change Password</span>
                  </Button2>

                  <Button2
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:text-white hover:bg-rose-950 transition-colors text-left cursor-pointer"
                  >
                    <LogOut size={15} className="text-rose-400" />
                    <span>Sign Out</span>
                  </Button2>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Administrator Modal */}
      <AddAdminModal
        isOpen={isAddAdminModalOpen}
        onClose={() => setIsAddAdminModalOpen(false)}
      />

      {/* Change Administrator Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </header>
  );
}
