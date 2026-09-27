import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../../api/categories';
import { errorText } from '../../api/client';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import type { Category } from '../../types';

interface FormState {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
}

const EMPTY: FormState = { name: '', slug: '', description: '', isActive: true };

export default function AdminCategoriesPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const listQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['categories'] });
    void queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: { id: number | null; data: FormState }) => {
      const body = {
        name: payload.data.name.trim(),
        slug: payload.data.slug.trim() || undefined,
        description: payload.data.description.trim() || undefined,
        isActive: payload.data.isActive,
      };
      return payload.id === null ? categoriesApi.create(body) : categoriesApi.update(payload.id, body);
    },
    onSuccess: (_c, vars) => {
      toast('success', vars.id === null ? 'Đã tạo danh mục.' : 'Đã cập nhật danh mục.');
      setEditing(null);
      refresh();
    },
    onError: (err) => setFormError(errorText(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: () => {
      toast('success', 'Đã xóa danh mục.');
      setDeleteTarget(null);
      refresh();
    },
    onError: (err) => {
      toast('error', errorText(err));
      setDeleteTarget(null);
    },
  });

  const openNew = () => {
    setForm(EMPTY);
    setFormError(null);
    setEditing('new');
  };

  const openEdit = (c: Category) => {
    setForm({ name: c.name, slug: c.slug, description: c.description ?? '', isActive: c.isActive });
    setFormError(null);
    setEditing(c);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setFormError('Tên danh mục phải có ít nhất 2 ký tự.');
      return;
    }
    setFormError(null);
    saveMutation.mutate({ id: editing === 'new' || editing === null ? null : editing.id, data: form });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Danh mục</h1>
        <button type="button" className="btn-primary" onClick={openNew}>
          + Thêm danh mục
        </button>
      </div>

      {listQuery.isLoading && <Skeleton className="h-48 w-full" />}
      {listQuery.isError && <ErrorState message={errorText(listQuery.error)} onRetry={() => void listQuery.refetch()} />}
      {listQuery.data && listQuery.data.length === 0 && <EmptyState title="Chưa có danh mục nào" />}

      {listQuery.data && listQuery.data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3 text-right">Sản phẩm</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listQuery.data.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.slug}</td>
                  <td className="px-4 py-3 text-right">{c.productCount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {c.isActive ? 'Đang dùng' : 'Đã tắt'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button type="button" className="btn-secondary mr-2 px-3 py-1" onClick={() => openEdit(c)}>
                      Sửa
                    </button>
                    {isAdmin && (
                      <button type="button" className="btn-secondary px-3 py-1 text-red-600" onClick={() => setDeleteTarget(c)}>
                        Xóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={() => !saveMutation.isPending && setEditing(null)}>
          <form
            onSubmit={submit}
            noValidate
            role="dialog"
            aria-modal="true"
            aria-label={editing === 'new' ? 'Thêm danh mục' : 'Sửa danh mục'}
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">{editing === 'new' ? 'Thêm danh mục' : 'Sửa danh mục'}</h2>
            <div>
              <label htmlFor="c-name" className="label">
                Tên *
              </label>
              <input id="c-name" className="input" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-slug" className="label">
                Slug
              </label>
              <input id="c-slug" className="input" value={form.slug} maxLength={120} placeholder="Để trống để tự tạo từ tên" onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              {editing !== 'new' && <p className="mt-1 text-xs text-slate-400">Đổi slug sẽ làm đổi URL của trang danh mục.</p>}
            </div>
            <div>
              <label htmlFor="c-desc" className="label">
                Mô tả
              </label>
              <textarea id="c-desc" className="input min-h-[72px]" maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Đang dùng (khách nhìn thấy)
            </label>
            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" disabled={saveMutation.isPending} onClick={() => setEditing(null)}>
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Xóa danh mục?"
        confirmLabel="Xóa"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      >
        Xóa danh mục <strong>{deleteTarget?.name}</strong>? Danh mục đang có sản phẩm sẽ không xóa được.
      </ConfirmModal>
    </div>
  );
}
