import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorText } from '../../api/client';
import { productImagesApi } from '../../api/productImages';
import { useToast } from '../../contexts/ToastContext';
import type { Product, ProductImage } from '../../types';
import { resolveImageUrl } from '../../utils/image';
import ConfirmModal from '../ConfirmModal';

// Khớp giới hạn backend (ImageStorage:MaxFileSizeBytes / MaxImagesPerProduct); backend vẫn kiểm tra lại.
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 10;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProductImagesManager({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ProductImage | null>(null);

  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);

  const applyResult = (result: ProductImage[]) => {
    queryClient.setQueryData<Product>(['admin', 'product', product.id], (old) => (old ? { ...old, images: result } : old));
    // Trang khách đang cache ảnh cũ.
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: ['product'] });
  };

  const onError = (err: unknown) => toast('error', errorText(err));

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => productImagesApi.upload(product.id, files),
    onSuccess: (r) => {
      applyResult(r);
      toast('success', 'Đã tải ảnh lên.');
    },
    onError,
  });
  const primaryMutation = useMutation({
    mutationFn: (imageId: number) => productImagesApi.setPrimary(product.id, imageId),
    onSuccess: (r) => {
      applyResult(r);
      toast('success', 'Đã đổi ảnh chính.');
    },
    onError,
  });
  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => productImagesApi.reorder(product.id, ids),
    onSuccess: applyResult,
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: (imageId: number) => productImagesApi.remove(product.id, imageId),
    onSuccess: (r) => {
      applyResult(r);
      setDeleteTarget(null);
      toast('success', 'Đã xóa ảnh.');
    },
    onError: (err) => {
      setDeleteTarget(null);
      onError(err);
    },
  });

  const busy = uploadMutation.isPending || primaryMutation.isPending || reorderMutation.isPending || deleteMutation.isPending;

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // cho phép chọn lại cùng file
    if (files.length === 0) return;

    const errs: string[] = [];
    if (images.length + files.length > MAX_IMAGES) errs.push(`Mỗi sản phẩm tối đa ${MAX_IMAGES} ảnh (hiện có ${images.length}).`);
    for (const f of files) {
      if (!ALLOWED.includes(f.type)) errs.push(`"${f.name}": chỉ nhận JPEG, PNG, WEBP.`);
      else if (f.size > MAX_BYTES) errs.push(`"${f.name}": vượt quá ${MAX_BYTES / (1024 * 1024)}MB.`);
    }
    setProblems(errs);
    if (errs.length > 0) return;

    uploadMutation.mutate(files);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const ids = images.map((i) => i.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderMutation.mutate(ids);
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Hình ảnh ({images.length}/{MAX_IMAGES})</h2>
          <p className="text-xs text-slate-500">JPEG/PNG/WEBP, tối đa 5MB mỗi ảnh. Ảnh đầu tiên tải lên sẽ là ảnh chính.</p>
        </div>
        <div>
          <input ref={inputRef} type="file" accept={ALLOWED.join(',')} multiple className="hidden" onChange={onPick} aria-label="Chọn ảnh" />
          <button type="button" className="btn-primary" disabled={busy || images.length >= MAX_IMAGES} onClick={() => inputRef.current?.click()}>
            {uploadMutation.isPending ? 'Đang tải lên...' : '+ Tải ảnh lên'}
          </button>
        </div>
      </div>

      {problems.length > 0 && (
        <ul className="mb-4 list-disc rounded-lg bg-red-50 py-2 pl-8 pr-3 text-sm text-red-700" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">Chưa có ảnh nào.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => {
            const url = resolveImageUrl(img.url);
            return (
              <li key={img.id} className="overflow-hidden rounded-lg border border-slate-200">
                <div className="relative aspect-[3/4] bg-slate-100">
                  {url && <img src={url} alt={`Ảnh ${i + 1} của ${product.name}`} className="h-full w-full object-cover" />}
                  {img.isPrimary && <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">Ảnh chính</span>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1 p-2">
                  <div className="flex gap-1">
                    <button type="button" className="btn-secondary px-2 py-1" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Chuyển lên trước">
                      ←
                    </button>
                    <button type="button" className="btn-secondary px-2 py-1" disabled={busy || i === images.length - 1} onClick={() => move(i, 1)} aria-label="Chuyển ra sau">
                      →
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {!img.isPrimary && (
                      <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={busy} onClick={() => primaryMutation.mutate(img.id)}>
                        Đặt chính
                      </button>
                    )}
                    <button type="button" className="btn-secondary px-2 py-1 text-xs text-red-600" disabled={busy} onClick={() => setDeleteTarget(img)}>
                      Xóa
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Xóa ảnh?"
        confirmLabel="Xóa"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      >
        Ảnh sẽ bị xóa vĩnh viễn khỏi kho lưu trữ.
      </ConfirmModal>
    </section>
  );
}
