import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Heart, 
  Clock, 
  HelpCircle, 
  Settings, 
  ChevronRight,
  LogOut,
  Crown,
  Coins
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/helpers';

// Menu items
const menuItems = [
  { icon: MapPin, label: 'ที่อยู่จัดส่ง', href: '/addresses' },
  { icon: Heart, label: 'รายการโปรด', href: '/wishlist' },
  { icon: Clock, label: 'ประวัติการเข้าชม', href: '/history' },
  { icon: HelpCircle, label: 'ช่วยเหลือ', href: '/help' },
  { icon: Settings, label: 'ตั้งค่า', href: '/settings' },
];

export const ProfilePage = () => {
  const { logout, user } = useAuthStore();
  const { addToast } = useUIStore();

  const handleLogout = async () => {
    try {
      await logout();
      addToast('ออกจากระบบสำเร็จ', 'success');
    } catch {
      addToast('ไม่สามารถออกจากระบบได้', 'error');
    }
  };

  const memberLevelColors = {
    standard: 'bg-brand-500 text-white',
    bronze: 'bg-amber-700 text-white',
    silver: 'bg-gray-400 text-white',
    gold: 'bg-yellow-500 text-white',
    platinum: 'bg-purple-500 text-white',
  };

  const memberLevelLabels = {
    standard: 'Standard',
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
  };

  const memberLevel = (user?.memberLevel || user?.memberTier || 'standard') as keyof typeof memberLevelLabels;
  const profile = {
    displayName: user?.displayName || 'สมาชิก RE-YA Retail',
    pictureUrl: user?.pictureUrl || '',
    memberLevel,
    points: user?.points || user?.memberPoints || 0,
    ordersCount: user?.orderCount || 0,
    totalSpent: user?.totalSpent || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="โปรไฟล์" showSearch={false} showCart={false} />

      <main className="p-4 space-y-4">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl">
              {profile.pictureUrl ? (
                <img
                  src={profile.pictureUrl}
                  alt={profile.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                profile.displayName[0]
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{profile.displayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn('text-xs', memberLevelColors[profile.memberLevel])}>
                  <Crown className="w-3 h-3 mr-1" />
                  {memberLevelLabels[profile.memberLevel]} Member
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Coins className="w-4 h-4" />
                <span className="text-xl font-bold">{profile.points}</span>
              </div>
              <span className="text-xs opacity-80">แต้มสะสม</span>
            </div>
            <div className="text-center border-x border-white/20">
              <span className="text-xl font-bold">{profile.ordersCount}</span>
              <p className="text-xs opacity-80">ออเดอร์</p>
            </div>
            <div className="text-center">
              <span className="text-xl font-bold">
                ฿{profile.totalSpent.toLocaleString()}
              </span>
              <p className="text-xs opacity-80">ยอดซื้อ</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: '💳', label: 'ที่อยู่', href: '/addresses' },
            { icon: '❤️', label: 'โปรด', href: '/wishlist' },
            { icon: '🎫', label: 'คูปอง', href: '/coupons' },
            { icon: '🎁', label: 'แลกแต้ม', href: '/redeem' },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs text-gray-600">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Menu */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors',
                  index !== menuItems.length - 1 && 'border-b'
                )}
              >
                <Icon className="w-5 h-5 text-gray-400" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          fullWidth
          className="text-red-500 border-red-200 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          ออกจากระบบ
        </Button>

        {/* App Info */}
        <div className="text-center text-xs text-gray-400 pt-4">
          <p>Re-ya Retail v1.0.0</p>
          <p>© 2024 Re-ya Pharmacy. All rights reserved.</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};