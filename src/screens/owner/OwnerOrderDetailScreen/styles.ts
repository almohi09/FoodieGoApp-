import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  text: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
    marginBottom: spacing.sm,
  },
  tableHeadText: {
    ...typography.captionSemibold,
    color: colors.textPrimary,
  },
  itemCol: {
    flex: 1,
  },
  qtyCol: {
    width: 40,
    textAlign: 'center',
  },
  priceCol: {
    width: 96,
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  map: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  preparingButton: {
    backgroundColor: colors.warning,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  assignRiderButton: {
    flex: 1,
    backgroundColor: colors.info,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  readyPickupButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  actionButtonText: {
    ...typography.captionSemibold,
    color: colors.textInverse,
  },
  mapAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  mapAddressText: {
    flex: 1,
    marginLeft: spacing.xs,
    color: colors.info,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  totalValue: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  errorCard: {
    backgroundColor: colors.errorLight,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
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
});

export default styles;
