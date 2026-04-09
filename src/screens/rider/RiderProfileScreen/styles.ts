import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  statusBanner: {
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  verifiedBanner: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
  },
  pendingBanner: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  statusBannerText: {
    ...typography.captionSemibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  name: { ...typography.h4, color: colors.textPrimary },
  text: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: { ...typography.bodySemibold, color: colors.textPrimary, marginBottom: spacing.sm },
  vehicleCard: {
    backgroundColor: colors.infoLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.infoLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  vehicleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  vehicleHeadText: {
    ...typography.captionSemibold,
    color: colors.info,
    marginLeft: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  badge: {
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: colors.successLight,
  },
  badgeText: { ...typography.smallMedium, color: colors.success },
  plateCard: {
    borderWidth: 1,
    borderColor: colors.info,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  plateText: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  actionText: { ...typography.captionSemibold, color: colors.textInverse },
});

export default styles;



