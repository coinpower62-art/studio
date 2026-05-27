import { redirect } from 'next/navigation';

/**
 * @deprecated This file had a typo in the name. Use src/app/admin/page.tsx instead.
 */
export default function TypoRedirect() {
  redirect('/admin');
}
