import Svg, { Path } from 'react-native-svg';

/**
 * Official Google "G" logo rendered as SVG paths with correct brand colors.
 */
export function GoogleLogo({ size = 20 }: { size?: number }) {
  // The Google G is drawn on a 48x48 viewBox
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* Blue arc — top and left */}
      <Path
        fill="#4285F4"
        d="M44.5 20H24v8.5h11.8C34.3 33.3 29.6 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l6.3-6.3C34.5 6.5 29.5 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c11 0 20-8 20-20.5 0-1.4-.1-2.7-.3-4z"
      />
      {/* Red arc — top-right */}
      <Path
        fill="#EA4335"
        d="M6.3 15.8l7 5.1C15 17 19.2 14 24 14c3 0 5.7 1.1 7.8 2.9l6.3-6.3C34.5 6.5 29.5 4.5 24 4.5c-7.8 0-14.5 4.6-17.7 11.3z"
      />
      {/* Yellow arc — bottom-left */}
      <Path
        fill="#FBBC05"
        d="M24 45.5c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.6 36.8 27 37.5 24 37.5c-5.6 0-10.3-3.7-11.9-8.7l-7 5.4C8.3 41.3 15.5 45.5 24 45.5z"
      />
      {/* Green arc — bottom-right */}
      <Path
        fill="#34A853"
        d="M44.5 20H24v8.5h11.8c-.8 2.4-2.3 4.4-4.3 5.8l6.5 5.5c3.8-3.5 6-8.7 6-14.8 0-1.4-.1-2.7-.3-4z"
      />
    </Svg>
  );
}
