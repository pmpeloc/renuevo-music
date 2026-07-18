'use client';

import { useEffect } from 'react';

type ConfirmDialogProps = {
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  pendingLabel: string;
  error?: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  title,
  description,
  cancelLabel,
  confirmLabel,
  pendingLabel,
  error,
  pending,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onCancel();
    }

    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onCancel, pending]);

  return (
    <div
      className='fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center'
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}>
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='confirm-dialog-title'
        aria-describedby='confirm-dialog-description'
        className='w-full rounded-t-3xl bg-white p-5 lg:max-w-sm lg:rounded-3xl'>
        <h3 id='confirm-dialog-title' className='font-semibold text-gray-900'>
          {title}
        </h3>
        <p
          id='confirm-dialog-description'
          className='mt-2 text-sm text-gray-600'>
          {description}
        </p>
        {error && (
          <p role='alert' className='mt-3 text-sm text-red-600'>
            {error}
          </p>
        )}
        <div className='mt-5 flex gap-3'>
          <button
            type='button'
            autoFocus
            disabled={pending}
            onClick={onCancel}
            className='flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 disabled:opacity-50'>
            {cancelLabel}
          </button>
          <button
            type='button'
            disabled={pending}
            onClick={onConfirm}
            className='flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50'>
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
