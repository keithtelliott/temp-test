import type { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/app/store';

export function Providers({ children }: PropsWithChildren) {
  return <Provider store={store}>{children}</Provider>;
}
