import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  tabChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  tabChipText: {
    ...typography.smallMedium,
    color: colors.textSecondary,
  },
  tabChipTextActive: {
    color: colors.primary,
  },
  content: {
    padding: spacing.md,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  newOrderCard: {
    borderTopWidth: 3,
    borderTopColor: colors.primary,
  },
  activeOrderCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  completedOrderCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    opacity: 0.7,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    ...typography.captionSemibold,
    color: colors.textPrimary,
  },
  mutedText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  warnText: {
    ...typography.small,
    color: colors.error,
    marginTop: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  readyButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  assignButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  buttonText: {
    ...typography.captionSemibold,
    color: colors.textInverse,
  },
  assignButtonText: {
    ...typography.captionSemibold,
    color: colors.primary,
  },
  rejectText: {
    ...typography.captionSemibold,
    color: colors.error,
  },
  newBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    marginLeft: spacing.xs,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBadgeText: {
    ...typography.smallMedium,
    color: colors.textInverse,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: colors.errorLight,
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
  retryText: {
    ...typography.captionSemibold,
    color: colors.error,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  reasonChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  reasonChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  reasonChipText: {
    ...typography.caption,
    color: colors.textPrimary,
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
  riderCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  modalAction: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  modalActionText: {
    ...typography.captionSemibold,
    color: colors.textInverse,
  },
});

export default styles;
