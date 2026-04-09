import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapSection: { width: '100%' },
  map50: { height: '50%' },
  map60: { height: '60%' },
  map: { ...StyleSheet.absoluteFillObject },
  riderMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.textInverse,
  },
  offlineMapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  idlePanel: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  toggleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  onlinePulseRing: {
    position: 'absolute',
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: colors.primaryLight,
  },
  bigToggle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigToggleOffline: {
    backgroundColor: colors.textPrimary,
  },
  bigToggleOnline: {
    backgroundColor: colors.primary,
  },
  statusLine: {
    ...typography.bodySemibold,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statCard: {
    width: '31.8%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
  },
  statLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  waitingCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 24,
    backgroundColor: colors.surfaceSecondary,
  },
  waitingTitle: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  waitingSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  activePanel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -16,
    padding: spacing.lg,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stepHeaderText: {
    ...typography.captionSemibold,
    color: colors.textPrimary,
  },
  stepDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  stepDotDone: {
    backgroundColor: colors.primary,
  },
  stepDotPending: {
    backgroundColor: colors.border,
  },
  stepBlock: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  stepBlockHeadRed: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stepBlockHeadGreen: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stepBlockHeadText: {
    ...typography.smallMedium,
    color: colors.textInverse,
  },
  stepBlockTitle: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  stepBlockSub: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  distanceText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  primaryAction: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  primaryActionText: {
    ...typography.captionSemibold,
    color: colors.textInverse,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  requestSheet: {
    height: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  requestTop: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  requestEarnAmount: {
    ...typography.h1,
    color: colors.textInverse,
  },
  requestEarnLabel: {
    ...typography.caption,
    color: colors.textInverse,
    marginTop: 2,
  },
  requestMiddle: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  routeDistance: {
    ...typography.captionSemibold,
    color: colors.textPrimary,
    marginHorizontal: spacing.md,
  },
  requestLine: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  requestSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  requestEta: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  requestBottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  timerTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.errorLight,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  timerText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  acceptFull: {
    marginTop: spacing.md,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  acceptFullText: {
    ...typography.captionSemibold,
    color: colors.textInverse,
  },
  declineTextButton: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  declineText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});

export default styles;



