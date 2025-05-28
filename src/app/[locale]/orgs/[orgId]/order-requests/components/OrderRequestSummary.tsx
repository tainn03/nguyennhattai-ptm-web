const OrderRequestSummary = () => {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-gray-600">Tổng số yêu cầu</p>
        <p className="text-2xl font-bold text-gray-900">1100</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-gray-600">Đang chờ xác nhận</p>
        <p className="text-2xl font-bold text-gray-900">25</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-gray-600">Đã xác nhận</p>
        <p className="text-2xl font-bold text-gray-900">950</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-gray-600">Từ chối</p>
        <p className="text-2xl font-bold text-gray-900">125</p>
      </div>
    </div>
  );
};

export default OrderRequestSummary;
