import { StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  back: {
    ...Typography.body2,
    color: Colors.PRIMARY,
  },
  title: {
    ...Typography.h4,
    color: Colors.TEXT_PRIMARY,
  },
  spacer: {
    width: 36,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 10,
    padding: Spacing.md,
    backgroundColor: Colors.BG_PRIMARY,
  },
  label: {
    ...Typography.label,
    color: Colors.TEXT_PRIMARY,
  },
  line: {
    ...Typography.body2,
    color: Colors.TEXT_SECONDARY,
    marginTop: Spacing.xs,
  },
  defaultBtn: {
    ...Typography.body2,
    color: Colors.PRIMARY,
    marginTop: Spacing.sm,
  },
  empty: {
    ...Typography.body2,
    color: Colors.TEXT_TERTIARY,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
  addBtn: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    ...Typography.label,
    color: Colors.TEXT_INVERSE,
    fontWeight: '600',
  },
});

export default styles;

