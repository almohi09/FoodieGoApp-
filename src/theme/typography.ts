import { Colors } from './colors';

export const Typography = {
  h1: { fontSize: 24, lineHeight: 31, fontWeight: '700', color: Colors.TEXT_PRIMARY },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '600', color: Colors.TEXT_PRIMARY },
  h3: { fontSize: 18, lineHeight: 23, fontWeight: '600', color: Colors.TEXT_PRIMARY },
  h4: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: Colors.TEXT_PRIMARY },
  body1: { fontSize: 15, lineHeight: 23, fontWeight: '400', color: Colors.TEXT_PRIMARY },
  body2: { fontSize: 14, lineHeight: 21, fontWeight: '400', color: Colors.TEXT_SECONDARY },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '400', color: Colors.TEXT_TERTIARY },
  label: { fontSize: 13, lineHeight: 20, fontWeight: '500', color: Colors.TEXT_PRIMARY },
  price: { fontSize: 15, lineHeight: 23, fontWeight: '700', color: Colors.TEXT_PRIMARY },
} as const;

export default Typography;
