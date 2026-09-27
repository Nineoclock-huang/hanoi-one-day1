import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import NotebookPanel from './NotebookPanel';
import { addMistake, localCorrection } from './notebook';

afterEach(cleanup);
it('全局错题本可查看两个关卡并按关卡筛选', () => {
  const cafe = localCorrection('ca phe da sua')!;
  const market = localCorrection('bao nhieu gia')!;
  const entries = addMistake(addMistake([], 'cafe', 'ca phe da sua', cafe), 'market', 'bao nhieu gia', market);
  const onClose = vi.fn();
  render(<NotebookPanel entries={entries} onClose={onClose} />);
  expect(screen.getByRole('dialog', { name: '全局错题本' })).toHaveTextContent('ca phe da sua');
  expect(screen.getByRole('dialog', { name: '全局错题本' })).toHaveTextContent('bao nhieu gia');
  fireEvent.click(screen.getByRole('button', { name: '咖啡馆' }));
  expect(screen.getByRole('dialog', { name: '全局错题本' })).not.toHaveTextContent('bao nhieu gia');
  fireEvent.click(screen.getByRole('button', { name: '关闭错题本' }));
  expect(onClose).toHaveBeenCalledOnce();
});
