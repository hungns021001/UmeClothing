import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorText } from '../../api/client';
import { productVariantsApi } from '../../api/productVariants';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import type { ProductStatus, ProductVariant } from '../../types';
import { PRODUCT_STATUS_LABEL, PRODUCT_STATUS_STYLE, SIZE_OPTIONS } from '../../utils/labels';
import ConfirmModal from '../ConfirmModal';

/** Quản lý các size (variant) của một sản phẩm — mỗi size là một món đồ vật lý riêng, có lịch thuê riêng. */
export default function ProductVariantsManager({ productId, variants }: { productId: number; variants: ProductVariant[] }) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newSize, setNewSize] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductVariant | null>(null);

  const sorted = [...variants].sort((a, b) => a.size.localeCompare(b.size, 'vi'));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: ['product'] });
  };

  const onError = (err: unknown) => {
    toast('error', errorText(err));
    setFormError(errorText(err));
  };

  const createMutation = useMutation({
    mutationFn: (size: string) => productVariantsApi.create(productId, { size, status: 'Available' }),
    onSuccess: () => {
      setNewSize('');
      setFormError(null);
      toast('success', 'Đã thêm size.');
      refresh();
    },
    onError,
  });

  const statusMutation = useMutation({
    mutationFn: (v: { variantId: number; status: ProductStatus }) =>
      productVariantsApi.update(productId, v.variantId, { size: variants.find((x) => x.id === v.variantId)!.size, status: v.status }),
    onSuccess: refresh,
    onError: (err) => toast('error', errorText(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: number) => productVariantsApi.remove(productId, variantId),
    onSuccess: () => {
      setDeleteTarget(null);
      toast('success', 'Đã xóa size.');
      refresh();
    },
    onError: (err) => {
      setDeleteTarget(null);
      toast('error', errorText(err));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const size = newSize.trim();
    if (!size) {
      setFormError('Vui lòng nhập size.');
      return;
    }
    if (variants.some((v) => v.size.toLowerCase() === size.toLowerCase())) {
      setFormError(`Sản phẩm đã có size "${size}" rồi.`);
      return;
    }
    setFormError(null);
    createMutation.mutate(size);
  };

  return (
    <section className="card p-5">
      <h2 className="mb-1 text-base font-semibold text-slate-900">Size ({variants.length})</h2>
      <p className="mb-4 text-xs text-slate-500">
        Mỗi size là một món đồ vật lý riêng, có lịch thuê riêng — size này đang cho thuê không ảnh hưởng size khác.
      </p>

      {sorted.length === 0 ? (
        <p className="mb-4 rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400">Chưa có size nào.</p>
      ) : (
        <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {sorted.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <span className="font-medium text-slate-900">{v.size}</span>
              <div className="flex items-center gap-2">
                <select
                  className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ${PRODUCT_STATUS_STYLE[v.status]}`}
                  value={v.status}
                  disabled={statusMutation.isPending}
                  onChange={(e) => statusMutation.mutate({ variantId: v.id, status: e.target.value as ProductStatus })}
                >
                  {(Object.keys(PRODUCT_STATUS_LABEL) as ProductStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {PRODUCT_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                {isAdmin && (
                  <button type="button" className="btn-secondary px-2.5 py-1 text-xs text-red-600" onClick={() => setDeleteTarget(v)}>
                    Xóa
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex flex-wrap items-start gap-2">
        <div>
          <input
            className="input"
            list="new-size-options"
            placeholder="Nhập size, ví dụ M"
            maxLength={30}
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            aria-label="Size mới"
          />
          <datalist id="new-size-options">
            {SIZE_OPTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Đang thêm...' : '+ Thêm size'}
        </button>
      </form>
      {formError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {formError}
        </p>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Xóa size?"
        confirmLabel="Xóa"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      >
        Xóa size <strong>{deleteTarget?.size}</strong>? Size đã có lịch sử thuê sẽ không xóa được — hãy chuyển sang "Đang ẩn" thay vì xóa.
      </ConfirmModal>
    </section>
  );
}
