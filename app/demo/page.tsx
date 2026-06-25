import { redirect } from 'next/navigation';

export default function DemoIndexPage(): never {
  redirect('/demo/dashboard');
}
