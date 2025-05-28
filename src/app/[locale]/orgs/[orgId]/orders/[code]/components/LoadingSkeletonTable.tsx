"use client";

const LoadingSkeletonTable = () => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-fixed border-collapse">
        <thead className="bg-blue-50">
          <tr>
            {[...Array(5)].map((_, idx) => (
              <th key={idx} className="px-4 py-3 text-center">
                <div className="mx-auto h-5 w-24 animate-pulse rounded bg-gray-300" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(5)].map((_, rowIdx) => (
            <tr key={rowIdx} className="border-t">
              {[...Array(5)].map((_, colIdx) => (
                <td key={colIdx} className="p-4">
                  <div className="h-5 w-full animate-pulse rounded bg-gray-200" />
                </td>
              ))}
            </tr>
          ))}

          <tr className="border-t bg-blue-50">
            {[...Array(5)].map((_, idx) => (
              <td key={idx} className="px-4 py-3">
                <div className="h-5 w-full rounded bg-blue-100" />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default LoadingSkeletonTable;
