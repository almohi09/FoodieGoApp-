import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tabChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tabChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  tabChipText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  tabChipTextActive: {
    color: colors.primary,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantName: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.md,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusPlaced: {
    backgroundColor: colors.statusBg.placed,
  },
  statusConfirmed: {
    backgroundColor: colors.statusBg.confirmed,
  },
  statusPreparing: {
    backgroundColor: colors.statusBg.preparing,
  },
  statusPickedUp: {
    backgroundColor: colors.statusBg.pickedUp,
  },
  statusDelivered: {
    backgroundColor: colors.statusBg.delivered,
  },
  statusCancelled: {
    backgroundColor: colors.statusBg.cancelled,
  },
  statusText: {
    ...typography.smallMedium,
    textTransform: 'capitalize',
  },
  statusTextPlaced: {
    color: colors.status.placed,
  },
  statusTextConfirmed: {
    color: colors.status.pending,
  },
  statusTextPreparing: {
    color: colors.status.preparing,
  },
  statusTextPickedUp: {
    color: colors.status.pickedUp,
  },
  statusTextDelivered: {
    color: colors.status.delivered,
  },
  statusTextCancelled: {
    color: colors.status.cancelled,
  },
  orderMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  orderBottomRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalText: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  reorderButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    backgroundColor: colors.primaryGhost,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  reorderText: {
    ...typography.captionSemibold,
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default styles;

