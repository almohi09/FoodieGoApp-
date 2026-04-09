import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useAppSelector, useAppDispatch } from '../../../hooks/useRedux';
import { logout } from '../../../store/slices/userSlice';
import appEnv from '../../../config/env';
import { Colors } from '@/theme/colors';

type ProfileNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  showBadge?: boolean;
  colors: any;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  showBadge,
  colors,
}) => (
  <TouchableOpacity activeOpacity={0.7}
    style={[styles.menuItem, { borderBottomColor: colors.border }]}
    onPress={onPress}
  >
    <View
      style={[styles.menuIcon, { backgroundColor: colors.surfaceSecondary }]}
    >
      <Text style={styles.menuIconText}>{icon}</Text>
    </View>
    <View style={styles.menuContent}>
      <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
    {rightElement || <Icon name="chevron-forward" size={18} color={colors.textTertiary} />}
    {showBadge && (
      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
        <Text style={styles.badgeText}>New</Text>
      </View>
    )}
  </TouchableOpacity>
);

export const ProfileScreen: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { colors, isDark } = theme;
  const navigation = useNavigation<ProfileNavigationProp>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.user.user);
  const [darkModeOption, setDarkModeOption] = useState<'off' | 'on' | 'system'>(
    isDark ? 'on' : 'off',
  );

  const handleDarkModeToggle = (value: boolean) => {
    const newMode = value ? 'on' : 'off';
    setDarkModeOption(newMode);
    setTheme(value);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          dispatch(logout());
          navigation.navigate('PhoneEntry');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Profile
        </Text>
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { borderColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'G'}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}
            style={[
              styles.avatarEditButton,
              { backgroundColor: colors.primary, borderColor: colors.surface },
            ]}
          >
            <Icon name="pencil" size={12} color={Colors.TEXT_INVERSE} />
          </TouchableOpacity>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {user?.name || 'Guest User'}
          </Text>
          <Text style={[styles.userPhone, { color: colors.textSecondary }]}>
            {user?.phone || 'Not verified'}
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
        <TouchableOpacity activeOpacity={0.7} style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {(user?.foodieCoins || 0).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Coins
          </Text>
        </TouchableOpacity>
        <View
          style={[styles.statDivider, { backgroundColor: colors.border }]}
        />
        <TouchableOpacity activeOpacity={0.7} style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {user?.streak || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Streak
          </Text>
        </TouchableOpacity>
        <View
          style={[styles.statDivider, { backgroundColor: colors.border }]}
        />
        <TouchableOpacity activeOpacity={0.7} style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {user?.isFoodiePass ? 'ON' : 'OFF'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            FoodiePass
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          My Account
        </Text>
        <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
          <MenuItem
            icon="📍"
            title="Manage Addresses"
            subtitle="Home, Work, Other"
            onPress={() => {}}
            colors={colors}
          />
          <MenuItem
            icon="💳"
            title="Payment Methods"
            subtitle="UPI, Cards, Wallets"
            onPress={() => {}}
            colors={colors}
          />
          <MenuItem
            icon="📊"
            title="Spend Dashboard"
            subtitle="View your monthly stats"
            onPress={() => {}}
            colors={colors}
          />
          <MenuItem
            icon="🎁"
            title="FoodiePass"
            subtitle={user?.isFoodiePass ? 'Active' : '₹99/month'}
            onPress={() => {}}
            colors={colors}
          />
        </View>
      </View>

      {appEnv.enableInternalRolePortals && <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Partner Hub
        </Text>
        <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
          <MenuItem
            icon="🏪"
            title="Seller Dashboard"
            subtitle="Manage your restaurant"
            onPress={() => navigation.navigate('SellerDashboard')}
            colors={colors}
          />
          <MenuItem
            icon="🚴"
            title="Rider Dashboard"
            subtitle="Deliveries and earnings"
            onPress={() => navigation.navigate('RiderDashboard')}
            colors={colors}
          />
          <MenuItem
            icon="👨‍💼"
            title="Admin Dashboard"
            subtitle="Platform management"
            onPress={() => navigation.navigate('AdminDashboard')}
            colors={colors}
          />
        </View>
      </View>}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Preferences
        </Text>
        <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Text style={styles.menuIconText}>{isDark ? '🌙' : '☀️'}</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                Dark Mode
              </Text>
              <Text
                style={[styles.menuSubtitle, { color: colors.textSecondary }]}
              >
                {darkModeOption === 'on'
                  ? 'Always on'
                  : darkModeOption === 'system'
                    ? 'System default'
                    : 'Always off'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={isDark ? colors.primary : colors.surface}
            />
          </View>
          <MenuItem
            icon="🔔"
            title="Notifications"
            onPress={() => {}}
            colors={colors}
          />
          <MenuItem
            icon="🌿"
            title="Green Delivery"
            subtitle="Eco-friendly options"
            onPress={() => {}}
            colors={colors}
          />
          <MenuItem
            icon="🌐"
            title="Language"
            subtitle="English"
            onPress={() => {}}
            colors={colors}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Support
        </Text>
        <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
          <MenuItem
            icon="❓"
            title="Help & FAQ"
            onPress={() => {}}
            colors={colors}
          />
          <MenuItem
            icon="💬"
            title="Chat with Us"
            onPress={() => {}}
            colors={colors}
          />
          <MenuItem
            icon="📜"
            title="Terms & Conditions"
            onPress={() => {}}
            colors={colors}
          />
          <MenuItem
            icon="🔒"
            title="Privacy Policy"
            onPress={() => {}}
            colors={colors}
          />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity activeOpacity={0.7}
          style={[styles.logoutButton, { backgroundColor: colors.surface }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={[styles.logoutText, { color: colors.error }]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.appInfo}>
        <Text style={[styles.appVersion, { color: colors.textTertiary }]}>
          FoodieGo v1.0.0
        </Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    backgroundColor: Colors.BG_PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
  },
  avatarEditButton: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    paddingTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  menuCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconText: {
    fontSize: 18,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
  },
  menuSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.TEXT_INVERSE,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  appVersion: {
    fontSize: 12,
  },
  bottomSpacer: {
    height: 40,
  },
});







