import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items: cart } = useCart();

  const startDate = localStorage.getItem("rentalStartDate") || "";
  const endDate = localStorage.getItem("rentalEndDate") || "";

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-blue-600">
          Xác nhận đơn hàng
        </h1>

        <p>Ngày bắt đầu: {startDate}</p>
        <p>Ngày kết thúc: {endDate}</p>

        <div className="mt-6 space-y-3">
          {cart.map((item: any) => (
            <div
              key={item.productId}
              className="flex justify-between border-b py-3"
            >
              <span>{item.name}</span>
              <span>
                {item.price ? item.price.toLocaleString("vi-VN") : 0}đ
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/cart")}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-white"
        >
          Quay lại giỏ hàng
        </button>
      </div>
    </div>
  );
}