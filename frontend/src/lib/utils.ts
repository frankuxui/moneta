import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
// Teach the merger the type scale from @theme so sizes aren't mistaken for colors,
// and custom weights aren't mistaken for font families.
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'overline',
        'micro',
        '2xs',
        'caption',
        'body',
        'title-small',
        'metric',
        'title',
        'page-tablet',
        'page',
        'brand',
        'amount-mobile',
        'amount',
      ],
      'font-weight': ['book', 'demi'],
    },
  },
});
export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}
