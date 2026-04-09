import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    backgroundColor: colors.surface,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  timelineContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  timelineTitle: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  timelineLeft: {
    width: 28,
    alignItems: 'center',
  },
  circleBase: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  circlePending: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  circleCompleted: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  circleCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  currentPulseRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.statusBg.cancelled,
  },
  lineBase: {
    width: 2,
    flex: 1,
    marginTop: spacing.xs,
    backgroundColor: colors.border,
  },
  lineCompleted: {
    backgroundColor: colors.primary,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
  },
  timelineLabel: {
    ...typography.captionSemibold,
    color: colors.textPrimary,
  },
  timelineTime: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoTitle: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  paymentBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  paymentBadgeText: {
    ...typography.smallMedium,
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  riderCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderInitials: {
    ...typography.captionSemibold,
    color: colors.primary,
  },
  riderContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  riderName: {
    ...typography.captionSemibold,
    color: colors.textPrimary,
  },
  riderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  riderRating: {
    ...typography.smallMedium,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  callIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.errorLight,
  },
  cancelButtonText: {
    ...typography.captionSemibold,
    color: colors.error,
  },
  simulateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryGhost,
  },
  simulateButtonText: {
    ...typography.captionSemibold,
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    ...typography.captionSemibold,
    color: colors.textInverse,
  },
});

export default styles;

